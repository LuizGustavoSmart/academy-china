import { useState } from "react";
import { useCreatePendencia, useDeletePendencia, useUpdatePendencia, usePendencias, type Pendencia } from "@/lib/hub-api";
import { Modal, ConfirmDialog } from "@/components/hub/Modal";

export function PendenciasList({ fase, title }: { fase?: string; title?: string }) {
  const { data: all = [] } = usePendencias();
  const items = fase ? all.filter((p) => p.fase === fase) : all;
  const del = useDeletePendencia();
  const update = useUpdatePendencia();
  const [editing, setEditing] = useState<Pendencia | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <div className="main">
      <div className="flex-between mb-16">
        <div className="section-label" style={{ margin: 0 }}>
          {title ?? "Pendências"}
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)} style={{ fontSize: 12, padding: "7px 14px" }}>
          <i className="ti ti-plus" /> Nova pendência
        </button>
      </div>
      <div className="pendencia-list">
        {items.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
            Nenhuma pendência registrada.
          </div>
        )}
        {items.map((p) => (
          <div
            key={p.id}
            className={`pendencia-item ${p.prioridade === "critico" ? "pend-crit" : p.prioridade === "alta" ? "pend-warn" : ""}`}
            style={{ opacity: p.status === "resolvida" ? 0.55 : 1 }}
          >
            <i className={`ti ${p.prioridade === "critico" ? "ti-alert-circle" : "ti-alert-triangle"} pend-icon`} />
            <div className="pend-content">
              <div className="pend-title" style={{ textDecoration: p.status === "resolvida" ? "line-through" : "none" }}>
                {p.titulo}
              </div>
              {p.descricao && <div className="pend-desc">{p.descricao}</div>}
              <div className="pend-meta">
                <span className="pend-tag fase">{p.fase}</span>
                {p.dono && <span className="pend-tag dono">{p.dono}</span>}
                {p.data_inicio && (
                  <span className="pend-tag">
                    <i className="ti ti-calendar-event" /> {new Date(p.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
                {p.data_fim && (
                  <span className="pend-tag">
                    <i className="ti ti-calendar-check" /> {new Date(p.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
                {p.impacto && (
                  <span className={`badge ${p.prioridade === "critico" ? "badge-danger" : "badge-warn"}`}>
                    {p.impacto}
                  </span>
                )}
                <span className={`badge ${p.status === "resolvida" ? "badge-ok" : "badge-neutral"}`}>{p.status}</span>
                <div className="pend-actions">
                  <button
                    title={p.status === "resolvida" ? "Reabrir" : "Marcar como resolvida"}
                    onClick={() => update.mutate({ id: p.id, patch: { status: p.status === "resolvida" ? "aberta" : "resolvida" } })}
                  >
                    <i className={`ti ${p.status === "resolvida" ? "ti-arrow-back" : "ti-check"}`} />
                  </button>
                  <button title="Editar" onClick={() => setEditing(p)}>
                    <i className="ti ti-pencil" />
                  </button>
                  <button title="Excluir" onClick={() => setConfirmDel(p.id)}>
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <PendenciaModal
          open
          fixedFase={fase}
          pendencia={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && del.mutate(confirmDel)}
        title="Excluir pendência"
        message="Tem certeza? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  );
}

function PendenciaModal({
  open, onClose, pendencia, fixedFase,
}: { open: boolean; onClose: () => void; pendencia: Pendencia | null; fixedFase?: string }) {
  const create = useCreatePendencia();
  const update = useUpdatePendencia();
  const [form, setForm] = useState({
    titulo: pendencia?.titulo ?? "",
    descricao: pendencia?.descricao ?? "",
    fase: pendencia?.fase ?? fixedFase ?? "comercial",
    dono: pendencia?.dono ?? "",
    prioridade: pendencia?.prioridade ?? "normal",
    impacto: pendencia?.impacto ?? "",
    data_inicio: pendencia?.data_inicio ?? "",
    data_fim: pendencia?.data_fim ?? "",
  });

  const submit = () => {
    if (!form.titulo.trim()) return;
    const payload = {
      ...form,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
    };
    if (pendencia) {
      update.mutate({ id: pendencia.id, patch: payload }, { onSuccess: onClose });
    } else {
      create.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={pendencia ? "Editar pendência" : "Nova pendência"}>
      <div className="form-group">
        <label className="form-label">Título</label>
        <input className="form-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Descrição</label>
        <textarea className="form-textarea" style={{ minHeight: 100 }} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Fase</label>
          <select className="form-select" value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}>
            <option value="comercial">Comercial</option>
            <option value="preop">Pré-viagem</option>
            <option value="viagem">Viagem</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Prioridade</label>
          <select className="form-select" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
            <option value="critico">Crítico</option>
            <option value="alta">Alta</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Dono</label>
          <input className="form-input" value={form.dono ?? ""} onChange={(e) => setForm({ ...form, dono: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Impacto</label>
          <input className="form-input" value={form.impacto ?? ""} onChange={(e) => setForm({ ...form, impacto: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Data de início</label>
          <input type="date" className="form-input" value={form.data_inicio ?? ""} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Data final</label>
          <input type="date" className="form-input" value={form.data_fim ?? ""} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
        </div>
      </div>
      <div className="flex-end">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit}>{pendencia ? "Salvar" : "Adicionar"}</button>
      </div>
    </Modal>
  );
}
