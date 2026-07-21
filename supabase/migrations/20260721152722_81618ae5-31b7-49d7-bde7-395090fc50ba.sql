GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participant_activities TO authenticated;
GRANT ALL ON public.participant_activities TO service_role;

DROP POLICY IF EXISTS "Authenticated users can manage participant activities" ON public.participant_activities;
CREATE POLICY "Authenticated users can manage participant activities"
  ON public.participant_activities FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);