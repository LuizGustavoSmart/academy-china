import { useState } from "react";
import {
  DndContext, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  PASSO_LABELS, fmtBRL, respClass, respLabel,
  useCreateLead, useDeleteLead, useLeads, useParticipants, usePendencias,
  useUpdateLead, useUpdateParticipant, useCreateParticipant, type Lead, type Participant,
} from "@/lib/hub-api";
import { Modal } from "@/components/hub/Modal";
import { MensagensAccordion } from "@/components/hub/MensagensAccordion";
import { PendenciasList } from "@/components/hub/PendenciasList";

const STAGES = [1, 2, 3, 4, 5, 6, 7];

export function ComercialPage({ sub, onViewParticipant }: { sub: string; onViewParticipant?: (id: string) => void }) {
  if (sub === "leads") return <LeadsTab onViewParticipant={onViewParticipant} />;
  if (sub === "pipeline") return <PipelineTab onViewParticipant={onViewParticipant} />;
  if (sub === "mensagens") return <MensagensAccordion etapa="comercial" intro="As mensagens seguem a ordem cronológica do funil. Clique em cada passo para ver os scripts." />;
  if (sub === "pendencias") return <PendenciasList fase="comercial" title="Pendências — funil comercial" />;
  return <ComercialDash />;
}

function ComercialDash() {
  const { data: leads = [] } = useLeads();
  const { data: parts = [] } = useParticipants();
  const { data: pendencias = [] } = usePendencias();
  const ativo = leads.filter((l) => l.passo >= 2 && l.passo <= 5).length;
  const vagas = parts.filter((p) => p.pagamento_status === "confirmado").length;
  const pendOpen = pendencias.filter((p) => p.fase === "comercial" && p.status !== "resolvida").length;
  return (
    <div className="main">
      <div className="metrics">
        <Metric icon="ti-users" label="Total de leads" value={String(leads.length)} sub="no funil" />
        <Metric icon="ti-check" label="Vagas confirmadas" value={String(vagas)} sub="de 20–25" cls="metric-ok" />
        <Metric icon="ti-trending-up" label="Em negociação" value={String(ativo)} sub="passos 2 a 5" cls="metric-warn" />
        <Metric icon="ti-currency-dollar" label="Ticket médio" value={fmtBRL(107250)} sub="R$ 99k–R$ 115,5k" />
        <Metric icon="ti-alert-circle" label="Pendências" value={String(pendOpen)} sub="para operacionalizar" cls="metric-danger" />
      </div>
      <div className="nota-critica">
        <strong><i className="ti ti-alert-triangle" /> Risco principal:</strong> O gatilho de escassez do P5 só funciona com controle de vagas em tempo real.
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub, cls }: any) {
  return (
    <div className="metric-card">
      <div className="metric-label"><i className={`ti ${icon}`} />{label}</div>
      <div className={`metric-value ${cls ?? ""}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function LeadsTab({ onViewParticipant }: { onViewParticipant?: (id: string) => void }) {
  const { data: leads = [] } = useLeads();
  const { data: participants = [] } = useParticipants();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [editingPart, setEditingPart] = useState<Participant | null>(null);
  const leadNames = new Set(leads.map((l) => l.nome.toLowerCase().trim()));
  const orphanParticipants = participants.filter((p) => !leadNames.has(p.nome.toLowerCase().trim()));
  return (
    <div className="main">
      <div className="flex-between mb-16">
        <div className="section-label" style={{ margin: 0 }}>Todos os leads</div>
        <button className="btn-primary" onClick={() => setCreating(true)} style={{ fontSize: 12, padding: "7px 14px" }}><i className="ti ti-plus" /> Novo lead</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Empresa</th><th>Cidade</th><th>Passo</th><th>Responsável</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {leads.length === 0 && orphanParticipants.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 16 }}>Nenhum lead cadastrado.</td></tr>}
            {leads.map((l) => (
              <tr key={l.id}>
                <td><button className="p-link" onClick={() => setEditing(l)}>{l.nome}</button></td>
                <td>{l.empresa ?? "—"}</td><td>{l.cidade ?? "—"}</td>
                <td>{PASSO_LABELS[l.passo]}</td>
                <td><span className={`badge ${respClass(l.responsavel).replace("resp-","badge-").replace("badge-ambos","badge-ok").replace("badge-roque","badge-neutral").replace("badge-caetano","badge-blue")}`}>{respLabel(l.responsavel)}</span></td>
                <td><span className="badge badge-warn">{l.status ?? "—"}</span></td>
                <td><button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setEditing(l)}><i className="ti ti-pencil" /></button></td>
              </tr>
            ))}
            {orphanParticipants.map((p) => (
              <tr key={`part-${p.id}`} style={{ opacity: 0.85 }}>
                <td><button className="p-link" onClick={() => onViewParticipant ? onViewParticipant(p.id) : setEditingPart(p)}>{p.nome}</button></td>
                <td>{p.empresa ?? "—"}</td><td>{p.cidade ?? "—"}</td>
                <td>{PASSO_LABELS[7]}</td>
                <td><span className="badge badge-blue">Caetano</span></td>
                <td><span className="badge badge-ok">Confirmado</span></td>
                <td><button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setEditingPart(p)}><i className="ti ti-pencil" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <LeadModal open onClose={() => setCreating(false)} />}
      {editing && <LeadModal open onClose={() => setEditing(null)} lead={editing} />}
      {editingPart && <OrphanEditModal participant={editingPart} onClose={() => setEditingPart(null)} />}
    </div>
  );
}

function PipelineTab({ onViewParticipant }: { onViewParticipant?: (id: string) => void }) {
  const { data: leads = [] } = useLeads();
  const { data: participants = [] } = useParticipants();
  const update = useUpdateLead();
  const createLead = useCreateLead();
  const del = useDeleteLead();
  const [modalStage, setModalStage] = useState<number | null>(null);
  const [promoteLead, setPromoteLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editingOrphan, setEditingOrphan] = useState<Participant | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const leadNames = new Set(leads.map((l) => l.nome.toLowerCase().trim()));
  const orphanParticipants = participants.filter((p) => !leadNames.has(p.nome.toLowerCase().trim()));

  const onDragEnd = (e: DragEndEvent) => {
    const rawId = String(e.active.id);
    const targetStage = e.over?.id != null ? Number(e.over.id) : null;
    if (!targetStage) return;
    if (rawId.startsWith("part-")) {
      const partId = rawId.slice(5);
      const part = orphanParticipants.find((p) => p.id === partId);
      if (!part) return;
      createLead.mutate({ nome: part.nome, cargo: part.cargo, empresa: part.empresa, cidade: part.cidade, passo: targetStage, responsavel: "caetano", status: "abordado", ordem: 0 });
      return;
    }
    const lead = leads.find((l) => l.id === rawId);
    if (!lead || lead.passo === targetStage) return;
    update.mutate({ id: rawId, patch: { passo: targetStage } });
    if (targetStage === 7) setPromoteLead(lead);
  };

  return (
    <div className="main">
      <div className="flex-between mb-16">
        <div className="section-label" style={{ margin: 0 }}>Pipeline visual</div>
        <button className="btn-primary" onClick={() => setModalStage(1)} style={{ fontSize: 12, padding: "7px 14px" }}><i className="ti ti-plus" /> Novo lead</button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="pipeline-scroll">
          <div className="pipeline-track">
            {STAGES.map((s) => (
              <Stage key={s} stage={s} leads={leads.filter((l) => l.passo === s)} orphanParticipants={s === 7 ? orphanParticipants : []}
                onAdd={() => setModalStage(s)} onDelete={(id) => del.mutate(id)}
                onEdit={(lead) => setEditingLead(lead)}
                onEditOrphan={(p) => onViewParticipant ? onViewParticipant(p.id) : setEditingOrphan(p)}
              />
            ))}
          </div>
        </div>
      </DndContext>
      {modalStage !== null && <LeadModal open onClose={() => setModalStage(null)} initialPasso={modalStage} />}
      {editingLead && <LeadModal open onClose={() => setEditingLead(null)} lead={editingLead} />}
      {editingOrphan && <OrphanEditModal participant={editingOrphan} onClose={() => setEditingOrphan(null)} />}
      {promoteLead && <PromoteToParticipantModal lead={promoteLead} onClose={() => setPromoteLead(null)} />}
    </div>
  );
}

function Stage({ stage, leads, orphanParticipants = [], onAdd, onDelete, onEdit, onEditOrphan }: { stage: number; leads: Lead[]; orphanParticipants?: Participant[]; onAdd: () => void; onDelete: (id: string) => void; onEdit?: (lead: Lead) => void; onEditOrphan?: (p: Participant) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const totalCount = leads.length + orphanParticipants.length;
  return (
    <div className={`pipeline-stage s${stage}`}>
      <div className="stage-header"><div className="stage-name">{PASSO_LABELS[stage]}</div><div className="stage-count">{totalCount}</div></div>
      <div ref={setNodeRef} className={`stage-body${isOver ? " drop-over" : ""}`}>
        {leads.map((l) => <LeadCard key={l.id} lead={l} onDelete={() => onDelete(l.id)} onEdit={onEdit ? () => onEdit(l) : undefined} />)}
        {orphanParticipants.map((p) => <OrphanCard key={`part-${p.id}`} participant={p} onEdit={onEditOrphan ? () => onEditOrphan(p) : undefined} />)}
        {leads.length === 0 && orphanParticipants.length === 0 && stage === 6 && <div style={{ fontSize: 11, color: "var(--accent)", padding: 6, display: "flex", alignItems: "center", gap: 4 }}><i className="ti ti-lock" /> Pendente política</div>}
        <button className="add-lead" onClick={onAdd}><i className="ti ti-plus" /> adicionar</button>
      </div>
    </div>
  );
}

function LeadCard({ lead, onDelete, onEdit }: { lead: Lead; onDelete: () => void; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} {...attributes} className={`lead-card${isDragging ? " dragging" : ""}`} style={style}>
      <div className="lead-card-handle" {...listeners} title="Arrastar para outra etapa"><i className="ti ti-grip-vertical" /></div>
      <button className="lead-card-del" onClick={(e) => { e.stopPropagation(); onDelete(); }} onPointerDown={(e) => e.stopPropagation()} title="Excluir"><i className="ti ti-x" /></button>
      <div style={{ fontSize: 12, fontWeight: 500, paddingLeft: 16 }}>
        {onEdit ? <button className="p-link" style={{ fontSize: 12 }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(); }}>{lead.nome}</button> : lead.nome}
      </div>
      <div className="lead-meta">{[lead.cargo, lead.cidade].filter(Boolean).join(" · ") || "—"}</div>
      <span className={`lead-resp ${respClass(lead.responsavel)}`}><i className="ti ti-user" style={{ fontSize: 10 }} /> {respLabel(lead.responsavel)}</span>
    </div>
  );
}

function OrphanCard({ participant: p, onEdit }: { participant: Participant; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `part-${p.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} {...attributes} className={`lead-card${isDragging ? " dragging" : ""}`} style={{ ...style, borderLeft: "3px solid var(--teal)" }}>
      <div className="lead-card-handle" {...listeners} title="Arrastar para outra etapa"><i className="ti ti-grip-vertical" /></div>
      <div style={{ fontSize: 12, fontWeight: 500, paddingLeft: 16 }}>
        {onEdit ? <button className="p-link" style={{ fontSize: 12 }} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(); }}>{p.nome}</button> : p.nome}
      </div>
      <div className="lead-meta">{[p.empresa, p.cidade].filter(Boolean).join(" · ") || "—"}</div>
      <span className="badge badge-ok" style={{ fontSize: 10, marginTop: 4 }}>Confirmado</span>
    </div>
  );
}

function OrphanEditModal({ participant, onClose }: { participant: Participant; onClose: () => void }) {
  const update = useUpdateParticipant();
  const [form, setForm] = useState({ nome: participant.nome, cargo: participant.cargo ?? "", empresa: participant.empresa ?? "", cidade: participant.cidade ?? "", telefone: participant.telefone ?? "", email: participant.email ?? "" });
  const submit = () => { if (!form.nome.trim()) return; update.mutate({ id: participant.id, patch: form }, { onSuccess: onClose }); };
  return (
    <Modal open onClose={onClose} title={`Editar — ${participant.nome}`}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group" style={{ gridColumn: "span 2" }}><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Cargo</label><input className="form-input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Empresa</label><input className="form-input" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
      </div>
      <div className="flex-end"><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={submit}>Salvar</button></div>
    </Modal>
  );
}

function LeadModal({ open, onClose, initialPasso, lead }: { open: boolean; onClose: () => void; initialPasso?: number; lead?: Lead }) {
  const create = useCreateLead();
  const update = useUpdateLead();
  const [form, setForm] = useState({ nome: lead?.nome ?? "", cargo: lead?.cargo ?? "", empresa: lead?.empresa ?? "", cidade: lead?.cidade ?? "", passo: lead?.passo ?? initialPasso ?? 1, responsavel: lead?.responsavel ?? "caetano", status: lead?.status ?? "abordado", observacoes: lead?.observacoes ?? "" });
  const submit = () => {
    if (!form.nome.trim()) return;
    if (lead) { update.mutate({ id: lead.id, patch: form }, { onSuccess: onClose }); } else { create.mutate(form, { onSuccess: onClose }); }
  };
  return (
    <Modal open={open} onClose={onClose} title={lead ? "Editar lead" : "Novo lead"}>
      <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group"><label className="form-label">Cargo</label><input className="form-input" value={form.cargo ?? ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Empresa</label><input className="form-input" value={form.empresa ?? ""} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Passo</label><select className="form-select" value={form.passo} onChange={(e) => setForm({ ...form, passo: Number(e.target.value) })}>{STAGES.map((s) => <option key={s} value={s}>{PASSO_LABELS[s]}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Responsável</label><select className="form-select" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })}><option value="roque">Roque</option><option value="caetano">Caetano</option><option value="ambos">Caetano + Roque</option></select></div>
        <div className="form-group"><label className="form-label">Status</label><input className="form-input" value={form.status ?? ""} onChange={(e) => setForm({ ...form, status: e.target.value })} /></div>
      </div>
      <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" style={{ minHeight: 80 }} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      <div className="flex-end"><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={submit}>{lead ? "Salvar" : "Adicionar"}</button></div>
    </Modal>
  );
}

function PromoteToParticipantModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const create = useCreateParticipant();
  const [form, setForm] = useState({ nome: lead.nome, cargo: lead.cargo ?? "", empresa: lead.empresa ?? "", cidade: lead.cidade ?? "", telefone: "", email: "", restricoes_alimentares: "", tier: "standard", valor_pago: 93600, pagamento_status: "confirmado" as const, contrato_status: "assinado" as const, status: "em_andamento" });
  return (
    <Modal open onClose={onClose} title={`Promover ${lead.nome} a participante`}>
      <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14 }}>O lead foi movido para P7. Complete os dados para criar o registro de participante confirmado.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Nome *" v={form.nome} on={(v) => setForm({ ...form, nome: v })} />
        <Field label="Cargo" v={form.cargo} on={(v) => setForm({ ...form, cargo: v })} />
        <Field label="Empresa" v={form.empresa} on={(v) => setForm({ ...form, empresa: v })} />
        <Field label="Cidade" v={form.cidade} on={(v) => setForm({ ...form, cidade: v })} />
        <Field label="WhatsApp" v={form.telefone} on={(v) => setForm({ ...form, telefone: v })} />
        <Field label="E-mail" v={form.email} on={(v) => setForm({ ...form, email: v })} />
        <div className="form-group"><label className="form-label">Tier</label><select className="form-select" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value, valor_pago: e.target.value === "premium" ? 109200 : 93600 })}><option value="standard">Cliente Matter (R$ 93.600)</option><option value="premium">Standard (R$ 109.200)</option></select></div>
        <div className="form-group"><label className="form-label">Valor (R$)</label><input className="form-input" type="number" value={form.valor_pago} onChange={(e) => setForm({ ...form, valor_pago: Number(e.target.value) })} /></div>
      </div>
      <div className="flex-end">
        <button className="btn-secondary" onClick={onClose}>Manter só como lead</button>
        <button className="btn-primary" onClick={() => create.mutate(form, { onSuccess: onClose })}>Criar participante</button>
      </div>
    </Modal>
  );
}

function Field({ label, v, on }: { label: string; v: string; on: (s: string) => void }) {
  return <div className="form-group"><label className="form-label">{label}</label><input className="form-input" value={v} onChange={(e) => on(e.target.value)} /></div>;
}
