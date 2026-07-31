-- ══════════════════════════════════════════════════════════════════════════
-- Aprimoramento do módulo Comercial
--   1. responsaveis            — cadastro dinâmico de responsáveis (sem nomes fixos)
--   2. lead_responsaveis       — vínculo N:N (múltiplos responsáveis por lead)
--   3. lead_activities         — timeline de observações (histórico, autor, data/hora)
--   4. status estruturado      — normaliza os valores livres já existentes
--   5. migração dos dados       — 'caetano'/'roque'/'ambos' → vínculos reais
-- A coluna leads_crm.responsavel (texto) é PRESERVADA para compatibilidade/rollback.
-- ══════════════════════════════════════════════════════════════════════════

-- ────────── 1. responsaveis ──────────
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
DROP POLICY IF EXISTS "Authenticated users can manage responsaveis" ON public.responsaveis;
CREATE POLICY "Authenticated users can manage responsaveis"
  ON public.responsaveis FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anon can manage responsaveis" ON public.responsaveis;
CREATE POLICY "Anon can manage responsaveis"
  ON public.responsaveis FOR ALL TO anon USING (true) WITH CHECK (true);
DROP TRIGGER IF EXISTS update_responsaveis_updated_at ON public.responsaveis;
CREATE TRIGGER update_responsaveis_updated_at BEFORE UPDATE ON public.responsaveis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ────────── 2. lead_responsaveis (N:N) ──────────
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
DROP POLICY IF EXISTS "Authenticated users can manage lead_responsaveis" ON public.lead_responsaveis;
CREATE POLICY "Authenticated users can manage lead_responsaveis"
  ON public.lead_responsaveis FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anon can manage lead_responsaveis" ON public.lead_responsaveis;
CREATE POLICY "Anon can manage lead_responsaveis"
  ON public.lead_responsaveis FOR ALL TO anon USING (true) WITH CHECK (true);

-- ────────── 3. lead_activities (timeline de observações) ──────────
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads_crm(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  autor text,
  tipo text NOT NULL DEFAULT 'observacao',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created ON public.lead_activities(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO anon;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage lead_activities" ON public.lead_activities;
CREATE POLICY "Authenticated users can manage lead_activities"
  ON public.lead_activities FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anon can manage lead_activities" ON public.lead_activities;
CREATE POLICY "Anon can manage lead_activities"
  ON public.lead_activities FOR ALL TO anon USING (true) WITH CHECK (true);

-- ────────── 4. seed dos responsáveis atuais ──────────
INSERT INTO public.responsaveis (nome) VALUES ('Caetano'), ('Roque')
  ON CONFLICT (nome) DO NOTHING;

-- ────────── 5. migração responsavel(texto) → lead_responsaveis ──────────
-- 'caetano' → Caetano · 'roque' → Roque · 'ambos' → os dois
INSERT INTO public.lead_responsaveis (lead_id, responsavel_id)
SELECT l.id, r.id
FROM public.leads_crm l
JOIN public.responsaveis r ON (
     (lower(l.responsavel) = 'caetano' AND r.nome = 'Caetano')
  OR (lower(l.responsavel) = 'roque'   AND r.nome = 'Roque')
  OR (lower(l.responsavel) = 'ambos'   AND r.nome IN ('Caetano', 'Roque'))
)
ON CONFLICT DO NOTHING;

-- ────────── 6. normalização dos status livres → estruturados ──────────
-- Valores estruturados: novo · abordado · em_negociacao · confirmado · declinado
UPDATE public.leads_crm SET status = 'declinado' WHERE passo = 8;
UPDATE public.leads_crm SET status = 'novo'
  WHERE status IS NULL OR lower(btrim(status)) IN ('cadastro', 'cadastrado', 'indefinido', '');
UPDATE public.leads_crm SET status = 'em_negociacao'
  WHERE lower(btrim(status)) IN ('em negociacao', 'em negociação', 'negociacao', 'negociando');

-- ────────── 7. preserva as observações antigas na timeline ──────────
-- O campo texto único `observacoes` deixa de ser editado na UI; seu conteúdo vira
-- a primeira entrada da timeline (sem sobrescrever). A coluna é preservada.
INSERT INTO public.lead_activities (lead_id, conteudo, autor, tipo, created_at)
SELECT l.id, l.observacoes, 'Importado', 'observacao', l.created_at
FROM public.leads_crm l
WHERE l.observacoes IS NOT NULL
  AND btrim(l.observacoes) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.lead_activities a WHERE a.lead_id = l.id);
