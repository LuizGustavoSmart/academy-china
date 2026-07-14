
-- Trigger function for updated_at (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== participants ==========
CREATE TABLE public.participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  nome_completo text,
  cargo text,
  empresa text,
  cidade text,
  email text,
  telefone text,
  passaporte text,
  data_nascimento date,
  contato_emergencia text,
  restricoes_alimentares text,
  alergias text,
  observacoes_medicas text,
  medicamentos text,
  quarto text,
  tier text NOT NULL DEFAULT 'standard',
  valor_pago numeric(12,2) NOT NULL DEFAULT 0,
  pagamento_status text NOT NULL DEFAULT 'pendente',
  contrato_status text NOT NULL DEFAULT 'pendente',
  seguro_status text NOT NULL DEFAULT 'pendente',
  voo_ida_status text NOT NULL DEFAULT 'pendente',
  voo_volta_status text NOT NULL DEFAULT 'pendente',
  uso_imagem_status text NOT NULL DEFAULT 'pendente',
  origem text,
  observacoes text,
  status text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage participants"
  ON public.participants FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON public.participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== leads_crm ==========
CREATE TABLE public.leads_crm (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cargo text,
  empresa text,
  cidade text,
  passo smallint NOT NULL DEFAULT 1,
  responsavel text NOT NULL,
  status text,
  observacoes text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_crm_passo_ordem ON public.leads_crm(passo, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_crm TO authenticated;
GRANT ALL ON public.leads_crm TO service_role;
ALTER TABLE public.leads_crm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage leads_crm"
  ON public.leads_crm FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_leads_crm_updated_at BEFORE UPDATE ON public.leads_crm
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== touchpoints ==========
CREATE TABLE public.touchpoints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  touchpoint_code text NOT NULL,
  status text NOT NULL DEFAULT 'nao_iniciado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, touchpoint_code)
);
CREATE INDEX idx_touchpoints_participant ON public.touchpoints(participant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.touchpoints TO authenticated;
GRANT ALL ON public.touchpoints TO service_role;
ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage touchpoints"
  ON public.touchpoints FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_touchpoints_updated_at BEFORE UPDATE ON public.touchpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== pendencias ==========
CREATE TABLE public.pendencias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  fase text,
  dono text,
  prioridade text,
  impacto text,
  status text NOT NULL DEFAULT 'aberta',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pendencias_fase_ordem ON public.pendencias(fase, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendencias TO authenticated;
GRANT ALL ON public.pendencias TO service_role;
ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pendencias"
  ON public.pendencias FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_pendencias_updated_at BEFORE UPDATE ON public.pendencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== mensagens ==========
CREATE TABLE public.mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa text NOT NULL,
  codigo text NOT NULL,
  titulo text NOT NULL,
  meta text,
  nota text,
  nota_tipo text,
  corpo text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (etapa, codigo)
);
CREATE INDEX idx_mensagens_etapa_ordem ON public.mensagens(etapa, ordem);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO authenticated;
GRANT ALL ON public.mensagens TO service_role;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage mensagens"
  ON public.mensagens FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_mensagens_updated_at BEFORE UPDATE ON public.mensagens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== financeiro_config (singleton) ==========
CREATE TABLE public.financeiro_config (
  id integer PRIMARY KEY CHECK (id = 1),
  cambio numeric(6,2) NOT NULL DEFAULT 5,
  tier_standard integer NOT NULL DEFAULT 0,
  tier_premium integer NOT NULL DEFAULT 0,
  meta_vagas integer NOT NULL DEFAULT 0,
  min_vagas integer NOT NULL DEFAULT 0,
  custo_parceiro_min integer NOT NULL DEFAULT 0,
  custo_parceiro_max integer NOT NULL DEFAULT 0,
  custo_hoteis_min integer NOT NULL DEFAULT 0,
  custo_hoteis_max integer NOT NULL DEFAULT 0,
  custo_transporte_min integer NOT NULL DEFAULT 0,
  custo_transporte_max integer NOT NULL DEFAULT 0,
  custo_jantares_min integer NOT NULL DEFAULT 0,
  custo_jantares_max integer NOT NULL DEFAULT 0,
  custo_videomaker_min integer NOT NULL DEFAULT 0,
  custo_videomaker_max integer NOT NULL DEFAULT 0,
  custo_interpretes_min integer NOT NULL DEFAULT 0,
  custo_interpretes_max integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_config TO authenticated;
GRANT ALL ON public.financeiro_config TO service_role;
ALTER TABLE public.financeiro_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage financeiro_config"
  ON public.financeiro_config FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE TRIGGER update_financeiro_config_updated_at BEFORE UPDATE ON public.financeiro_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
