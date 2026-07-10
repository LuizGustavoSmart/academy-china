// O CRM /admin usa o mesmo backend da landing page.
// As tabelas do CRM (participants, leads_crm, touchpoints, pendencias,
// mensagens, financeiro_config) vivem no mesmo projeto Supabase.
export { supabase as hubSupabase } from './client';
