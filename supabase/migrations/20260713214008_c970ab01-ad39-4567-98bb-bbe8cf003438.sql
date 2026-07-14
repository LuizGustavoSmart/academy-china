ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE public.pendencias ADD COLUMN IF NOT EXISTS data_fim date;