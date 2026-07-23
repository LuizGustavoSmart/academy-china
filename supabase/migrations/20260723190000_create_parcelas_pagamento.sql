-- Parcelas de pagamento por participante. A tabela passa a ser a fonte de
-- verdade dos valores recebidos, enquanto participants.valor_pago continua
-- representando o valor total do contrato.
CREATE TABLE IF NOT EXISTS public.parcelas_pagamento (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  numero integer NOT NULL CHECK (numero > 0),
  data_vencimento date,
  valor numeric(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  paga boolean NOT NULL DEFAULT false,
  data_pagamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento_participant
  ON public.parcelas_pagamento(participant_id, numero);
CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento_paga
  ON public.parcelas_pagamento(paga);

ALTER TABLE public.parcelas_pagamento ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas_pagamento TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas_pagamento TO authenticated;
GRANT ALL ON public.parcelas_pagamento TO service_role;

DROP POLICY IF EXISTS "Anon can manage parcelas_pagamento" ON public.parcelas_pagamento;
CREATE POLICY "Anon can manage parcelas_pagamento"
  ON public.parcelas_pagamento FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage parcelas_pagamento" ON public.parcelas_pagamento;
CREATE POLICY "Authenticated users can manage parcelas_pagamento"
  ON public.parcelas_pagamento FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Distribui o valor do contrato igualmente entre as parcelas. A última absorve
-- os centavos restantes, garantindo que a soma seja exatamente o contrato.
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
    INSERT INTO public.parcelas_pagamento (participant_id, numero, valor)
    VALUES (
      NEW.id,
      i,
      CASE
        WHEN i = qtd THEN (total_centavos - (base_centavos * (qtd - 1))) / 100.0
        ELSE base_centavos / 100.0
      END
    )
    ON CONFLICT (participant_id, numero) DO UPDATE
      SET valor = EXCLUDED.valor,
          updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS sync_participant_parcelas ON public.participants;
CREATE TRIGGER sync_participant_parcelas
  AFTER INSERT OR UPDATE OF valor_pago, parcelas ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.sync_parcelas_participant();

-- Mantém pagamento_status apenas para compatibilidade com telas antigas:
-- "confirmado" significa que todas as parcelas estão pagas.
CREATE OR REPLACE FUNCTION public.sync_participant_pagamento_status()
RETURNS trigger AS $$
DECLARE
  target_id uuid;
  total_count integer;
  paid_count integer;
BEGIN
  target_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.participant_id ELSE NEW.participant_id END;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE paga)
    INTO total_count, paid_count
  FROM public.parcelas_pagamento
  WHERE participant_id = target_id;

  UPDATE public.participants
  SET pagamento_status = CASE
      WHEN total_count > 0 AND paid_count = total_count THEN 'confirmado'
      ELSE 'pendente'
    END,
    updated_at = now()
  WHERE id = target_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS sync_pagamento_status_from_parcelas ON public.parcelas_pagamento;
CREATE TRIGGER sync_pagamento_status_from_parcelas
  AFTER INSERT OR UPDATE OF paga OR DELETE ON public.parcelas_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.sync_participant_pagamento_status();

-- Migra os participantes existentes. Pagamentos antes confirmados continuam
-- integralmente recebidos; os demais começam com parcelas pendentes.
INSERT INTO public.parcelas_pagamento (participant_id, numero, valor, paga, data_pagamento)
SELECT
  p.id,
  series.numero,
  CASE
    WHEN series.numero = GREATEST(COALESCE(p.parcelas, 1), 1)
      THEN (
        ROUND(COALESCE(p.valor_pago, 0) * 100)
        - (
          FLOOR(ROUND(COALESCE(p.valor_pago, 0) * 100) / GREATEST(COALESCE(p.parcelas, 1), 1))
          * (GREATEST(COALESCE(p.parcelas, 1), 1) - 1)
        )
      ) / 100.0
    ELSE (
      FLOOR(
        ROUND(COALESCE(p.valor_pago, 0) * 100)
        / GREATEST(COALESCE(p.parcelas, 1), 1)
      )
    ) / 100.0
  END,
  p.pagamento_status = 'confirmado',
  CASE WHEN p.pagamento_status = 'confirmado' THEN now() ELSE NULL END
FROM public.participants p
CROSS JOIN LATERAL generate_series(
  1,
  GREATEST(COALESCE(p.parcelas, 1), 1)
) AS series(numero)
ON CONFLICT (participant_id, numero) DO NOTHING;
