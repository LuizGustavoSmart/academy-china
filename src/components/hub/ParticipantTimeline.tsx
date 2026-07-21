import { useState } from "react";
import { respAvatar, useCreateParticipantActivity, useDeleteParticipantActivity, useLeadActivities, useLeads, useParticipantActivities, useUpdateParticipantActivity } from "@/lib/hub-api";
import { AutorSelect } from "@/components/hub/ResponsavelSelect";
import { ConfirmDialog } from "@/components/hub/Modal";

const AUTHOR_KEY = "academy_hub_author";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Histórico da Pré-viagem. O campo legado de observações continua intacto e é exibido como primeira nota quando necessário. */
export function ParticipantTimeline({ participantId, participantName, legacyNote }: { participantId: string; participantName: string; legacyNote?: string | null }) {
  const { data: activities = [], isLoading } = useParticipantActivities(participantId);
  const { data: leads = [] } = useLeads();
  const commercialLead = leads.find((lead) => lead.nome.trim().toLocaleLowerCase("pt-BR") === participantName.trim().toLocaleLowerCase("pt-BR"));
  const { data: commercialActivities = [] } = useLeadActivities(commercialLead?.id ?? null);
  const create = useCreateParticipantActivity();
  const update = useUpdateParticipantActivity();
  const del = useDeleteParticipantActivity();
  const [text, setText] = useState("");
  const [autor, setAutor] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem(AUTHOR_KEY)) || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const chooseAutor = (nome: string) => {
    setAutor(nome);
    if (typeof localStorage !== "undefined") localStorage.setItem(AUTHOR_KEY, nome);
  };

  const publish = () => {
    const conteudo = text.trim();
    if (!conteudo) return;
    const nomeAutor = autor.trim() || "Equipe Pré-viagem";
    if (typeof localStorage !== "undefined") localStorage.setItem(AUTHOR_KEY, nomeAutor);
    create.mutate({ participant_id: participantId, conteudo, autor: nomeAutor }, { onSuccess: () => setText("") });
  };

  const startEdit = (id: string, conteudo: string) => {
    setEditingId(id);
    setEditText(conteudo);
  };

  const saveEdit = () => {
    const conteudo = editText.trim();
    if (!conteudo || !editingId) return;
    update.mutate({ id: editingId, participant_id: participantId, conteudo }, { onSuccess: () => setEditingId(null) });
  };

  // Notas comerciais continuam aparecendo aqui mesmo para participantes já
  // existentes antes desta melhoria. Ao criar o participante, elas também são
  // copiadas para o histórico próprio da Pré-viagem.
  const copied = new Set(activities.map((a) => `${a.conteudo}|${a.autor ?? ""}|${a.created_at}`));
  const commercialLegacyNote = commercialLead?.observacoes?.trim() ?? "";
  const legacyAlreadyPresent = !!legacyNote?.trim() || activities.some((a) => a.conteudo.trim() === commercialLegacyNote);
  const synchronizedActivities = [
    ...activities,
    ...commercialActivities.filter((a) => !copied.has(`${a.conteudo}|${a.autor ?? ""}|${a.created_at}`)).map((a) => ({ ...a, id: `commercial-${a.id}` })),
    ...(commercialLegacyNote && !legacyAlreadyPresent ? [{
      id: `commercial-legacy-${commercialLead?.id}`,
      conteudo: commercialLegacyNote,
      autor: "Comercial",
      tipo: "observacao",
      created_at: commercialLead?.created_at ?? new Date(0).toISOString(),
    }] : []),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return <div className="tl">
    <div className="tl-composer">
      <textarea className="form-textarea tl-input" placeholder="Escreva uma observação, registro de contato, próxima ação…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) publish(); }} />
      <div className="tl-composer-foot">
        <div className="tl-author">
          <AutorSelect value={autor} onChange={chooseAutor} placeholder="Responsável pela nota…" />
        </div>
        <button className="btn-primary" onClick={publish} disabled={!text.trim() || create.isPending}><i className="ti ti-send" /> Publicar</button>
      </div>
    </div>
    {isLoading ? <div className="tl-empty">Carregando…</div>
      : synchronizedActivities.length === 0 && !legacyNote?.trim() ? <div className="tl-empty"><i className="ti ti-message-circle" /> Nenhuma observação ainda. Publique a primeira acima.</div>
      : <div className="tl-list">
          {synchronizedActivities.map((a) => {
            const nome = a.autor || "Equipe Pré-viagem";
            const { initials, color } = respAvatar(nome);
            const editable = !String(a.id).startsWith("commercial-");
            const isEditing = editable && editingId === a.id;
            return (
              <div className="tl-item" key={a.id}>
                <span className="tl-avatar" style={{ background: color }}>{initials}</span>
                <div className="tl-body">
                  <div className="tl-meta">
                    <strong>{nome}</strong>
                    <span className="tl-meta-right">
                      <span className="tl-time">{fmtDateTime(a.created_at)}</span>
                      {editable && !isEditing && (
                        <span className="tl-actions">
                          <button type="button" className="tl-action-btn" title="Editar" onClick={() => startEdit(a.id, a.conteudo)}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button type="button" className="tl-action-btn" title="Excluir" onClick={() => setDeletingId(a.id)}>
                            <i className="ti ti-trash" />
                          </button>
                        </span>
                      )}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="tl-edit">
                      <textarea
                        className="form-textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <div className="tl-edit-actions">
                        <button className="btn-secondary" style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => setEditingId(null)}>Cancelar</button>
                        <button className="btn-primary" style={{ fontSize: 11, padding: "6px 10px" }} onClick={saveEdit} disabled={!editText.trim() || update.isPending}>Salvar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="tl-content">{a.conteudo}</div>
                  )}
                </div>
              </div>
            );
          })}
          {legacyNote?.trim() ? <div className="tl-item"><span className="tl-avatar" style={{ background: "#5c6470" }}>—</span><div className="tl-body"><div className="tl-meta"><strong>Observação anterior</strong><span className="tl-time">preservada</span></div><div className="tl-content">{legacyNote}</div></div></div> : null}
        </div>}

    <ConfirmDialog
      open={!!deletingId}
      onClose={() => setDeletingId(null)}
      onConfirm={() => { if (deletingId) del.mutate({ id: deletingId, participant_id: participantId }); }}
      title="Excluir observação"
      message="Tem certeza que deseja excluir esta nota da timeline? Essa ação não pode ser desfeita."
      confirmLabel="Excluir"
    />
  </div>;
}
