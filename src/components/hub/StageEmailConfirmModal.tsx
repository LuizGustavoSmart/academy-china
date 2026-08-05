import { useEffect, useState } from "react";
import { Modal } from "@/components/hub/Modal";
import { etapaLabel } from "@/lib/pre-viagem-etapas";

/** Mensagem já montada (placeholders resolvidos) aguardando confirmação de envio. */
export type PendingStageEmail = {
  participant_id: string;
  participant_nome: string;
  etapa_origem: string | null;
  etapa_destino: string;
  email_template_id: string | null;
  destinatario: string;
  assunto: string;
  conteudo: string;
};

export function StageEmailConfirmModal({
  pending,
  sending,
  onCancel,
  onConfirm,
}: {
  pending: PendingStageEmail | null;
  sending: boolean;
  onCancel: () => void;
  onConfirm: (payload: PendingStageEmail) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [conteudo, setConteudo] = useState("");

  // Cada nova mensagem reabre o modal em modo leitura, com o texto recém-gerado.
  useEffect(() => {
    if (!pending) return;
    setAssunto(pending.assunto);
    setConteudo(pending.conteudo);
    setEditando(false);
  }, [pending]);

  if (!pending) return null;

  return (
    <Modal
      open
      onClose={sending ? () => {} : onCancel}
      title="Confirmar envio de e-mail"
      description="O card já foi movido. Cancelar aqui apenas impede o envio da mensagem."
      icon="ti-mail-forward"
      size="lg"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px",
          fontSize: 12, padding: "12px 14px", border: ".5px solid var(--border)",
          borderRadius: 8, background: "var(--surface2)",
        }}>
          <span style={{ color: "var(--text3)" }}>Destinatário</span>
          <span><strong>{pending.participant_nome}</strong> · {pending.destinatario}</span>
          <span style={{ color: "var(--text3)" }}>Movimentação</span>
          <span>
            {etapaLabel(pending.etapa_origem)} <i className="ti ti-arrow-right" style={{ margin: "0 4px", color: "var(--text3)" }} /> <strong>{etapaLabel(pending.etapa_destino)}</strong>
          </span>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Assunto</label>
          {editando ? (
            <input className="form-input" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
          ) : (
            <div style={{ fontSize: 13, fontWeight: 500 }}>{assunto || <span style={{ color: "var(--text3)" }}>— sem assunto —</span>}</div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Mensagem</label>
          {editando ? (
            <textarea className="form-textarea" value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
          ) : (
            <div style={{
              fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto",
              padding: "12px 14px", border: ".5px solid var(--border)", borderRadius: 8, background: "var(--surface)",
            }}>
              {conteudo || <span style={{ color: "var(--text3)" }}>— sem conteúdo —</span>}
            </div>
          )}
          <div className="form-help">
            <i className="ti ti-info-circle" />
            Os placeholders já foram substituídos pelos dados reais do participante.
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onCancel} disabled={sending}>
          Cancelar envio
        </button>
        <button className="btn-secondary" onClick={() => setEditando((v) => !v)} disabled={sending}>
          <i className={`ti ${editando ? "ti-eye" : "ti-pencil"}`} /> {editando ? "Ver prévia" : "Editar mensagem"}
        </button>
        <button
          className="btn-primary"
          disabled={sending || !assunto.trim() || !conteudo.trim()}
          onClick={() => onConfirm({ ...pending, assunto, conteudo })}
        >
          <i className="ti ti-send" /> {sending ? "Enviando…" : "Confirmar e enviar"}
        </button>
      </div>
    </Modal>
  );
}
