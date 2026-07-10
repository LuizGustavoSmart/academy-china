import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const leadSchema = z.object({
  nome: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().email().max(255).optional().or(z.literal("")).default(""),
  telefone: z.string().trim().max(50).optional().default(""),
  empresa: z.string().trim().max(200).optional().default(""),
  mensagem: z.string().trim().max(2000).optional().default(""),
  origem: z.string().trim().max(50).optional().default("site"),
});

const NOTIFY_EMAIL = "matteracademy@matterco.com.br";

async function sendNotification(lead: Record<string, string>) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("[leads] RESEND_API_KEY not configured; skipping email");
    return;
  }
  const subject = `Novo lead — Academy China 2026 (${lead.origem || "site"})`;
  const html = `
    <h2>Novo lead — Academy China 2026</h2>
    <p><b>Origem:</b> ${escape(lead.origem)}</p>
    <p><b>Nome:</b> ${escape(lead.nome)}</p>
    <p><b>E-mail:</b> ${escape(lead.email)}</p>
    <p><b>Telefone:</b> ${escape(lead.telefone)}</p>
    <p><b>Empresa:</b> ${escape(lead.empresa)}</p>
    <p><b>Mensagem:</b><br>${escape(lead.mensagem).replace(/\n/g, "<br>")}</p>
  `;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Academy China 2026 <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        reply_to: lead.email || undefined,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[leads] Resend failed [${res.status}]: ${body}`);
    }
  } catch (err) {
    console.error("[leads] Resend error", err);
  }
}

function escape(v: string | undefined): string {
  if (!v) return "";
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/api/public/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const parsed = leadSchema.safeParse(payload);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "invalid_input", details: parsed.error.flatten() }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
        const data = parsed.data;
        const ua = request.headers.get("user-agent") ?? "";
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Dedupe by email — skip insert if this email already exists in the CRM
        let alreadyExists = false;
        if (data.email) {
          const { data: existing } = await supabaseAdmin
            .from("leads_crm")
            .select("id")
            .ilike("email", data.email)
            .maybeSingle();
          alreadyExists = !!existing;
        }

        if (!alreadyExists) {
          const { error } = await supabaseAdmin.from("leads_crm").insert({
            nome: data.nome || "Sem nome",
            email: data.email || null,
            telefone: data.telefone || null,
            empresa: data.empresa || null,
            mensagem: data.mensagem || null,
            origem: data.origem || "site",
            user_agent: ua,
            ip,
            passo: 0,
            responsavel: "caetano",
            status: "cadastro",
            ordem: 0,
          });
          if (error) {
            console.error("[leads] insert failed", error);
            return new Response(JSON.stringify({ error: "db_error" }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }
        }

        // Fire-and-forget email (don't block or fail the request)
        void sendNotification({
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          empresa: data.empresa,
          mensagem: data.mensagem,
          origem: data.origem,
        });

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});