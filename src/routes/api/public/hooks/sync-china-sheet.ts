import { createFileRoute } from "@tanstack/react-router";

const SPREADSHEET_ID = "1g3dtYs6Rs37MFQrw3EXo1jq9JMSzASrNpDiFsWBP0tA";
const SHEET_NAME = "china";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function normPhone(v: string | undefined) {
  return (v ?? "").replace(/\D/g, "");
}
function normEmail(v: string | undefined) {
  return (v ?? "").trim().toLowerCase();
}

export const Route = createFileRoute("/api/public/hooks/sync-china-sheet")({
  server: {
    handlers: {
      POST: async () => {
        const lovable = process.env.LOVABLE_API_KEY;
        const connKey = process.env.GOOGLE_SHEETS_API_KEY;
        if (!lovable || !connKey) {
          return Response.json(
            { ok: false, error: "Google Sheets não conectado" },
            { status: 500 },
          );
        }

        const sheetRes = await fetch(
          `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A2:D`,
          {
            headers: {
              Authorization: `Bearer ${lovable}`,
              "X-Connection-Api-Key": connKey,
            },
          },
        );
        if (!sheetRes.ok) {
          const body = await sheetRes.text();
          return Response.json(
            { ok: false, error: `Sheets ${sheetRes.status}: ${body}` },
            { status: 502 },
          );
        }
        const { values = [] } = (await sheetRes.json()) as {
          values?: string[][];
        };

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        const { data: existing, error: exErr } = await supabase
          .from("leads_crm")
          .select("email,telefone");
        if (exErr) {
          return Response.json(
            { ok: false, error: `DB read: ${exErr.message}` },
            { status: 500 },
          );
        }

        const emails = new Set(
          (existing ?? []).map((r) => normEmail(r.email ?? undefined)).filter(Boolean),
        );
        const phones = new Set(
          (existing ?? []).map((r) => normPhone(r.telefone ?? undefined)).filter(Boolean),
        );

        const seenEmail = new Set<string>();
        const seenPhone = new Set<string>();
        const toInsert: {
          nome: string;
          email: string | null;
          telefone: string | null;
          origem: string;
          responsavel: string;
          passo: number;
          cadastrado_por: string;
        }[] = [];

        for (const row of values) {
          const [, nomeRaw, emailRaw, telRaw] = row;
          const nome = (nomeRaw ?? "").trim();
          if (!nome) continue;
          const email = normEmail(emailRaw);
          const telefone = normPhone(telRaw);
          if (!email && !telefone) continue;
          if (email && (emails.has(email) || seenEmail.has(email))) continue;
          if (telefone && (phones.has(telefone) || seenPhone.has(telefone))) continue;
          if (email) seenEmail.add(email);
          if (telefone) seenPhone.add(telefone);
          toInsert.push({
            nome,
            email: email || null,
            telefone: telefone || null,
            origem: "planilha-china",
            responsavel: "Sistema",
            passo: 1,
            cadastrado_por: "sync-china-sheet",
          });
        }

        if (toInsert.length === 0) {
          return Response.json({ ok: true, inserted: 0, scanned: values.length });
        }

        const { error: insErr } = await supabase.from("leads_crm").insert(toInsert);
        if (insErr) {
          return Response.json(
            { ok: false, error: `DB insert: ${insErr.message}` },
            { status: 500 },
          );
        }

        return Response.json({
          ok: true,
          inserted: toInsert.length,
          scanned: values.length,
        });
      },
    },
  },
});