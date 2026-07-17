-- Suporte à sincronização automática do formulário público (china.matteracademy.ai/formulario)
-- com a tabela participants do CRM. Campos que o formulário coleta e o CRM ainda não tinha,
-- mais a coluna de rastreio da ficha de origem para permitir upsert idempotente.

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

-- Chave de deduplicação: um mesmo passaporte não deve virar dois participantes.
-- Parcial (WHERE NOT NULL) porque nem todo participante manual tem passaporte cadastrado ainda.
CREATE UNIQUE INDEX IF NOT EXISTS participants_passaporte_key
  ON public.participants (passaporte)
  WHERE passaporte IS NOT NULL;

-- Rastreia de qual ficha (participant_forms.id, no outro projeto Supabase) este participante veio.
CREATE UNIQUE INDEX IF NOT EXISTS participants_form_id_key
  ON public.participants (form_id)
  WHERE form_id IS NOT NULL;

-- Bucket para as fotos enviadas no formulário (a ficha original guarda a foto em base64;
-- aqui viram um arquivo de verdade, com URL pública estável para o crachá/CRM).
INSERT INTO storage.buckets (id, name, public)
VALUES ('participant-photos', 'participant-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read participant photos" ON storage.objects;
CREATE POLICY "Public read participant photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'participant-photos');

DROP POLICY IF EXISTS "Service role manages participant photos" ON storage.objects;
CREATE POLICY "Service role manages participant photos"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'participant-photos')
  WITH CHECK (bucket_id = 'participant-photos');
