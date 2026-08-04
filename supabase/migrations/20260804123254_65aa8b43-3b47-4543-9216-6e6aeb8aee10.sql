ALTER TABLE public.parcelas_pagamento
  ADD COLUMN IF NOT EXISTS valor_manual boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_parcelas_participant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  qtd integer := GREATEST(COALESCE(NEW.parcelas, 1), 1);
  total_centavos bigint := ROUND(COALESCE(NEW.valor_pago, 0) * 100);
  manual_centavos bigint;
  auto_count integer;
  restante bigint;
  base_centavos bigint;
  sobra bigint;
  i integer;
  last_auto integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.parcelas_pagamento
    WHERE participant_id = NEW.id AND numero > qtd AND paga
  ) THEN
    RAISE EXCEPTION 'Não é possível remover uma parcela que já foi paga';
  END IF;

  DELETE FROM public.parcelas_pagamento
  WHERE participant_id = NEW.id AND numero > qtd;

  -- garante que todas as parcelas existam (novas entram como automáticas)
  FOR i IN 1..qtd LOOP
    INSERT INTO public.parcelas_pagamento (participant_id, numero, valor)
    VALUES (NEW.id, i, 0)
    ON CONFLICT (participant_id, numero) DO NOTHING;
  END LOOP;

  SELECT COALESCE(SUM(ROUND(valor * 100)), 0)
    INTO manual_centavos
    FROM public.parcelas_pagamento
   WHERE participant_id = NEW.id AND valor_manual;

  SELECT COUNT(*) INTO auto_count
    FROM public.parcelas_pagamento
   WHERE participant_id = NEW.id AND NOT valor_manual;

  -- ajustes manuais inconsistentes com o novo total: volta tudo para automático
  IF manual_centavos > total_centavos OR (auto_count = 0 AND manual_centavos <> total_centavos) THEN
    UPDATE public.parcelas_pagamento
       SET valor_manual = false, updated_at = now()
     WHERE participant_id = NEW.id AND valor_manual;
    manual_centavos := 0;
    auto_count := qtd;
  END IF;

  IF auto_count = 0 THEN
    RETURN NEW;
  END IF;

  restante := total_centavos - manual_centavos;
  base_centavos := restante / auto_count;
  sobra := restante - base_centavos * auto_count;

  SELECT MAX(numero) INTO last_auto
    FROM public.parcelas_pagamento
   WHERE participant_id = NEW.id AND NOT valor_manual;

  UPDATE public.parcelas_pagamento p
     SET valor = (base_centavos + CASE WHEN p.numero = last_auto THEN sobra ELSE 0 END) / 100.0,
         updated_at = now()
   WHERE p.participant_id = NEW.id AND NOT p.valor_manual;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_parcela_valor(p_parcela_id uuid, p_valor numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant uuid;
  total_centavos bigint;
  manual_centavos bigint;
  auto_count integer;
  restante bigint;
  base_centavos bigint;
  sobra bigint;
  last_auto integer;
  qtd integer;
BEGIN
  SELECT participant_id INTO v_participant
    FROM public.parcelas_pagamento WHERE id = p_parcela_id;
  IF v_participant IS NULL THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  SELECT ROUND(COALESCE(valor_pago, 0) * 100) INTO total_centavos
    FROM public.participants WHERE id = v_participant;

  SELECT COUNT(*) INTO qtd
    FROM public.parcelas_pagamento WHERE participant_id = v_participant;

  UPDATE public.parcelas_pagamento
     SET valor = p_valor, valor_manual = true, updated_at = now()
   WHERE id = p_parcela_id;

  IF qtd = 1 THEN
    RETURN;
  END IF;

  -- se todas ficaram manuais, libera a última (exceto a editada) para absorver o saldo
  IF NOT EXISTS (
    SELECT 1 FROM public.parcelas_pagamento
    WHERE participant_id = v_participant AND NOT valor_manual
  ) THEN
    UPDATE public.parcelas_pagamento
       SET valor_manual = false, updated_at = now()
     WHERE id = (
       SELECT id FROM public.parcelas_pagamento
        WHERE participant_id = v_participant AND id <> p_parcela_id
        ORDER BY numero DESC LIMIT 1
     );
  END IF;

  SELECT COALESCE(SUM(ROUND(valor * 100)), 0) INTO manual_centavos
    FROM public.parcelas_pagamento
   WHERE participant_id = v_participant AND valor_manual;

  IF manual_centavos > total_centavos THEN
    RAISE EXCEPTION 'A soma das parcelas ajustadas ultrapassa o valor do contrato.';
  END IF;

  SELECT COUNT(*) INTO auto_count
    FROM public.parcelas_pagamento
   WHERE participant_id = v_participant AND NOT valor_manual;

  IF auto_count = 0 THEN
    RETURN;
  END IF;

  restante := total_centavos - manual_centavos;
  base_centavos := restante / auto_count;
  sobra := restante - base_centavos * auto_count;

  SELECT MAX(numero) INTO last_auto
    FROM public.parcelas_pagamento
   WHERE participant_id = v_participant AND NOT valor_manual;

  UPDATE public.parcelas_pagamento p
     SET valor = (base_centavos + CASE WHEN p.numero = last_auto THEN sobra ELSE 0 END) / 100.0,
         updated_at = now()
   WHERE p.participant_id = v_participant AND NOT p.valor_manual;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_parcela_valor(uuid, numeric) TO anon, authenticated, service_role;