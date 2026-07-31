-- Substitui todos os responsáveis de um lead de forma atômica.
-- Também mantém leads_crm.responsavel sincronizada para os fluxos legados.
CREATE OR REPLACE FUNCTION public.replace_lead_responsaveis(
  p_lead_id uuid,
  p_responsavel_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[] := COALESCE(p_responsavel_ids, ARRAY[]::uuid[]);
  v_legacy_value text;
BEGIN
  -- Garante que o lead existe; evita tratar um ID inválido como sucesso.
  PERFORM 1 FROM public.leads_crm WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead % não encontrado', p_lead_id USING ERRCODE = 'P0002';
  END IF;

  -- Não aceita IDs inexistentes silenciosamente.
  IF (SELECT count(*) FROM public.responsaveis WHERE id = ANY(v_ids))
     <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'Um ou mais responsáveis não existem' USING ERRCODE = '23503';
  END IF;

  DELETE FROM public.lead_responsaveis WHERE lead_id = p_lead_id;

  INSERT INTO public.lead_responsaveis (lead_id, responsavel_id)
  SELECT p_lead_id, id FROM unnest(v_ids) AS id;

  SELECT COALESCE(string_agg(nome, ' + ' ORDER BY nome), 'sem_responsavel')
    INTO v_legacy_value
  FROM public.responsaveis
  WHERE id = ANY(v_ids);

  UPDATE public.leads_crm
  SET responsavel = v_legacy_value,
      updated_at = now()
  WHERE id = p_lead_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_lead_responsaveis(uuid, uuid[]) TO anon, authenticated, service_role;
