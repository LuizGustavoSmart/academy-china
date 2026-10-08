# Proteger o /admin com login e papéis

## Diagnóstico (o que existe hoje)
- **Tela /admin**: tem só uma senha fixa no código ("Matter@2026"), e ela está **desligada** — qualquer pessoa entra.
- **Dados**: o painel lê e grava direto no banco com a chave pública. Todas as 17 tabelas do CRM (participantes, passaportes, dados médicos, financeiro, leads, e-mails) têm regra **"anon pode tudo"**. Ou seja: mesmo bloqueando a tela, qualquer um com a chave pública (que fica no site) pode ler/apagar tudo. É o ponto mais grave.
- **Funções do servidor sem verificação**: sincronização com Google Sheets (`syncCrmToSheet`), envio de e-mail de etapa (`send-stage-email`) e `sync-participant-form` aceitam chamadas sem login.
- **Rotas públicas legítimas**: `/` (landing), `/api/public/leads` (formulário da landing) e o webhook do Sheets — continuam públicas, mas o formulário passa a gravar com permissão de servidor, não pela regra "anon".
- **Fotos** (bucket `participant-photos`): privado, mas as regras precisam exigir admin.

## O que será feito
1. **Login por e-mail e senha** (sistema de contas do Lovable Cloud). Nova página `/login`; cadastro público **desligado** — só admins criam contas.
2. **Papéis** em tabela separada: `admin` e `usuario`. Função `has_role` no banco.
3. **Área /admin passa a exigir login**; sem login → `/login`; logado sem papel admin → tela "403 · sem permissão".
4. **Banco "nega por padrão"**: remover as regras "anon pode tudo" e trocar por "somente admin" em todas as tabelas do CRM e no bucket de fotos. Isso é o bloqueio real, no servidor.
5. **Funções do servidor**: Sheets e e-mail passam a exigir token de admin (401 sem login, 403 sem papel). Webhook do Sheets e formulário da landing continuam funcionando.
6. **Gestão de contas** em Configurações → nova aba "Usuários": listar, criar (e-mail, nome, senha inicial), alterar papel, desativar/excluir. Só admin vê e usa; operações feitas no servidor com verificação de admin.
7. **Criar as 2 contas admin**: joyce@matterco.com.br e thalyta@smartie.com.br, com a senha informada, e pedir troca no primeiro acesso.
8. **Boas práticas**: senhas com hash (feito pelo sistema de contas), sessão com expiração, proteção contra senhas vazadas, limite de tentativas do provedor, botão "Sair", log de acesso ao admin (tabela `admin_access_log`). Remover a senha fixa do código.

## Verificação
- Testes automáticos: sem login → 401/redirect; usuário comum → 403; admin → 200, para a tela e para cada função.
- Comandos `curl` para reproduzir (ex.: ler `participants` com chave pública deve retornar vazio/negado).
- Checar variações de URL (`/ADMIN`, `//admin`, `/admin/`).

## Avisos
- **Mudança de banco**: as regras de acesso de todas as tabelas serão trocadas (dados não são apagados). Integrações externas que usem a chave pública para ler o CRM vão parar — hoje só identifiquei as do próprio app.
- As senhas foram enviadas no chat; recomendo que Joyce e Thalyta troquem após o primeiro login.

## Detalhes técnicos
- `user_roles` + enum `app_role` + `has_role()` security definer; policies `TO authenticated USING (has_role(auth.uid(),'admin'))`; DROP das policies `Anon can manage *`.
- Rota `/admin` movida para `_authenticated/admin` (layout gerenciado, `ssr:false`); checagem de papel via `has_role` RPC.
- `/api/public/leads` usa `supabaseAdmin` após validação de input.
- Server fns de usuários com `requireSupabaseAuth` + checagem `has_role` antes de usar admin API (`auth.admin.createUser/updateUserById/deleteUser`).
- Edge functions: validar JWT + papel dentro do handler (exceto webhook com segredo próprio).
- `configure_auth`: `disable_signup: true`, `password_hibp_enabled: true`.
