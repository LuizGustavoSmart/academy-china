
-- Remove sync: landing page will write directly into leads_crm
DROP TRIGGER IF EXISTS trg_sync_lead_to_crm ON public.leads;
DROP FUNCTION IF EXISTS public.sync_lead_to_crm();

-- Add landing-page fields to leads_crm
ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS mensagem text,
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS ip text;

-- Backfill any leads not yet migrated (dedupe by email)
INSERT INTO public.leads_crm (nome, empresa, email, telefone, mensagem, origem, user_agent, ip, passo, responsavel, status, ordem)
SELECT
  COALESCE(l.nome, 'Sem nome'),
  l.empresa,
  l.email,
  l.telefone,
  l.mensagem,
  COALESCE(l.origem, 'site'),
  l.user_agent,
  l.ip,
  0,
  'caetano',
  'cadastro',
  0
FROM public.leads l
WHERE l.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.leads_crm c WHERE lower(c.email) = lower(l.email)
  );
