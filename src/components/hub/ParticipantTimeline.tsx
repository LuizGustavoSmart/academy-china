import { useState } from "react";
import { respAvatar, useCreateParticipantActivity, useParticipantActivities } from "@/lib/hub-api";

const AUTHOR_KEY = "academy_hub_author";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Histórico da Pré-viagem. O campo legado de observações continua intacto e é exibido como primeira nota quando necessário. */
export function ParticipantTimeline({ participantId, legacyNote }: { participantId: string; legacyNote?: string | null }) {
  const { data: activities = [], isLoading } = useParticipantActivities(participantId);
  const create = useCreateParticipantActivity();
  const [text, setText] = useState("");
  const [autor, setAutor] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem(AUTHOR_KEY)) || "");

  const publish = () => {
    const conteudo = text.trim();
    if (!conteudo) return;
    const nomeAutor = autor.trim() || "Equipe Pré-viagem";
    if (typeof localStorage !== "undefined") localStorage.setItem(AUTHOR_KEY, nomeAutor);
    create.mutate({ participant_id: participantId, conteudo, autor: nomeAutor }, { onSuccess: () => setText("") });
  };

  return <div className="tl">
    <div className="tl-composer">
      <textarea className="form-textarea tl-input" placeholder="Escreva uma observação, registro de contato, próxima ação…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) publish(); }} />
      <div className="tl-composer-foot">
        <input className="form-input tl-author" placeholder="Seu nome" value={autor} onChange={(e) => setAutor(e.target.value)} />
        <button className="btn-primary" onClick={publish} disabled={!text.trim() || create.isPending}><i className="ti ti-send" /> Publicar</button>
      </div>
    </div>
    {isLoading ? <div className="tl-empty">Carregando…</div>
      : activities.length === 0 && legacyNote?.trim() ? <div className="tl-list"><div className="tl-item"><span className="tl-avatar" style={{ background: "#5c6470" }}>—</span><div className="tl-body"><div className="tl-meta"><strong>Observação anterior</strong><span className="tl-time">preservada</span></div><div className="tl-content">{legacyNote}</div></div></div></div>
      : activities.length === 0 ? <div className="tl-empty"><i className="ti ti-message-circle" /> Nenhuma observação ainda. Publique a primeira acima.</div>
      : <div className="tl-list">{activities.map((a) => { const nome = a.autor || "Equipe Pré-viagem"; const { initials, color } = respAvatar(nome); return <div className="tl-item" key={a.id}><span className="tl-avatar" style={{ background: color }}>{initials}</span><div className="tl-body"><div className="tl-meta"><strong>{nome}</strong><span className="tl-time">{fmtDateTime(a.created_at)}</span></div><div className="tl-content">{a.conteudo}</div></div></div>; })}</div>}
  </div>;
}
