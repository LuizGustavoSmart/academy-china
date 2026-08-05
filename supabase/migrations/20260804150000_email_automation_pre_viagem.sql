-- Automação de e-mails do pipeline de Pré-Viagem: modelos reutilizáveis,
-- configuração de automação por etapa e histórico de envios.

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  assunto text NOT NULL DEFAULT '',
  conteudo text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_ativo
  ON public.email_templates(ativo);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

DROP POLICY IF EXISTS "Anon can manage email_templates" ON public.email_templates;
CREATE POLICY "Anon can manage email_templates"
  ON public.email_templates FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage email_templates" ON public.email_templates;
CREATE POLICY "Authenticated users can manage email_templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Uma linha por etapa do pipeline de Pré-Viagem (etapa_key = valor de COLS/TPS
-- usado em PreViagemKanban.tsx, ex.: "formulario_enviado", "D-60", "done").
CREATE TABLE IF NOT EXISTS public.pipeline_email_automations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id text NOT NULL DEFAULT 'pre_viagem',
  etapa_key text NOT NULL,
  email_template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  automacao_ativa boolean NOT NULL DEFAULT false,
  confirmacao_obrigatoria boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, etapa_key)
);

ALTER TABLE public.pipeline_email_automations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_email_automations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_email_automations TO authenticated;
GRANT ALL ON public.pipeline_email_automations TO service_role;

DROP POLICY IF EXISTS "Anon can manage pipeline_email_automations" ON public.pipeline_email_automations;
CREATE POLICY "Anon can manage pipeline_email_automations"
  ON public.pipeline_email_automations FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage pipeline_email_automations" ON public.pipeline_email_automations;
CREATE POLICY "Authenticated users can manage pipeline_email_automations"
  ON public.pipeline_email_automations FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.email_send_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  etapa_origem text,
  etapa_destino text NOT NULL,
  email_template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  destinatario text NOT NULL,
  assunto_enviado text NOT NULL,
  conteudo_enviado text NOT NULL,
  status_envio text NOT NULL DEFAULT 'pendente' CHECK (status_envio IN ('pendente', 'enviado', 'erro', 'cancelado')),
  erro_envio text,
  enviado_em timestamptz,
  enviado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_send_history_participant
  ON public.email_send_history(participant_id);
CREATE INDEX IF NOT EXISTS idx_email_send_history_status
  ON public.email_send_history(status_envio);

ALTER TABLE public.email_send_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_send_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_send_history TO authenticated;
GRANT ALL ON public.email_send_history TO service_role;

DROP POLICY IF EXISTS "Anon can manage email_send_history" ON public.email_send_history;
CREATE POLICY "Anon can manage email_send_history"
  ON public.email_send_history FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage email_send_history" ON public.email_send_history;
CREATE POLICY "Authenticated users can manage email_send_history"
  ON public.email_send_history FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_pipeline_email_automations_updated_at ON public.pipeline_email_automations;
CREATE TRIGGER set_pipeline_email_automations_updated_at
  BEFORE UPDATE ON public.pipeline_email_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
