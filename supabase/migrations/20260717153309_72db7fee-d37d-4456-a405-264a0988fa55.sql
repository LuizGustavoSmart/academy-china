ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS nacionalidade text,
  ADD COLUMN IF NOT EXISTS tipo_sanguineo text,
  ADD COLUMN IF NOT EXISTS tamanho_camisa text,
  ADD COLUMN IF NOT EXISTS tamanho_blazer text,
  ADD COLUMN IF NOT EXISTS passaporte_emissao date,
  ADD COLUMN IF NOT EXISTS passaporte_validade date,
  ADD COLUMN IF NOT EXISTS voo_detalhes jsonb,
  ADD COLUMN IF NOT EXISTS empresa_perfil text,
  ADD COLUMN IF NOT EXISTS areas_interesse text,
  ADD COLUMN IF NOT EXISTS empresa_site text,
  ADD COLUMN IF NOT EXISTS form_id uuid,
  ADD COLUMN IF NOT EXISTS form_synced_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS participants_passaporte_key
  ON public.participants (passaporte)
  WHERE passaporte IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS participants_form_id_key
  ON public.participants (form_id)
  WHERE form_id IS NOT NULL;

DROP POLICY IF EXISTS "Public read participant photos" ON storage.objects;
CREATE POLICY "Public read participant photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'participant-photos');

DROP POLICY IF EXISTS "Service role manages participant photos" ON storage.objects;
CREATE POLICY "Service role manages participant photos"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'participant-photos')
  WITH CHECK (bucket_id = 'participant-photos');