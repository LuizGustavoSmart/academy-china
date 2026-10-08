CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.admin_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  acao text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_access_log TO authenticated;
GRANT ALL ON public.admin_access_log TO service_role;
ALTER TABLE public.admin_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own log" ON public.admin_access_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read log" ON public.admin_access_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$
DECLARE r record; t text;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('custos','email_send_history','email_templates','financeiro_config','lead_activities','lead_responsaveis','leads_crm','mensagens','parcelas_pagamento','participant_activities','participant_responses','participants','pendencias','pipeline_email_automations','responsaveis','touchpoints')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['custos','email_send_history','email_templates','financeiro_config','lead_activities','lead_responsaveis','leads_crm','mensagens','parcelas_pagamento','participant_activities','participant_responses','participants','pendencias','pipeline_email_automations','responsaveis','touchpoints']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t, t);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.replace_lead_responsaveis(uuid, uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_parcela_valor(uuid, numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.replace_lead_responsaveis(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_parcela_valor(uuid, numeric) TO authenticated;

DROP POLICY IF EXISTS "Public read participant photos" ON storage.objects;
CREATE POLICY "Admins read participant photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'participant-photos' AND public.has_role(auth.uid(), 'admin'));