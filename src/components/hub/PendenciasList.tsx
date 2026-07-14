import { useState } from "react";
import { useCreatePendencia, useDeletePendencia, useUpdatePendencia, usePendencias, type Pendencia } from "@/lib/hub-api";
import { Modal, ConfirmDialog } from "@/components/hub/Modal";

const FASE_LABEL: Record<string, string> = {
  comercial: "Comercial",
  preop: "Pré-viagem",
  viagem: "Viagem",
};

const STATUS_LABEL: Record<string, string> = {
  aberta: "A fazer",
  em_andamento: "Em andamento",
  resolvida: "Concluído",
};

const STATUS_META: Record<string, { color: string; bg: string; icon: string }> = {
  aberta: { color: "var(--text2)", bg: "var(--surface2)", icon: "ti-circle-dashed" },
  em_andamento: { color: "var(--blue)", bg: "var(--blue-light)", icon: "ti-progress" },
  resolvida: { color: "var(--teal)", bg: "var(--teal-light, var(--surface2))", icon: "ti-circle-check" },
};

const PRIO_META: Record<string, { label: string; color: string; bg: string }> = {
  critico: { label: "Crítica", color: "var(--accent)", bg: "var(--accent-light)" },
  alta: { label: "Alta", color: "var(--amber)", bg: "var(--amber-light)" },
  normal: { label: "Normal", color: "var(--text2)", bg: "var(--surface2)" },
};

export function PendenciasList({ fase, title }: { fase?: string; title?: string }) {
  const { data: all = [] } = usePendencias();
  const items = fase ? all.filter((p) => p.fase === fase) : all;
  const del = useDeletePendencia();
  const update = useUpdatePendencia();
  const [editing, setEditing] = useState<Pendencia | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const normStatus = (s: string) => (s === "em_andamento" || s === "resolvida" ? s : "aberta");
  const cycleStatus = (s: string) => (normStatus(s) === "aberta" ? "em_andamento" : normStatus(s) === "em_andamento" ? "resolvida" : "aberta");
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  const prioRank: Record<string, number> = { critico: 0, alta: 1, normal: 2 };
  const statusRank: Record<string, number> = { em_andamento: 0, aberta: 1, resolvida: 2 };
  const sorted = [...items].sort((a, b) => {
    const s = statusRank[normStatus(a.status)] - statusRank[normStatus(b.status)];
    if (s !== 0) return s;
    const p = (prioRank[a.prioridade] ?? 3) - (prioRank[b.prioridade] ?? 3);
    if (p !== 0) return p;
    const da = a.data_fim ?? "9999";
    const db = b.data_fim ?? "9999";
    return da.localeCompare(db);
  });

  const total = items.length;
  const done = items.filter((p) => p.status === "resolvida").length;
  const doing = items.filter((p) => p.status === "em_andamento").length;
  const todo = total - done - doing;

  return (
    <div className="main">
      <div className="flex-between mb-16">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="section-label" style={{ margin: 0 }}>
            {title ?? "Plano de ação"}
          </div>
          {total > 0 && (
            <div style={{ display: "flex", gap: 6, fontSize: 11, color: "var(--text3)" }}>
              <span style={pillStyle}>{todo} a fazer</span>
              <span style={{ ...pillStyle, color: "var(--blue)" }}>{doing} em andamento</span>
              <span style={{ ...pillStyle, color: "var(--teal)" }}>{done} concluído</span>
            </div>
          )}
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
        <div style={{ border: ".5px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", background: "var(--surface)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 820 }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: ".5px solid var(--border)" }}>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Atividade</th>
                  <th style={thStyle}>Responsável</th>
                  <th style={thStyle}>Data</th>
                  {!fase && <th style={thStyle}>Área</th>}
                  <th style={thStyle}>Priorização</th>
                  <th style={{ ...thStyle, width: 80 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const st = normStatus(p.status);
                  const stMeta = STATUS_META[st];
                  const prMeta = PRIO_META[p.prioridade] ?? PRIO_META.normal;
                  const isDone = st === "resolvida";
                  const borderL = p.prioridade === "critico" ? "var(--accent)" : p.prioridade === "alta" ? "var(--amber)" : "transparent";
                  return (
                    <tr key={p.id} style={{ borderBottom: ".5px solid var(--border)", opacity: isDone ? 0.6 : 1 }}>
                      <td style={{ ...tdStyle, borderLeft: `3px solid ${borderL}`, textAlign: "center" }}>
                        <button
                          title={`Marcar como ${STATUS_LABEL[cycleStatus(st)]}`}
                          onClick={() => update.mutate({ id: p.id, patch: { status: cycleStatus(st) } })}
                          style={{ ...chipStyle, color: stMeta.color, background: stMeta.bg, cursor: "pointer", border: ".5px solid var(--border)" }}
                        >
                          <i className={`ti ${stMeta.icon}`} style={{ fontSize: 11, marginRight: 4 }} />
                          {STATUS_LABEL[st]}
                        </button>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 13, fontWeight: 500, textDecoration: isDone ? "line-through" : "none", lineHeight: 1.35 }}>
                          {p.titulo}
                        </div>
                        {p.descricao && (
                          <div style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.4, marginTop: 2 }}>{p.descricao}</div>
                        )}
                        {p.impacto && (
                          <div style={{ fontSize: 10, color: "var(--text3)", fontStyle: "italic", marginTop: 3 }}>Impacto: {p.impacto}</div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", color: "var(--text2)" }}>
                        {p.dono || <span style={{ color: "var(--text3)" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", color: "var(--text2)", whiteSpace: "nowrap" }}>
                        {p.data_inicio || p.data_fim ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
                            {p.data_inicio && <span><i className="ti ti-calendar-event" style={{ fontSize: 10, marginRight: 3, color: "var(--text3)" }} />{fmt(p.data_inicio)}</span>}
                            {p.data_fim && <span><i className="ti ti-flag" style={{ fontSize: 10, marginRight: 3, color: "var(--text3)" }} />{fmt(p.data_fim)}</span>}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text3)" }}>—</span>
                        )}
                      </td>
                      {!fase && (
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <span style={chipStyle}>{FASE_LABEL[p.fase] ?? p.fase}</span>
                        </td>
                      )}
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <span style={{ ...chipStyle, color: prMeta.color, background: prMeta.bg }}>{prMeta.label}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <button title="Editar" onClick={() => setEditing(p)} style={iconBtn}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button title="Excluir" onClick={() => setConfirmDel(p.id)} style={iconBtn}>
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

const pillStyle: React.CSSProperties = {
  fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--surface2)",
  border: ".5px solid var(--border)", color: "var(--text2)", fontWeight: 500,
};

const thStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--text3)", textAlign: "center",
  padding: "9px 10px", textTransform: "uppercase", letterSpacing: 0.4,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 10px", verticalAlign: "middle",
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
