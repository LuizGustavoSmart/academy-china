
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads_crm(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  autor TEXT,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lead_activities_lead_id_idx ON public.lead_activities(lead_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO anon, authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can manage lead_activities" ON public.lead_activities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage lead_activities" ON public.lead_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.participant_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  autor TEXT,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX participant_activities_participant_id_idx ON public.participant_activities(participant_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_activities TO anon, authenticated;
GRANT ALL ON public.participant_activities TO service_role;
ALTER TABLE public.participant_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can manage participant_activities" ON public.participant_activities FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can manage participant_activities" ON public.participant_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
