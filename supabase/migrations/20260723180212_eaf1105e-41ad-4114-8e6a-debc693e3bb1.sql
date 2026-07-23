-- Tabela de custos/despesas da imersão, usada na aba Financeiro. Nunca foi criada no
-- banco (o front inseria em public.custos, que não existia — por isso "Novo custo" falhava
-- silenciosamente). Mesmo padrão de RLS/grants das demais tabelas do hub.
CREATE TABLE IF NOT EXISTS public.custos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'fixo',
  valor_fixo numeric NOT NULL DEFAULT 0,
  valor_variavel numeric NOT NULL DEFAULT 0,
  data_vencimento date,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custos_ordem ON public.custos(ordem);

ALTER TABLE public.custos ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custos TO authenticated;
GRANT ALL ON public.custos TO service_role;

DROP POLICY IF EXISTS "Anon can manage custos" ON public.custos;
CREATE POLICY "Anon can manage custos"
  ON public.custos FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage custos" ON public.custos;
CREATE POLICY "Authenticated users can manage custos"
  ON public.custos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);