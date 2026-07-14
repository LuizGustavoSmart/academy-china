import { useState } from "react";
import { useMensagens, useUpdateMensagem, type Mensagem } from "@/lib/hub-api";

export function MensagensAccordion({ etapa, intro }: { etapa: string; intro?: string }) {
  const { data: mensagens = [] } = useMensagens(etapa);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="main">
      <div className="section-label" style={{ marginTop: 0 }}>
        Scripts de comunicação — {etapa === "comercial" ? "por passo do funil" : etapa === "preop" ? "fase pré-viagem" : "durante a viagem"}
      </div>
      {intro && <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 16 }}>{intro}</div>}
      <div className="msg-accordion">
        {mensagens.map((m) => (
          <MensagemItem key={m.id} mensagem={m} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
        ))}
      </div>
    </div>
  );
}

function MensagemItem({ mensagem, open, onToggle }: { mensagem: Mensagem; open: boolean; onToggle: () => void }) {
  const update = useUpdateMensagem();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(mensagem.corpo ?? "");

  return (
    <div className={`msg-accordion-item${open ? " open" : ""}`}>
      <div className="msg-accordion-header" onClick={onToggle}>
        <div className="msg-accordion-left">
          <span className="msg-accordion-step">{mensagem.codigo}</span>
          <div>
            <div className="msg-accordion-title">{mensagem.titulo}</div>
            {mensagem.meta && <div className="msg-accordion-meta">{mensagem.meta}</div>}
          </div>
        </div>
        <i className="ti ti-chevron-down msg-accordion-arrow" />
      </div>
      <div className="msg-accordion-body">
        {mensagem.nota && (
          <div className={mensagem.nota_tipo === "danger" ? "msg-nota-red" : "msg-nota"}>{mensagem.nota}</div>
        )}
        {editing ? (
          <>
            <textarea className="form-textarea" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="msg-edit-row">
              <button
                className="btn-secondary"
                onClick={() => {
                  setText(mensagem.corpo ?? "");
                  setEditing(false);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  update.mutate({ id: mensagem.id, corpo: text }, { onSuccess: () => setEditing(false) });
                }}
              >
                Salvar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="msg-body-text">{mensagem.corpo || "(sem conteúdo — clique em editar)"}</div>
            <div className="msg-edit-row">
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                <i className="ti ti-pencil" /> Editar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
