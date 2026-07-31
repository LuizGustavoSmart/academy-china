import { useState } from "react";
import { useCreateLeadActivity, useDeleteLeadActivity, useLeadActivities, useUpdateLeadActivity, respAvatar } from "@/lib/hub-api";
import { AutorSelect } from "@/components/hub/ResponsavelSelect";
import { ConfirmDialog } from "@/components/hub/Modal";

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
  const update = useUpdateLeadActivity();
  const del = useDeleteLeadActivity();
  const [text, setText] = useState("");
  const [autor, setAutor] = useState<string>(() =>
    (typeof localStorage !== "undefined" && localStorage.getItem(AUTHOR_KEY)) || "",
  );
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
    const nomeAutor = autor.trim() || "Equipe comercial";
    if (typeof localStorage !== "undefined") localStorage.setItem(AUTHOR_KEY, nomeAutor);
    create.mutate(
      { lead_id: leadId, conteudo, autor: nomeAutor },
      { onSuccess: () => setText("") },
    );
  };

  const startEdit = (id: string, conteudo: string) => {
    setEditingId(id);
    setEditText(conteudo);
  };

  const saveEdit = () => {
    const conteudo = editText.trim();
    if (!conteudo || !editingId) return;
    update.mutate({ id: editingId, lead_id: leadId, conteudo }, { onSuccess: () => setEditingId(null) });
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
          <div className="tl-author">
            <AutorSelect value={autor} onChange={chooseAutor} placeholder="Responsável pela nota…" />
          </div>
          <button className="btn-primary" onClick={publish} disabled={!text.trim() || create.isPending}>
            <i className="ti ti-send" /> Publicar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="tl-empty">Carregando…</div>
      ) : activities.length === 0 && !(legacyNote && legacyNote.trim()) ? (
        <div className="tl-empty">
          <i className="ti ti-message-circle" />
          Nenhuma observação ainda. Publique a primeira acima.
        </div>
      ) : (
        <div className="tl-list">
          {activities.map((a) => {
            const nome = a.autor || "Equipe comercial";
            const { initials, color } = respAvatar(nome);
            const isEditing = editingId === a.id;
            return (
              <div className="tl-item" key={a.id}>
                <span className="tl-avatar" style={{ background: color }}>{initials}</span>
                <div className="tl-body">
                  <div className="tl-meta">
                    <strong>{nome}</strong>
                    <span className="tl-meta-right">
                      <span className="tl-time">{fmtDateTime(a.created_at)}</span>
                      {!isEditing && (
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
          {legacyNote && legacyNote.trim() ? (
            // Observação antiga (campo único), preservada como primeira nota da timeline — sempre visível, mesmo após novas publicações.
            <div className="tl-item">
              <span className="tl-avatar" style={{ background: "#5c6470" }}>—</span>
              <div className="tl-body">
                <div className="tl-meta"><strong>Observação anterior</strong><span className="tl-time">importada</span></div>
                <div className="tl-content">{legacyNote}</div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => { if (deletingId) del.mutate({ id: deletingId, lead_id: leadId }); }}
        title="Excluir observação"
        message="Tem certeza que deseja excluir esta nota da timeline? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  );
}
