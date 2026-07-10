## Destino da migração

Só existe um Supabase conectado no projeto: **Lovable Cloud (ref `nfiyksiqmjkdnmfhceud`)** — mesmo banco da landing page. Vou usar esse. Hoje ele tem uma única tabela pública: `leads` (formulário da landing: nome, email, telefone, empresa, mensagem, origem, user_agent, ip).

## ⚠️ Conflito de nomes: `leads`

O JSON traz uma coleção `leads` do CRM com esquema totalmente diferente (nome, cargo, empresa, cidade, passo, responsavel, status, observacoes, ordem) — não é compatível com o `leads` da landing.

**Proposta (padrão que vou seguir salvo indicação em contrário):** criar a tabela do CRM como **`leads_crm`** e **não tocar** em `leads`.

Se preferir outro nome (`crm_leads`, `funil_leads`, etc.), me diga; caso contrário sigo com `leads_crm`.

## Tabelas a criar (schema `public`)

Tipos inferidos dos valores reais do JSON. Todas com PK `uuid` (exceto `financeiro_config`, singleton com id `int`), timestamps `timestamptz`, e updated_at com trigger.

- **participants** — dados pessoais + status da viagem. Colunas notáveis: `id uuid PK`, `nome text NOT NULL`, `email text`, `telefone text`, `tier text` (default 'standard'), `valor_pago numeric(12,2)`, seis colunas `*_status text` (default 'pendente'), `status text` (default 'em_andamento'), `data_nascimento date`, resto `text`.
- **leads_crm** — funil comercial. `id uuid PK`, `nome text NOT NULL`, `empresa text`, `cargo text`, `cidade text`, `passo smallint NOT NULL`, `responsavel text NOT NULL`, `status text`, `observacoes text`, `ordem int`.
- **touchpoints** — `id uuid PK`, `participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE`, `touchpoint_code text NOT NULL`, `status text NOT NULL DEFAULT 'nao_iniciado'`, `UNIQUE(participant_id, touchpoint_code)`.
- **pendencias** — `id uuid PK`, `titulo text NOT NULL`, `descricao text`, `fase text`, `dono text`, `prioridade text`, `impacto text`, `status text` (default 'aberta'), `ordem int`.
- **mensagens** — `id uuid PK`, `etapa text NOT NULL`, `codigo text NOT NULL`, `titulo text NOT NULL`, `meta text`, `nota text`, `nota_tipo text`, `corpo text`, `ordem int`, `UNIQUE(etapa, codigo)`.
- **financeiro_config** — `id int PK CHECK (id=1)` (singleton), `cambio numeric(6,2)`, `tier_standard/premium int`, `meta_vagas/min_vagas int`, 8 pares `custo_*_min/max int`.

Todas ganham `created_at timestamptz DEFAULT now()` e `updated_at timestamptz DEFAULT now()` + trigger de update, mais índices em `participant_id`, `passo/ordem`, `etapa/ordem`, `fase/ordem`.

## Segurança / RLS

Dados internos do time — nunca devem ser lidos por `anon`.

- RLS habilitada em todas.
- GRANT apenas para `authenticated` (SELECT/INSERT/UPDATE/DELETE) e `service_role` (ALL). Sem GRANT para `anon`.
- Políticas: `USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)` — qualquer usuário logado do time acessa. (Se quiser um gate por role de admin depois, dá pra evoluir.)
- `leads` da landing continua intocada.

## Inserção dos dados

Depois que a migration for aprovada e executada, insiro os 86 registros via `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` (idempotente) na ordem: `financeiro_config` → `participants` → `leads_crm` → `touchpoints` → `pendencias` → `mensagens`. Ordem respeita a FK `touchpoints.participant_id → participants.id`.

## O que NÃO vou fazer

- Não altero, renomeio ou apago a tabela `leads` (landing) nem qualquer coluna/registro existente.
- Não crio tela nem botão de importação no app.
- Não removo o CRM antigo — só copio os dados.
- Não mexo em `src/lib/hub-api.ts` / `hub-client.ts` nesta etapa; se você quiser que o painel `/admin` passe a ler dessas novas tabelas no mesmo banco, faço num passo seguinte.

## Preciso confirmar antes de executar

1. Uso o nome **`leads_crm`** para a tabela do funil? (senão me passe o nome que prefere)
2. Ok com a política de RLS "qualquer usuário autenticado acessa" para todas as tabelas do CRM? Ou você quer restringir por role de admin já nesta migração?

Assim que confirmar, rodo a migration e, em seguida, o insert dos 86 registros, e te devolvo um resumo (tabelas criadas + linhas inseridas por tabela).
