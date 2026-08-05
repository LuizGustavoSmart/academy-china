// Envia o e-mail de transição de etapa do pipeline de Pré-Viagem via Resend e
// registra o resultado (sucesso ou erro) em `email_send_history`. A mensagem
// já chega pronta (assunto/conteúdo com os placeholders já resolvidos pelo
// front-end) — esta função só confirma o envio e persiste o histórico.
// verify_jwt = false em supabase/config.toml porque quem chama é o próprio
// app do Hub usando a chave publishable, sem sessão de usuário autenticado.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("EMAIL_FROM") ?? "Academy China <onboarding@resend.dev>";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

type Payload = {
  participant_id: string;
  etapa_origem: string | null;
  etapa_destino: string;
  email_template_id: string | null;
  destinatario: string;
  assunto: string;
  conteudo: string;
  enviado_por?: string | null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!body.destinatario || !body.assunto || !body.etapa_destino) {
    return json({ error: "missing_required_fields" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const historyBase = {
    participant_id: body.participant_id,
    etapa_origem: body.etapa_origem,
    etapa_destino: body.etapa_destino,
    email_template_id: body.email_template_id,
    destinatario: body.destinatario,
    assunto_enviado: body.assunto,
    conteudo_enviado: body.conteudo,
    enviado_por: body.enviado_por ?? null,
  };

  if (!RESEND_API_KEY) {
    await admin.from("email_send_history").insert({
      ...historyBase,
      status_envio: "erro",
      erro_envio: "RESEND_API_KEY não configurada nas secrets do projeto Supabase.",
    });
    return json({ status: "erro", erro: "email_provider_not_configured" }, 500);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [body.destinatario],
        subject: body.assunto,
        html: body.conteudo,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await admin.from("email_send_history").insert({
        ...historyBase,
        status_envio: "erro",
        erro_envio: errText.slice(0, 2000),
      });
      return json({ status: "erro", erro: errText }, 502);
    }

    await admin.from("email_send_history").insert({
      ...historyBase,
      status_envio: "enviado",
      enviado_em: new Date().toISOString(),
    });
    return json({ status: "enviado" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("email_send_history").insert({
      ...historyBase,
      status_envio: "erro",
      erro_envio: message.slice(0, 2000),
    });
    return json({ status: "erro", erro: message }, 500);
  }
});
