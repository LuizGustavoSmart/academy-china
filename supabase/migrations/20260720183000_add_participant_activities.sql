-- Histórico de observações da Pré-viagem. É separado do Comercial para que
-- cada área mantenha seu próprio fluxo, mas recebe uma cópia do histórico ao
-- promover um lead. Nenhum campo existente de participants é alterado.
CREATE TABLE IF NOT EXISTS public.participant_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  autor text,
  tipo text NOT NULL DEFAULT 'observacao',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participant_activities_participant_created
  ON public.participant_activities(participant_id, created_at DESC);

ALTER TABLE public.participant_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can manage participant activities"
  ON public.participant_activities FOR ALL TO anon USING (true) WITH CHECK (true);
