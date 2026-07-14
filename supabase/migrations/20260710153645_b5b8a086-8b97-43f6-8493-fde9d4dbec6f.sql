
-- Allow anonymous access to CRM tables (protected by password gate on /admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_crm TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.touchpoints TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendencias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_config TO anon;

CREATE POLICY "Anon can manage participants" ON public.participants FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage leads_crm" ON public.leads_crm FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage touchpoints" ON public.touchpoints FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage pendencias" ON public.pendencias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage mensagens" ON public.mensagens FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can manage financeiro_config" ON public.financeiro_config FOR ALL TO anon USING (true) WITH CHECK (true);
