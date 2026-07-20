import { useState } from "react";
import { useCreateLeadActivity, useLeadActivities, respAvatar } from "@/lib/hub-api";

const AUTHOR_KEY = "academy_hub_author";

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Timeline de observações do lead (estilo RD Station / HubSpot):
 *  publica novas notas, mantém histórico, mais recente no topo. */
export function LeadTimeline({ leadId, legacyNote }: { leadId: string; legacyNote?: string | null }) {
  const { data: activities = [], isLoading } = useLeadActivities(leadId);
  const create = useCreateLeadActivity();
  const [text, setText] = useState("");
  const [autor, setAutor] = useState<string>(() =>
    (typeof localStorage !== "undefined" && localStorage.getItem(AUTHOR_KEY)) || "",
  );

  const publish = () => {
    const conteudo = text.trim();
    if (!conteudo) return;
    const nomeAutor = autor.trim() || "Equipe comercial";
    if (typeof localStorage !== "undefined") localStorage.setItem(AUTHOR_KEY, nomeAutor);
    create.mutate(
      { lead_id: leadId, conteudo, autor: nomeAutor },
      { onSuccess: () => setText("") },
    );
  };

  return (
    <div className="tl">
      <div className="tl-composer">
        <textarea
          className="form-textarea tl-input"
          placeholder="Escreva uma observação, registro de contato, próxima ação…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) publish(); }}
        />
        <div className="tl-composer-foot">
          <input
            className="form-input tl-author"
            placeholder="Seu nome"
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
          />
          <button className="btn-primary" onClick={publish} disabled={!text.trim() || create.isPending}>
            <i className="ti ti-send" /> Publicar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="tl-empty">Carregando…</div>
      ) : activities.length === 0 && legacyNote && legacyNote.trim() ? (
        // Observação antiga (campo único) exibida enquanto a migração para a timeline não roda.
        <div className="tl-list">
          <div className="tl-item">
            <span className="tl-avatar" style={{ background: "#5c6470" }}>—</span>
            <div className="tl-body">
              <div className="tl-meta"><strong>Observação anterior</strong><span className="tl-time">importada</span></div>
              <div className="tl-content">{legacyNote}</div>
            </div>
          </div>
        </div>
      ) : activities.length === 0 ? (
        <div className="tl-empty">
          <i className="ti ti-message-circle" />
          Nenhuma observação ainda. Publique a primeira acima.
        </div>
      ) : (
        <div className="tl-list">
          {activities.map((a) => {
            const nome = a.autor || "Equipe comercial";
            const { initials, color } = respAvatar(nome);
            return (
              <div className="tl-item" key={a.id}>
                <span className="tl-avatar" style={{ background: color }}>{initials}</span>
                <div className="tl-body">
                  <div className="tl-meta">
                    <strong>{nome}</strong>
                    <span className="tl-time">{fmtDateTime(a.created_at)}</span>
                  </div>
                  <div className="tl-content">{a.conteudo}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
