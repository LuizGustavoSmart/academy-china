import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { syncCrmToSheet } from "@/lib/sheets-sync.functions";

const LAST_SYNC_KEY = "academy_hub_last_sheet_sync";

export function SincronizacaoPage() {
  const syncFn = useServerFn(syncCrmToSheet);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    count?: number;
    syncedAt?: string;
    spreadsheetUrl?: string;
    sheetName?: string;
    error?: string;
  } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LAST_SYNC_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const run = async () => {
    setLoading(true);
    try {
      const res = await syncFn();
      const payload = { ...res };
      setResult(payload);
      localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(payload));
    } catch (e) {
      const err = { ok: false, error: e instanceof Error ? e.message : String(e) };
      setResult(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
            <i className="ti ti-brand-google-drive" style={{ marginRight: 6, color: "var(--accent)" }} />
            Google Sheets — Matter · China · Leads
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            Exporta todos os leads do CRM para a aba <b>CRM</b> da planilha conectada.
            A aba é sobrescrita a cada sincronização.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn-primary" onClick={run} disabled={loading}>
            <i className={`ti ${loading ? "ti-loader-2" : "ti-refresh"}`} style={{ marginRight: 6 }} />
            {loading ? "Sincronizando..." : "Sincronizar agora"}
          </button>
          {result?.spreadsheetUrl && (
            <a
              href={result.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ textDecoration: "none" }}
            >
              <i className="ti ti-external-link" style={{ marginRight: 6 }} />
              Abrir planilha
            </a>
          )}
        </div>

        {result && (
          <div
            style={{
              borderTop: ".5px solid var(--border)",
              paddingTop: 12,
              fontSize: 12,
              color: result.ok ? "var(--text2)" : "var(--accent)",
            }}
          >
            {result.ok ? (
              <>
                <div>
                  <i className="ti ti-circle-check" style={{ marginRight: 6, color: "#22c55e" }} />
                  <b>{result.count}</b> leads sincronizados na aba <b>{result.sheetName}</b>.
                </div>
                {result.syncedAt && (
                  <div style={{ marginTop: 4, color: "var(--text3)" }}>
                    Última sincronização: {new Date(result.syncedAt).toLocaleString("pt-BR")}
                  </div>
                )}
              </>
            ) : (
              <div>
                <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
                {result.error}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20, fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
          Colunas exportadas
        </div>
        ID · Nome · Cargo · Empresa · Cidade · Email · Telefone · Passo · Status ·
        Responsável · Origem · Observações · Mensagem · Cadastrado por ·
        Criado em · Atualizado em
      </div>
    </div>
  );
}