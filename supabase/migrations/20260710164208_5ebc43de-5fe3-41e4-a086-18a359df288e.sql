
ALTER TABLE public.leads_crm ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.leads_crm ADD COLUMN IF NOT EXISTS telefone text;

CREATE OR REPLACE FUNCTION public.sync_lead_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.leads_crm WHERE lower(email) = lower(NEW.email)
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.leads_crm (nome, empresa, email, telefone, passo, responsavel, status, ordem)
  VALUES (
    COALESCE(NEW.nome, 'Sem nome'),
    NEW.empresa,
    NEW.email,
    NEW.telefone,
    0,
    'caetano',
    'cadastro',
    0
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_to_crm ON public.leads;
CREATE TRIGGER trg_sync_lead_to_crm
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.sync_lead_to_crm();
