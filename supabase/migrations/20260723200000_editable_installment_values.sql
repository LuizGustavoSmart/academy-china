-- Permite ajustar parcelas individualmente sem alterar o valor total do contrato.
-- Parcelas marcadas como manuais são preservadas; o saldo é redistribuído entre
-- as demais parcelas automáticas.
ALTER TABLE public.parcelas_pagamento
  ADD COLUMN IF NOT EXISTS valor_manual boolean NOT NULL DEFAULT false;

-- Alterar o valor total ou a quantidade de parcelas cria uma nova distribuição
-- uniforme e limpa os ajustes manuais anteriores.
CREATE OR REPLACE FUNCTION public.sync_parcelas_participant()
RETURNS trigger AS $$
DECLARE
  qtd integer := GREATEST(COALESCE(NEW.parcelas, 1), 1);
  total_centavos bigint := ROUND(COALESCE(NEW.valor_pago, 0) * 100);
  base_centavos bigint;
  i integer;
BEGIN
  base_centavos := total_centavos / qtd;

  IF EXISTS (
    SELECT 1
    FROM public.parcelas_pagamento
    WHERE participant_id = NEW.id AND numero > qtd AND paga
  ) THEN
    RAISE EXCEPTION 'Não é possível remover uma parcela que já foi paga';
  END IF;

  DELETE FROM public.parcelas_pagamento
  WHERE participant_id = NEW.id AND numero > qtd;

  FOR i IN 1..qtd LOOP
    INSERT INTO public.parcelas_pagamento (
      participant_id,
      numero,
      valor,
      valor_manual
    )
    VALUES (
      NEW.id,
      i,
      CASE
        WHEN i = qtd THEN (total_centavos - (base_centavos * (qtd - 1))) / 100.0
        ELSE base_centavos / 100.0
      END,
      false
    )
    ON CONFLICT (participant_id, numero) DO UPDATE
      SET valor = EXCLUDED.valor,
          valor_manual = false,
          updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_parcela_valor(
  p_parcela_id uuid,
  p_valor numeric
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_participant uuid;
  total_centavos bigint;
  manual_centavos bigint;
  restante_centavos bigint;
  automatic_count integer;
  base_centavos bigint;
  remainder_centavos bigint;
BEGIN
  IF p_valor < 0 THEN
    RAISE EXCEPTION 'O valor da parcela não pode ser negativo';
  END IF;

  SELECT pp.participant_id, ROUND(p.valor_pago * 100)
    INTO target_participant, total_centavos
  FROM public.parcelas_pagamento pp
  JOIN public.participants p ON p.id = pp.participant_id
  WHERE pp.id = p_parcela_id
  FOR UPDATE OF pp, p;

  IF target_participant IS NULL THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  UPDATE public.parcelas_pagamento
  SET valor = ROUND(p_valor * 100) / 100.0,
      valor_manual = true,
      updated_at = now()
  WHERE id = p_parcela_id;

  SELECT COUNT(*) INTO automatic_count
  FROM public.parcelas_pagamento
  WHERE participant_id = target_participant AND NOT valor_manual;

  -- Se todas ficaram manuais, escolhe outra parcela como compensação. Isso
  -- mantém qualquer parcela editável sem permitir que a soma fuja do contrato.
  IF automatic_count = 0 THEN
    UPDATE public.parcelas_pagamento
    SET valor_manual = false,
        updated_at = now()
    WHERE id = (
      SELECT id
      FROM public.parcelas_pagamento
      WHERE participant_id = target_participant AND id <> p_parcela_id
      ORDER BY numero DESC
      LIMIT 1
    );
  END IF;

  SELECT
    COALESCE(SUM(ROUND(valor * 100)) FILTER (WHERE valor_manual), 0),
    COUNT(*) FILTER (WHERE NOT valor_manual)
  INTO manual_centavos, automatic_count
  FROM public.parcelas_pagamento
  WHERE participant_id = target_participant;

  restante_centavos := total_centavos - manual_centavos;
  IF restante_centavos < 0 THEN
    RAISE EXCEPTION 'A soma das parcelas manuais ultrapassa o valor do contrato';
  END IF;

  -- Contrato com uma única parcela: ela sempre equivale ao total contratado.
  IF automatic_count = 0 THEN
    IF manual_centavos <> total_centavos THEN
      RAISE EXCEPTION 'A única parcela deve ter o mesmo valor do contrato';
    END IF;
    RETURN;
  END IF;

  base_centavos := restante_centavos / automatic_count;
  remainder_centavos := restante_centavos - (base_centavos * automatic_count);

  WITH automatic_rows AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY numero) AS row_number,
      COUNT(*) OVER () AS row_count
    FROM public.parcelas_pagamento
    WHERE participant_id = target_participant AND NOT valor_manual
  )
  UPDATE public.parcelas_pagamento pp
  SET valor = (
      base_centavos
      + CASE WHEN ar.row_number = ar.row_count THEN remainder_centavos ELSE 0 END
    ) / 100.0,
    updated_at = now()
  FROM automatic_rows ar
  WHERE pp.id = ar.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_parcela_valor(uuid, numeric) TO anon;
GRANT EXECUTE ON FUNCTION public.update_parcela_valor(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_parcela_valor(uuid, numeric) TO service_role;
