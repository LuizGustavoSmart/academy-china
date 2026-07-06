## O que vou fazer

1. **Servir o HTML sem alterar o conteúdo visível**
   - Copiar o arquivo enviado para `public/index.html` (byte a byte).
   - Substituir a rota raiz do app (`src/routes/index.tsx`) por um redirect para `/index.html`, para que o link publicado (`/`) mostre exatamente a página enviada.
   - Ajustar `<title>` / meta em `src/routes/__root.tsx` para "Academy China 2026" (exigência da plataforma — não afeta o HTML servido).

2. **Pequeno ajuste técnico obrigatório no HTML** (necessário para salvar/enviar)
   - Os dois `<form>` (`#hero-contact-form` e `#contact-form`) hoje não têm `name` nos campos nem envio configurado. Vou:
     - Adicionar atributos `name` (`nome`, `email`, `telefone`, `empresa`, `mensagem`) nos inputs dos dois formulários. **Nada visual muda** (mesmos placeholders, estilos, textos, layout).
     - Injetar um `<script>` no final do `<body>` que intercepta o submit, envia via `fetch` para o backend e mostra "Recebido!" no botão em caso de sucesso.
   - Nenhum texto, cor, imagem, animação, seção ou estrutura visível é alterada.

3. **Backend (Lovable Cloud)**
   - Ativar o Lovable Cloud.
   - Criar tabela `leads` com colunas: `id`, `created_at`, `nome`, `email`, `telefone`, `empresa`, `mensagem`, `origem` (hero/contato), `user_agent`, `ip`.
   - RLS: `INSERT` público (anon) permitido; `SELECT` só para service_role (privacidade).
   - Rota pública `POST /api/public/leads` (TanStack server route) que:
     1. Valida input (Zod) e limita tamanho.
     2. Insere na tabela `leads` via `supabaseAdmin`.
     3. Envia email para `matteracademy@matterco.com.br` via Lovable Emails com assunto "Novo lead — Academy China 2026" e o conteúdo completo do formulário.

4. **Email**
   - Usar Lovable Emails (built-in). Requer configurar um domínio de envio — vou abrir o setup de domínio quando chegarmos nessa etapa. Enquanto o DNS não estiver verificado, os leads continuam sendo salvos no banco normalmente; os emails começam a sair assim que o domínio for verificado.

## Resultado
- Link publicado mostra o HTML enviado, visualmente idêntico.
- Cada envio dos dois formulários grava no banco e dispara email para `matteracademy@matterco.com.br`.

Posso prosseguir?