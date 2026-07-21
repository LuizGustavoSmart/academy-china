-- Alinha participant_activities com o padrão de permissões de lead_activities:
-- GRANT explícito + policy para authenticated, além do anon já existente.
-- Necessário para edição/exclusão de notas da timeline funcionarem em todo ambiente.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_activities TO authenticated;
GRANT ALL ON public.participant_activities TO service_role;

DROP POLICY IF EXISTS "Authenticated users can manage participant activities" ON public.participant_activities;
CREATE POLICY "Authenticated users can manage participant activities"
  ON public.participant_activities FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
