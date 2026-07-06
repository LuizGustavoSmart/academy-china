CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome TEXT,
  email TEXT,
  telefone TEXT,
  empresa TEXT,
  mensagem TEXT,
  origem TEXT,
  user_agent TEXT,
  ip TEXT
);
GRANT INSERT ON public.leads TO anon;
GRANT INSERT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
