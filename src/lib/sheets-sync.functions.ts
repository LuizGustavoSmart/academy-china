import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SPREADSHEET_ID = "1g3dtYs6Rs37MFQrw3EXo1jq9JMSzASrNpDiFsWBP0tA";
const SHEET_NAME = "CRM";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

const HEADERS = [
  "Data",
  "Nome",
  "E-mail",
  "Telefone",
];

function authHeaders() {
  const lovable = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovable || !connKey) {
    throw new Error(
      "Google Sheets não está conectado. Vincule a conexão em Conectores.",
    );
  }
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

async function ensureSheet() {
  const meta = await fetch(`${GATEWAY}/spreadsheets/${SPREADSHEET_ID}`, {
    headers: authHeaders(),
  });
  if (!meta.ok) {
    throw new Error(`Falha ao ler planilha (${meta.status}): ${await meta.text()}`);
  }
  const body = (await meta.json()) as {
    sheets: { properties: { title: string; sheetId: number } }[];
  };
  const existing = body.sheets.find((s) => s.properties.title === SHEET_NAME);
  if (existing) return;

  const res = await fetch(
    `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Falha ao criar aba CRM (${res.status}): ${await res.text()}`);
  }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export const syncCrmToSheet = createServerFn({ method: "POST" }).handler(
  async () => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase
      .from("leads_crm")
      .select("nome,email,telefone,created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Erro ao ler leads: ${error.message}`);

    await ensureSheet();

    const rows = (data ?? []).map((l) => [
      l.created_at
        ? new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
        : "",
      fmt(l.nome),
      fmt(l.email),
      fmt(l.telefone),
    ]);

    // Limpa aba e escreve tudo (header + rows)
    const clearRes = await fetch(
      `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:Z100000:clear`,
      { method: "POST", headers: authHeaders() },
    );
    if (!clearRes.ok) {
      throw new Error(
        `Falha ao limpar aba (${clearRes.status}): ${await clearRes.text()}`,
      );
    }

    const values = [HEADERS, ...rows];
    const writeRes = await fetch(
      `${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ values }),
      },
    );
    if (!writeRes.ok) {
      throw new Error(
        `Falha ao escrever (${writeRes.status}): ${await writeRes.text()}`,
      );
    }

    return {
      ok: true,
      count: rows.length,
      syncedAt: new Date().toISOString(),
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`,
      sheetName: SHEET_NAME,
    };
  },
);