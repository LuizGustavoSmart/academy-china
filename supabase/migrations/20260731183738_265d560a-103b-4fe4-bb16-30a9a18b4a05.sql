CREATE TABLE IF NOT EXISTS public.participant_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id uuid NOT NULL UNIQUE REFERENCES public.participants(id) ON DELETE CASCADE,
  identificacao jsonb NOT NULL DEFAULT '{}',
  historia_objetivos jsonb NOT NULL DEFAULT '{}',
  cuidados jsonb NOT NULL DEFAULT '{}',
  preferencias jsonb NOT NULL DEFAULT '{}',
  gastronomia jsonb NOT NULL DEFAULT '{}',
  preparacao_viagem jsonb NOT NULL DEFAULT '{}',
  networking jsonb NOT NULL DEFAULT '{}',
  indicacoes jsonb NOT NULL DEFAULT '[]',
  ultima_pergunta jsonb NOT NULL DEFAULT '{}',
  contato_emergencia jsonb NOT NULL DEFAULT '{}',
  secoes_concluidas jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'nao_iniciado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participant_responses_participant_id ON public.participant_responses(participant_id);

ALTER TABLE public.participant_responses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_responses TO authenticated;
GRANT ALL ON public.participant_responses TO service_role;

DROP POLICY IF EXISTS "Anon can manage participant_responses" ON public.participant_responses;
CREATE POLICY "Anon can manage participant_responses"
  ON public.participant_responses FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage participant_responses" ON public.participant_responses;
CREATE POLICY "Authenticated users can manage participant_responses"
  ON public.participant_responses FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS update_participant_responses_updated_at ON public.participant_responses;
CREATE TRIGGER update_participant_responses_updated_at
  BEFORE UPDATE ON public.participant_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();