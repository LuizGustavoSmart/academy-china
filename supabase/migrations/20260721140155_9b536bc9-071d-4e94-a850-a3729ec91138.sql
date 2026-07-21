
-- Cria tabelas do módulo comercial (responsáveis + vínculo N:N com leads)
-- e migra os valores textuais existentes em leads_crm.responsavel.

CREATE TABLE IF NOT EXISTS public.responsaveis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  cor text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsaveis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responsaveis TO anon;
GRANT ALL ON public.responsaveis TO service_role;
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can manage responsaveis" ON public.responsaveis;
CREATE POLICY "Anon can manage responsaveis" ON public.responsaveis
  FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can manage responsaveis" ON public.responsaveis;
CREATE POLICY "Authenticated can manage responsaveis" ON public.responsaveis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_responsaveis_updated_at ON public.responsaveis;
CREATE TRIGGER update_responsaveis_updated_at BEFORE UPDATE ON public.responsaveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.lead_responsaveis (
  lead_id uuid NOT NULL REFERENCES public.leads_crm(id) ON DELETE CASCADE,
  responsavel_id uuid NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, responsavel_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_responsaveis_lead ON public.lead_responsaveis(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_responsaveis_resp ON public.lead_responsaveis(responsavel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_responsaveis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_responsaveis TO anon;
GRANT ALL ON public.lead_responsaveis TO service_role;
ALTER TABLE public.lead_responsaveis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon can manage lead_responsaveis" ON public.lead_responsaveis;
CREATE POLICY "Anon can manage lead_responsaveis" ON public.lead_responsaveis
  FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated can manage lead_responsaveis" ON public.lead_responsaveis;
CREATE POLICY "Authenticated can manage lead_responsaveis" ON public.lead_responsaveis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Semeia com todos os nomes já existentes em leads_crm.responsavel
INSERT INTO public.responsaveis (nome)
SELECT DISTINCT initcap(btrim(responsavel))
FROM public.leads_crm
WHERE responsavel IS NOT NULL
  AND btrim(responsavel) <> ''
  AND lower(btrim(responsavel)) NOT IN ('ambos', 'sem_responsavel')
ON CONFLICT (nome) DO NOTHING;

-- Cria vínculos N:N a partir da coluna texto legada
INSERT INTO public.lead_responsaveis (lead_id, responsavel_id)
SELECT l.id, r.id
FROM public.leads_crm l
JOIN public.responsaveis r
  ON lower(r.nome) = lower(btrim(l.responsavel))
WHERE l.responsavel IS NOT NULL
  AND btrim(l.responsavel) <> ''
ON CONFLICT DO NOTHING;

-- RPC atômica usada pelo frontend para trocar os vínculos de um lead
CREATE OR REPLACE FUNCTION public.replace_lead_responsaveis(
  p_lead_id uuid,
  p_responsavel_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.lead_responsaveis WHERE lead_id = p_lead_id;
  IF p_responsavel_ids IS NOT NULL AND array_length(p_responsavel_ids, 1) > 0 THEN
    INSERT INTO public.lead_responsaveis (lead_id, responsavel_id)
    SELECT p_lead_id, unnest(p_responsavel_ids)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.replace_lead_responsaveis(uuid, uuid[]) TO anon, authenticated, service_role;
