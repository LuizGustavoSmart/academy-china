import { useState } from "react";
import { useCreatePendencia, useDeletePendencia, useUpdatePendencia, usePendencias, type Pendencia } from "@/lib/hub-api";
import { Modal, ConfirmDialog } from "@/components/hub/Modal";

const COLUMNS: { id: string; label: string; icon: string; color: string }[] = [
  { id: "aberta", label: "A fazer", icon: "ti-circle-dashed", color: "var(--text3)" },
  { id: "em_andamento", label: "Em andamento", icon: "ti-progress", color: "var(--blue)" },
  { id: "resolvida", label: "Concluído", icon: "ti-circle-check", color: "var(--teal)" },
];

const FASE_LABEL: Record<string, string> = {
  comercial: "Comercial",
  preop: "Pré-viagem",
  viagem: "Viagem",
};

export function PendenciasList({ fase, title }: { fase?: string; title?: string }) {
  const { data: all = [] } = usePendencias();
  const items = fase ? all.filter((p) => p.fase === fase) : all;
  const del = useDeletePendencia();
  const update = useUpdatePendencia();
  const [editing, setEditing] = useState<Pendencia | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const byStatus = (st: string) =>
    items.filter((p) => (st === "aberta" ? p.status !== "em_andamento" && p.status !== "resolvida" : p.status === st));

  const nextStatus = (s: string) =>
    s === "resolvida" ? "aberta" : s === "em_andamento" ? "resolvida" : "em_andamento";
  const prevStatus = (s: string) =>
    s === "aberta" ? "resolvida" : s === "em_andamento" ? "aberta" : "em_andamento";

  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div className="main">
      <div className="flex-between mb-16">
        <div className="section-label" style={{ margin: 0 }}>
          {title ?? "Plano de ação"}
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)} style={{ fontSize: 12, padding: "7px 14px" }}>
          <i className="ti ti-plus" /> Nova ação
        </button>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--text3)", fontSize: 12, border: ".5px dashed var(--border)", borderRadius: "var(--radius)" }}>
          Nenhuma ação registrada. Clique em "Nova ação" para começar.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, alignItems: "start" }}>
          {COLUMNS.map((col) => {
            const list = byStatus(col.id);
            return (
              <div key={col.id} style={{ background: "var(--surface2)", border: ".5px solid var(--border)", borderRadius: "var(--radius)", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 8px", borderBottom: ".5px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: col.color }}>
                    <i className={`ti ${col.icon}`} style={{ fontSize: 14 }} />
                    {col.label}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text3)", background: "var(--surface)", border: ".5px solid var(--border)", borderRadius: 999, padding: "1px 8px" }}>{list.length}</span>
                </div>
                {list.length === 0 && (
                  <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", padding: "12px 4px" }}>—</div>
                )}
                {list.map((p) => {
                  const isDone = p.status === "resolvida";
                  const borderL = p.prioridade === "critico" ? "var(--accent)" : p.prioridade === "alta" ? "var(--amber)" : "var(--border-strong)";
                  return (
                    <div key={p.id} style={{
                      background: "var(--surface)", border: ".5px solid var(--border)", borderLeft: `3px solid ${borderL}`,
                      borderRadius: "var(--radius-sm)", padding: "10px 11px", display: "flex", flexDirection: "column", gap: 6,
                      opacity: isDone ? 0.65 : 1,
                    }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, textDecoration: isDone ? "line-through" : "none", lineHeight: 1.35 }}>
                          {p.titulo}
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button title="Voltar" onClick={() => update.mutate({ id: p.id, patch: { status: prevStatus(p.status) } })} style={iconBtn}>
                            <i className="ti ti-chevron-left" />
                          </button>
                          <button title="Avançar" onClick={() => update.mutate({ id: p.id, patch: { status: nextStatus(p.status) } })} style={iconBtn}>
                            <i className="ti ti-chevron-right" />
                          </button>
                        </div>
                      </div>
                      {p.descricao && (
                        <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.4 }}>{p.descricao}</div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                        {!fase && (
                          <span style={chipStyle}>{FASE_LABEL[p.fase] ?? p.fase}</span>
                        )}
                        {p.dono && <span style={{ ...chipStyle, color: "var(--blue)", background: "var(--blue-light)" }}>{p.dono}</span>}
                        {p.prioridade === "critico" && <span style={{ ...chipStyle, color: "var(--accent)", background: "var(--accent-light)" }}>Crítico</span>}
                        {p.prioridade === "alta" && <span style={{ ...chipStyle, color: "var(--amber)", background: "var(--amber-light)" }}>Alta</span>}
                        {p.data_inicio && (
                          <span style={{ ...chipStyle, color: "var(--text2)" }}>
                            <i className="ti ti-calendar-event" style={{ fontSize: 10, marginRight: 3 }} />
                            {fmt(p.data_inicio)}
                          </span>
                        )}
                        {p.data_fim && (
                          <span style={{ ...chipStyle, color: "var(--text2)" }}>
                            <i className="ti ti-flag" style={{ fontSize: 10, marginRight: 3 }} />
                            {fmt(p.data_fim)}
                          </span>
                        )}
                      </div>
                      {p.impacto && (
                        <div style={{ fontSize: 10, color: "var(--text3)", fontStyle: "italic" }}>Impacto: {p.impacto}</div>
                      )}
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", borderTop: ".5px dashed var(--border)", paddingTop: 6, marginTop: 2 }}>
                        <button title="Editar" onClick={() => setEditing(p)} style={iconBtn}>
                          <i className="ti ti-pencil" />
                        </button>
                        <button title="Excluir" onClick={() => setConfirmDel(p.id)} style={iconBtn}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

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
        title="Excluir ação"
        message="Tem certeza? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "var(--surface2)", color: "var(--text2)",
  border: ".5px solid var(--border)", fontWeight: 500, display: "inline-flex", alignItems: "center",
};

const iconBtn: React.CSSProperties = {
  border: ".5px solid var(--border)", background: "var(--surface)", borderRadius: 4, padding: "2px 5px",
  cursor: "pointer", color: "var(--text2)", fontSize: 12, lineHeight: 1,
};

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
    status: pendencia?.status ?? "aberta",
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
    <Modal open={open} onClose={onClose} title={pendencia ? "Editar ação" : "Nova ação"}>
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
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="aberta">A fazer</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvida">Concluído</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Dono</label>
          <input className="form-input" value={form.dono ?? ""} onChange={(e) => setForm({ ...form, dono: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Impacto</label>
          <input className="form-input" value={form.impacto ?? ""} onChange={(e) => setForm({ ...form, impacto: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Data de início</label>
          <input type="date" className="form-input" value={form.data_inicio ?? ""} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Data final</label>
          <input type="date" className="form-input" value={form.data_fim ?? ""} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
        </div>
        <div />
      </div>
      <div className="flex-end">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit}>{pendencia ? "Salvar" : "Adicionar"}</button>
      </div>
    </Modal>
  );
}
