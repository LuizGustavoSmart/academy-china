import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  PASSO_LABELS, STAGE_CONFIRMADO, STAGE_CONTRATO, STAGE_NEGOCIACAO, STAGE_ORDER, NEGOTIATION_STAGES, passoLabel, pipelineStage,
  fmtBRL, normalizeStatus, statusLabel, statusBadgeClass, isDeclined, isConfirmedLead, STATUS_OPTIONS, respAvatar,
  useCreateLead, useDeleteLead, useLeads, useParticipants, usePendencias, useResponsaveis,
  useSetLeadResponsaveis, useUpdateLead, useUpdateParticipant, useCreateLeadActivity,
  useCreateResponsavel,
  type Lead, type Participant,
} from "@/lib/hub-api";
import { Modal, ConfirmDialog } from "@/components/hub/Modal";
import { MensagensAccordion } from "@/components/hub/MensagensAccordion";
import { PendenciasList } from "@/components/hub/PendenciasList";
import { EditableField } from "@/components/hub/Editable";
import { ResponsavelSelect, ResponsavelTags } from "@/components/hub/ResponsavelSelect";
import { LeadTimeline } from "@/components/hub/LeadTimeline";

// Etapas ativas do funil, na ordem visual (STAGE_ORDER — não é a mesma coisa que o
// valor numérico de `passo`). "Declinado" não é uma etapa: é um status que retira o lead do funil.
const STAGES = STAGE_ORDER;
const stageRank = (s: number) => { const i = STAGE_ORDER.indexOf(pipelineStage(s)); return i === -1 ? 999 : i; };
const etapaLabel = (stage: number) => stage === -1 ? "Declinado" : passoLabel(stage).replace(/^P\d+\s*—\s*/, "");

export function ComercialPage({ sub, onViewParticipant }: { sub: string; onViewParticipant?: (id: string) => void }) {
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  useEnsureDefaultResponsaveis();
  // Trocar de sub-aba (Leads/Pipeline/Dashboard…) fecha o detalhamento aberto.
  useEffect(() => { setOpenLeadId(null); }, [sub]);
  if (openLeadId) return <LeadDetail id={openLeadId} onBack={() => setOpenLeadId(null)} />;
  if (sub === "leads") return <LeadsTab onOpenLead={setOpenLeadId} onViewParticipant={onViewParticipant} />;
  if (sub === "pipeline") return <PipelineTab onOpenLead={setOpenLeadId} onViewParticipant={onViewParticipant} />;
  if (sub === "mensagens") return <MensagensAccordion etapa="comercial" intro="As mensagens seguem a ordem cronológica do funil. Clique em cada passo para ver os scripts." />;
  if (sub === "pendencias") return <PendenciasList fase="comercial" title="Pendências — funil comercial" />;
  return <ComercialDash />;
}

/** Garante que os responsáveis históricos (Caetano, Roque) existam. Roda só quando a
 * tabela existe e está vazia — nunca sobrescreve o que já foi cadastrado. */
function useEnsureDefaultResponsaveis() {
  const { data: responsaveis, isSuccess } = useResponsaveis();
  const create = useCreateResponsavel();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !isSuccess || (responsaveis?.length ?? 0) > 0) return;
    done.current = true;
    ["Caetano", "Roque"].forEach((nome) => create.mutate(nome));
  }, [isSuccess, responsaveis?.length]);
}

function ComercialDash() {
  const { data: leads = [] } = useLeads();
  const { data: participants = [] } = useParticipants();
  const { data: pendencias = [] } = usePendencias();
  // Métricas espelham exatamente a contagem das colunas do Pipeline:
  // usam pipelineStage(passo) e excluem apenas declinados; Contrato ainda
  // soma participantes órfãos (sem lead correspondente), como na coluna P7.
  const naoDeclinados = leads.filter((l) => !isDeclined(l));
  const inStage = (s: number) => naoDeclinados.filter((l) => pipelineStage(l.passo) === s).length;
  const leadNames = new Set(leads.map((l) => l.nome.toLowerCase().trim()));
  const orphanParticipants = participants.filter((p) => !leadNames.has(p.nome.toLowerCase().trim()));
  const declinados = leads.filter(isDeclined);
  const confirmados = inStage(STAGE_CONFIRMADO);
  const contratos = inStage(STAGE_CONTRATO) + orphanParticipants.length;
  const emNegociacao = naoDeclinados.filter((l) => NEGOTIATION_STAGES.includes(pipelineStage(l.passo))).length;
  const ativos = naoDeclinados.length;
  const pendOpen = pendencias.filter((p) => p.fase === "comercial" && p.status !== "resolvida").length;
  return (
    <div className="main">
      <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))" }}>
        <Metric icon="ti-users" label="Leads ativos" value={String(ativos)} sub="ainda no funil comercial" />
        <Metric icon="ti-trending-up" label="Em negociação" value={String(emNegociacao)} sub="etapa Negociação" cls="metric-warn" />
        <Metric icon="ti-check" label="Confirmados" value={String(confirmados)} sub="coluna P6 do pipeline" cls="metric-ok" />
        <Metric icon="ti-file-text" label="Contratos" value={String(contratos)} sub="coluna P7 do pipeline" cls="metric-warn" />
        <Metric icon="ti-user-x" label="Leads declinados" value={String(declinados.length)} sub="recusaram / desistiram" cls="metric-danger" />
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

// ══════════════════════════ LEADS (tabela + filtros) ══════════════════════════
type View = "ativos" | "confirmados" | "declinados" | "todos";
type Sort = "recent" | "old" | "nome" | "empresa" | "passo";
const isConfirmedCommercialLead = (lead: Lead) => isConfirmedLead(lead);

function LeadsTab({ onOpenLead, onViewParticipant }: { onOpenLead: (id: string) => void; onViewParticipant?: (id: string) => void }) {
  const { data: leads = [] } = useLeads();
  const { data: participants = [] } = useParticipants();
  const { data: responsaveis = [] } = useResponsaveis();
  const [creating, setCreating] = useState(false);
  const [editingPart, setEditingPart] = useState<Participant | null>(null);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);
  const createLead = useCreateLead();

  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("ativos");
  const [fPasso, setFPasso] = useState<string>("all");
  const [fResp, setFResp] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const leadNames = new Set(leads.map((l) => l.nome.toLowerCase().trim()));
  const orphanParticipants = participants.filter((p) => !leadNames.has(p.nome.toLowerCase().trim()));

  // Auto-provisiona leads para participantes órfãos (ex.: vindos do formulário público)
  // para que apareçam editáveis na mesma linha que os demais confirmados.
  const provisioning = useRef<Set<string>>(new Set());
  useEffect(() => {
    orphanParticipants.forEach((p) => {
      if (provisioning.current.has(p.id)) return;
      provisioning.current.add(p.id);
      createLead.mutate({
        nome: p.nome,
        empresa: p.empresa ?? "",
        email: p.email ?? "",
        telefone: p.telefone ?? "",
        cidade: p.cidade ?? "",
        cargo: p.cargo ?? "",
        passo: STAGE_CONFIRMADO,
        status: "em_negociacao",
        cadastrado_por: p.origem ?? "Formulário",
      });
    });
  }, [orphanParticipants.map((p) => p.id).join(",")]);

  const term = q.trim().toLowerCase();
  const matchText = (fields: (string | null | undefined)[]) =>
    !term || fields.some((f) => (f ?? "").toLowerCase().includes(term));

  const declinedCount = leads.filter(isDeclined).length;
  const confirmedLeads = leads.filter(isConfirmedCommercialLead);
  const confirmedCount = confirmedLeads.length + orphanParticipants.length;

  const rows = useMemo(() => {
    let r = leads.slice();
    if (view === "ativos") r = r.filter((l) => !isDeclined(l) && !isConfirmedCommercialLead(l));
    else if (view === "confirmados") r = r.filter(isConfirmedCommercialLead);
    else if (view === "declinados") r = r.filter(isDeclined);
    r = r.filter((l) => matchText([l.nome, l.empresa, l.email, l.telefone, l.cargo, l.cidade]));
    if (fPasso !== "all") r = Number(fPasso) === DECLINADO_COL
      ? r.filter(isDeclined)
      : r.filter((l) => !isDeclined(l) && pipelineStage(l.passo) === Number(fPasso));
    if (fResp !== "all") r = r.filter((l) => (l.responsaveis ?? []).some((x) => x.id === fResp));
    const cmp: Record<Sort, (a: Lead, b: Lead) => number> = {
      recent: (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      old: (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      empresa: (a, b) => (a.empresa ?? "").localeCompare(b.empresa ?? "", "pt-BR"),
      // Ordena pela posição visual no funil, não pelo valor numérico bruto de `passo`
      // (Negociação usa um valor alto, 9, mas aparece entre Qualificação e Mapa enviado).
      passo: (a, b) => stageRank(a.passo) - stageRank(b.passo),
    };
    return r.sort(cmp[sort]);
  }, [leads, view, term, fPasso, fResp, sort]);

  // Participantes sem lead correspondente entram apenas na seção Confirmados (e em Todos).
  const showOrphans = view === "confirmados" || view === "todos";
  const orphanRows = orphanParticipants.filter((p) => matchText([p.nome, p.empresa, p.email, p.telefone, p.cargo, p.cidade]));
  const totalShown = rows.length + (showOrphans ? orphanRows.length : 0);
  const assigningLead = assigningLeadId ? leads.find((l) => l.id === assigningLeadId) ?? null : null;

  return (
    <div className="main main-wide">
      <div className="flex-between mb-16">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="section-label" style={{ margin: 0 }}>{view === "confirmados" ? "Confirmados" : "Todos os leads"}</div>
          <span className="count-chip">{totalShown}</span>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)} style={{ fontSize: 12, padding: "7px 14px" }}><i className="ti ti-plus" /> Novo lead</button>
      </div>

      <div className="filters-bar">
        <div className="filters-search">
          <i className="ti ti-search" />
          <input placeholder="Buscar por nome, empresa, e-mail, telefone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="filters-seg">
          <button className={view === "ativos" ? "active" : ""} onClick={() => setView("ativos")}>Ativos</button>
          <button className={view === "confirmados" ? "active" : ""} onClick={() => setView("confirmados")}>Confirmados{confirmedCount ? ` (${confirmedCount})` : ""}</button>
          <button className={view === "declinados" ? "active" : ""} onClick={() => setView("declinados")}>Declinados{declinedCount ? ` (${declinedCount})` : ""}</button>
          <button className={view === "todos" ? "active" : ""} onClick={() => setView("todos")}>Todos</button>
        </div>
        <select className="filters-select" value={fPasso} onChange={(e) => setFPasso(e.target.value)}>
          <option value="all">Todas as etapas</option>
          {STAGES.map((s) => <option key={s} value={s}>{etapaLabel(s)}</option>)}
          <option value={DECLINADO_COL}>Declinado</option>
        </select>
        <select className="filters-select" value={fResp} onChange={(e) => setFResp(e.target.value)}>
          <option value="all">Todos os responsáveis</option>
          {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
        <select className="filters-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recent">Mais recentes</option>
          <option value="old">Mais antigos</option>
          <option value="nome">Nome (A–Z)</option>
          <option value="empresa">Empresa (A–Z)</option>
          <option value="passo">Etapa</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Nome</th><th>Empresa</th><th>Email</th><th>Telefone</th><th>Cidade</th><th>Etapa</th><th>Cadastrado por</th><th>Responsável</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && (!showOrphans || orphanRows.length === 0) && <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--text3)", padding: 16 }}>Nenhum lead encontrado com os filtros atuais.</td></tr>}
            {rows.map((l) => (
              <tr key={l.id} style={isDeclined(l) ? { opacity: 0.7 } : undefined}>
                <td style={{ fontSize: 11, color: "var(--text2)" }}>{l.created_at ? new Date(l.created_at).toLocaleDateString("pt-BR") : "—"}</td>
                <td><button className="p-link" onClick={() => onOpenLead(l.id)}>{l.nome}</button></td>
                <td>{l.empresa ?? "—"}</td>
                <td>{l.email ?? "—"}</td>
                <td>{l.telefone ?? "—"}</td>
                <td>{l.cidade ?? "—"}</td>
                <td><PassoInlineSelect lead={l} /></td>
                <td>{l.cadastrado_por ?? "—"}</td>
                <td>
                  <button
                    type="button"
                    className="quick-resp-trigger"
                    onClick={() => setAssigningLeadId(l.id)}
                    aria-label={`Alterar responsáveis de ${l.nome}`}
                  >
                    {(l.responsaveis?.length ?? 0) > 0
                      ? <ResponsavelTags responsaveis={l.responsaveis} />
                      : <span className="quick-resp-empty"><i className="ti ti-user-plus" /> Atribuir</span>}
                    <i className="ti ti-chevron-down" />
                  </button>
                </td>
                <td><button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => onOpenLead(l.id)}><i className="ti ti-pencil" /></button></td>
              </tr>
            ))}
            {showOrphans && orphanRows.map((p) => (
              <tr key={`part-${p.id}`} style={{ opacity: 0.85 }}>
                <td style={{ fontSize: 11, color: "var(--text2)" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</td>
                <td><button className="p-link" onClick={() => onViewParticipant ? onViewParticipant(p.id) : setEditingPart(p)}>{p.nome}</button></td>
                <td>{p.empresa ?? "—"}</td>
                <td>{p.email ?? "—"}</td>
                <td>{p.telefone ?? "—"}</td>
                <td>{p.cidade ?? "—"}</td>
                <td><span className="badge badge-ok">{etapaLabel(6)}</span></td>
                <td>—</td>
                <td><span style={{ fontSize: 11, color: "var(--text3)" }}>—</span></td>
                <td><button className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => setEditingPart(p)}><i className="ti ti-pencil" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <LeadModal open onClose={() => setCreating(false)} />}
      {editingPart && <OrphanEditModal participant={editingPart} onClose={() => setEditingPart(null)} />}
      {assigningLead && <ResponsavelQuickModal lead={assigningLead} onClose={() => setAssigningLeadId(null)} />}
    </div>
  );
}

/** Etapa do funil editável direto na linha da tabela — sem precisar abrir o detalhamento. */
function PassoInlineSelect({ lead }: { lead: Lead }) {
  const update = useUpdateLead();
  const [open, setOpen] = useState(false);
  const currentStage = pipelineStage(lead.passo);
  const declined = isDeclined(lead);
  const options = STAGES.includes(currentStage) ? STAGES : [...STAGES, currentStage];
  const selected = declined ? DECLINADO_COL : currentStage;
  const color = COL_COLOR[selected] ?? "var(--border)";
  const choose = (passo: number) => {
    setOpen(false);
    if (passo === DECLINADO_COL) { update.mutate({ id: lead.id, patch: { status: "declinado" } }); return; }
    update.mutate({ id: lead.id, patch: { passo, ...(declined ? { status: "abordado" } : {}) } });
  };
  return (
    <div style={{ position: "relative", minWidth: 126 }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7, border: `1px solid ${color}`, color, background: `${color}14`, borderRadius: 999, padding: "5px 8px 5px 9px", fontSize: 11, fontWeight: 600, cursor: "pointer", lineHeight: 1 }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{etapaLabel(selected)}</span>
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 13 }} />
      </button>
      {open && <div role="listbox" style={{ position: "absolute", zIndex: 30, top: "calc(100% + 6px)", left: 0, minWidth: 184, padding: 5, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface, #fff)", boxShadow: "0 12px 28px rgba(20,30,45,.18)" }}>
        {[DECLINADO_COL, ...options].map((stage) => {
          const stageColor = COL_COLOR[stage] ?? "var(--text2)";
          const active = stage === selected;
          return <button key={stage} type="button" role="option" aria-selected={active} onClick={() => choose(stage)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", border: 0, borderRadius: 7, background: active ? `${stageColor}18` : "transparent", color: stageColor, fontSize: 11, fontWeight: active ? 700 : 500, textAlign: "left", cursor: "pointer" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: stageColor, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{etapaLabel(stage)}</span>
            {active && <i className="ti ti-check" style={{ fontSize: 13 }} />}
          </button>;
        })}
      </div>}
    </div>
  );
}

/** Status editável na linha. Declinar pede confirmação porque o lead sai da visão ativa. */
function StatusInlineSelect({ lead, hasParticipant, onPromotionRequired }: { lead: Lead; hasParticipant: boolean; onPromotionRequired: () => void }) {
  const update = useUpdateLead();
  const addActivity = useCreateLeadActivity();
  const [confirmDecline, setConfirmDecline] = useState(false);
  const current = normalizeStatus(lead.status);
  const options = STATUS_OPTIONS.some((o) => o.value === current)
    ? STATUS_OPTIONS
    : [{ value: current, label: statusLabel(current) }, ...STATUS_OPTIONS];

  const applyStatus = (next: string) => {
    if (next === current) return;
    const patch: Partial<Lead> = { status: next };
    if (next === "confirmado") patch.passo = STAGE_CONFIRMADO;
    update.mutate(
      { id: lead.id, patch },
      {
        onSuccess: () => {
          const action = current === "declinado"
            ? `Lead reativado como ${statusLabel(next)} em ${passoLabel(patch.passo ?? lead.passo)}.`
            : `Status alterado de ${statusLabel(current)} para ${statusLabel(next)}.`;
          addActivity.mutate({ lead_id: lead.id, conteudo: action, autor: "Sistema", tipo: "status" });
        },
      },
    );
  };

  const decline = () => {
    update.mutate(
      { id: lead.id, patch: { status: "declinado" } },
      {
        onSuccess: () => addActivity.mutate({
          lead_id: lead.id,
          conteudo: `Lead declinado em ${passoLabel(lead.passo)}.`,
          autor: "Sistema",
          tipo: "status",
        }),
      },
    );
  };

  return (
    <>
      <select
        className={`quick-status-select ${statusBadgeClass(current)}`}
        value={current}
        disabled={update.isPending}
        aria-label={`Alterar status de ${lead.nome}`}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "declinado") setConfirmDecline(true);
          else applyStatus(next);
        }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ConfirmDialog
        open={confirmDecline}
        onClose={() => setConfirmDecline(false)}
        onConfirm={decline}
        title="Declinar este lead?"
        message={`${lead.nome} sairá da lista de ativos e irá para a coluna “Declinado” do pipeline. A etapa ${passoLabel(lead.passo)} será preservada para uma possível reativação.`}
        confirmLabel="Sim, declinar"
        icon="ti-user-x"
      />
    </>
  );
}

/** Modal compacto de atribuição, aberto diretamente pela coluna Responsável. */
function ResponsavelQuickModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const setResp = useSetLeadResponsaveis();
  const addActivity = useCreateLeadActivity();
  const [ids, setIds] = useState(() => (lead.responsaveis ?? []).map((r) => r.id));
  const [error, setError] = useState("");
  const before = (lead.responsaveis ?? []).map((r) => r.id).sort().join(",");
  const after = [...ids].sort().join(",");
  const changed = before !== after;
  const initials = lead.nome.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const submit = async () => {
    setError("");
    try {
      await setResp.mutateAsync({ leadId: lead.id, responsavelIds: ids });
      addActivity.mutate({
        lead_id: lead.id,
        conteudo: ids.length ? "Responsáveis do lead atualizados." : "Lead ficou sem responsável.",
        autor: "Sistema",
        tipo: "responsavel",
      });
      onClose();
    } catch {
      setError("Não foi possível salvar os responsáveis. Tente novamente.");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Alterar responsável"
      description="Selecione uma ou mais pessoas para cuidar deste lead."
      icon="ti-user-edit"
      size="sm"
    >
      <div className="quick-lead-context">
        <span className="quick-lead-avatar">{initials || "?"}</span>
        <span>
          <strong>{lead.nome}</strong>
          <small>{[lead.cargo, lead.empresa].filter(Boolean).join(" · ") || "Lead comercial"}</small>
        </span>
      </div>
      <div className="form-group">
        <label className="form-label">Responsáveis pelo lead</label>
        <ResponsavelSelect value={ids} onChange={setIds} inlineMenu />
        <p className="form-help"><i className="ti ti-bulb" /> Se o nome não existir, digite-o e clique em “+ Novo responsável”.</p>
      </div>
      {error && <div className="modal-inline-error"><i className="ti ti-alert-circle" /> {error}</div>}
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={() => void submit()} disabled={!changed || setResp.isPending}>
          {setResp.isPending ? <i className="ti ti-loader-2 modal-spinner" /> : <i className="ti ti-check" />}
          Salvar responsáveis
        </button>
      </div>
    </Modal>
  );
}

// ══════════════════════════ PIPELINE (kanban estilo pré-viagem) ══════════════════════════
// "Declinado" vem primeiro. P3/P4/P5 foram consolidados em Negociação: registros históricos
// continuam visíveis nessa coluna e são normalizados para P9 quando movimentados.
const DECLINADO_COL = -1;
const PIPE_COLS = [DECLINADO_COL, ...STAGE_ORDER];
const COL_COLOR: Record<number, string> = {
  [DECLINADO_COL]: "#c0392b",
  0: "#52b788", 1: "#5c6470", 2: "#534ab7",
  [STAGE_NEGOCIACAO]: "#c77d2e", 6: "#0f6e56", 7: "#d85a30",
};
const COL_ICON: Record<number, string> = {
  [DECLINADO_COL]: "ti-user-x",
  0: "ti-user-plus", 1: "ti-phone-call", 2: "ti-list-check",
  [STAGE_NEGOCIACAO]: "ti-messages", 6: "ti-circle-check", 7: "ti-file-text",
};
const COL_NAME: Record<number, string> = {
  [DECLINADO_COL]: "Declinado",
  0: "Cadastro", 1: "Abordagem", 2: "Qualificação",
  [STAGE_NEGOCIACAO]: "Negociação", 6: "Confirmado", 7: "Contrato",
};
const COL_CODE: Record<number, string> = {
  [DECLINADO_COL]: "encerrado",
  0: "P0", 1: "P1", 2: "P2",
  [STAGE_NEGOCIACAO]: "após P2", 6: "P6", 7: "P7",
};
const COLLAPSE_KEY = "comercial_pipe_collapsed";

function PipelineTab({ onOpenLead, onViewParticipant }: { onOpenLead: (id: string) => void; onViewParticipant?: (id: string) => void }) {
  const { data: leads = [] } = useLeads();
  const { data: participants = [] } = useParticipants();
  const update = useUpdateLead();
  const createLead = useCreateLead();
  const del = useDeleteLead();
  const addActivity = useCreateLeadActivity();
  const [modalStage, setModalStage] = useState<number | null>(null);
  const [editingOrphan, setEditingOrphan] = useState<Participant | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => {
    if (typeof localStorage === "undefined") return new Set();
    try { return new Set<number>(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "[]")); } catch { return new Set(); }
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const leadNames = new Set(leads.map((l) => l.nome.toLowerCase().trim()));
  const orphanParticipants = participants.filter((p) => !leadNames.has(p.nome.toLowerCase().trim()));
  const activeLeads = leads.filter((l) => !isDeclined(l));
  const declinedLeads = leads.filter(isDeclined);

  const toggleCollapse = (s: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      if (typeof localStorage !== "undefined") localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]));
      return next;
    });

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const rawId = String(e.active.id);
    const target = e.over?.id != null ? Number(e.over.id) : null;
    if (target == null) return;

    if (rawId.startsWith("part-")) {
      if (target === DECLINADO_COL) return; // participante confirmado não é "declinado" por aqui
      const part = orphanParticipants.find((p) => p.id === rawId.slice(5));
      if (!part) return;
      createLead.mutate({ nome: part.nome, cargo: part.cargo, empresa: part.empresa, cidade: part.cidade, passo: target, responsavel: "caetano", status: target === STAGE_CONFIRMADO ? "confirmado" : "abordado", ordem: 0 });
      return;
    }

    const lead = leads.find((l) => l.id === rawId);
    if (!lead) return;
    const wasDeclined = isDeclined(lead);

    if (target === DECLINADO_COL) {
      if (wasDeclined) return;
      // Só muda o status — o passo é preservado, guardando em qual etapa o lead estava.
      update.mutate({ id: rawId, patch: { status: "declinado" } });
      addActivity.mutate({ lead_id: rawId, conteudo: `Lead declinado em ${passoLabel(lead.passo)}.`, autor: "Sistema", tipo: "status" });
      return;
    }

    if (!wasDeclined && pipelineStage(lead.passo) === target) {
      // Um card histórico de P3/P4/P5 solto na coluna de Negociação é consolidado em P9.
      if (lead.passo !== target) update.mutate({ id: rawId, patch: { passo: target } });
      return;
    }
    const patch: Partial<Lead> = { passo: target };
    if (wasDeclined) patch.status = target === STAGE_CONFIRMADO ? "confirmado" : "abordado";
    else if (target === STAGE_CONFIRMADO) patch.status = "confirmado";
    else if (normalizeStatus(lead.status) === "confirmado") patch.status = "em_negociacao";
    update.mutate({ id: rawId, patch });
    if (wasDeclined) addActivity.mutate({ lead_id: rawId, conteudo: `Lead reativado em ${PASSO_LABELS[target]}.`, autor: "Sistema", tipo: "status" });
  };

  const activeItem = activeId
    ? (activeId.startsWith("part-")
      ? orphanParticipants.find((p) => p.id === activeId.slice(5))
      : leads.find((l) => l.id === activeId))
    : null;

  return (
    <div className="main main-wide">
      <div className="flex-between mb-16">
        <div className="section-label" style={{ margin: 0 }}>Pipeline visual — arraste os leads pelas etapas</div>
        <button className="btn-primary" onClick={() => setModalStage(1)} style={{ fontSize: 12, padding: "7px 14px" }}><i className="ti ti-plus" /> Novo lead</button>
      </div>
      <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="pv-board">
          {PIPE_COLS.map((s) => (
            <PipeColumn
              key={s} stage={s}
              leads={s === DECLINADO_COL ? declinedLeads : activeLeads.filter((l) => pipelineStage(l.passo) === s)}
              orphanParticipants={s === STAGE_CONTRATO ? orphanParticipants : []}
              collapsed={collapsed.has(s)} onToggle={() => toggleCollapse(s)}
              activeId={activeId} onAdd={() => setModalStage(s === STAGE_CONTRATO ? STAGE_CONFIRMADO : s)} onDelete={(id) => del.mutate(id)}
              onEdit={(lead) => onOpenLead(lead.id)}
              onEditOrphan={(p) => onViewParticipant ? onViewParticipant(p.id) : setEditingOrphan(p)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.2,.9,.3,1.15)" }}>
          {activeItem && ("passo" in activeItem
            ? <LeadCardInner lead={activeItem as Lead} overlay />
            : <OrphanCardInner participant={activeItem as Participant} overlay />)}
        </DragOverlay>
      </DndContext>
      {modalStage !== null && <LeadModal open onClose={() => setModalStage(null)} initialPasso={modalStage === DECLINADO_COL ? 1 : modalStage} />}
      {editingOrphan && <OrphanEditModal participant={editingOrphan} onClose={() => setEditingOrphan(null)} />}
    </div>
  );
}

function PipeColumn({ stage, leads, orphanParticipants = [], collapsed, onToggle, activeId, onAdd, onDelete, onEdit, onEditOrphan }: {
  stage: number; leads: Lead[]; orphanParticipants?: Participant[]; collapsed: boolean; onToggle: () => void;
  activeId: string | null; onAdd: () => void; onDelete: (id: string) => void; onEdit?: (lead: Lead) => void; onEditOrphan?: (p: Participant) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const total = leads.length + orphanParticipants.length;
  const color = COL_COLOR[stage];

  if (collapsed) {
    return (
      <div ref={setNodeRef} className={`pv-col pv-col-collapsed${isOver ? " pv-col-over" : ""}`} style={{ "--pvc": color } as React.CSSProperties} onClick={onToggle} title={`${COL_NAME[stage]} — clique para expandir`}>
        <div className="pv-col-icon"><i className={`ti ${COL_ICON[stage]}`} /></div>
        <span className="pv-col-count">{total}</span>
        <div className="pv-col-collapsed-name">{COL_NAME[stage]}</div>
        <i className="ti ti-chevron-right" style={{ color: "var(--text3)", fontSize: 14 }} />
      </div>
    );
  }

  return (
    <div className={`pv-col${isOver ? " pv-col-over" : ""}`} style={{ "--pvc": color } as React.CSSProperties}>
      <div className="pv-col-head">
        <div className="pv-col-title">
          <span className="pv-col-icon"><i className={`ti ${COL_ICON[stage]}`} /></span>
          <div>
            <div className="pv-col-name">{COL_NAME[stage]}</div>
            <div className="pv-col-sub">{COL_CODE[stage]}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="pv-col-count">{total}</span>
          <button className="pv-col-collapse" onClick={onToggle} title="Minimizar coluna"><i className="ti ti-minus" /></button>
        </div>
      </div>
      <div ref={setNodeRef} className={`pv-col-body${isOver ? " pv-drop" : ""}`}>
        {leads.map((l) => <LeadCardDraggable key={l.id} lead={l} hidden={activeId === l.id} onDelete={() => onDelete(l.id)} onEdit={onEdit ? () => onEdit(l) : undefined} />)}
        {orphanParticipants.map((p) => <OrphanCardDraggable key={`part-${p.id}`} participant={p} hidden={activeId === `part-${p.id}`} onEdit={onEditOrphan ? () => onEditOrphan(p) : undefined} />)}
        {total === 0 && (
          <div className="pv-empty">
            <i className={`ti ${stage === DECLINADO_COL ? "ti-user-x" : "ti-inbox"}`} />
            {isOver ? "Solte aqui" : "Vazio"}
          </div>
        )}
        {stage !== DECLINADO_COL && <button className="add-lead" onClick={onAdd}><i className="ti ti-plus" /> adicionar</button>}
      </div>
    </div>
  );
}

function LeadCardDraggable({ lead, hidden, onDelete, onEdit }: { lead: Lead; hidden: boolean; onDelete: () => void; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`pv-card${hidden ? " pv-ghost" : ""}`}>
      <LeadCardInner lead={lead} onDelete={onDelete} onEdit={onEdit} />
    </div>
  );
}

function LeadCardInner({ lead, overlay, onDelete, onEdit }: { lead: Lead; overlay?: boolean; onDelete?: () => void; onEdit?: () => void }) {
  const { initials, color } = respAvatar(lead.nome);
  const { data: participants = [] } = useParticipants();
  const matchPart = participants.find((p) => p.nome.toLowerCase().trim() === lead.nome.toLowerCase().trim());
  const cargo = lead.cargo || matchPart?.cargo || "";
  const empresa = lead.empresa || matchPart?.empresa || "";
  const cidade = lead.cidade || matchPart?.cidade || "";
  const body = (
    <>
      {onDelete && (
        <button className="lead-card-del" onClick={(e) => { e.stopPropagation(); onDelete(); }} onPointerDown={(e) => e.stopPropagation()} title="Excluir"><i className="ti ti-x" /></button>
      )}
      <div className="pv-card-head">
        {matchPart?.foto_url
          ? <img src={matchPart.foto_url} alt={lead.nome} className="pv-avatar" style={{ objectFit: "cover" }} />
          : <span className="pv-avatar" style={{ background: color }}>{initials}</span>}
        <div className="pv-card-id">
          <div className="pv-card-name">
            {onEdit && !overlay
              ? <button className="p-link pv-name-link" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(); }}>{lead.nome}</button>
              : lead.nome}
          </div>
          <div className="pv-card-meta">{[cargo, empresa || cidade].filter(Boolean).join(" · ") || "—"}</div>
        </div>
      </div>
      <div className="ck-row">
        {(lead.responsaveis?.length ?? 0) > 0
          ? <ResponsavelTags responsaveis={lead.responsaveis} size={18} max={2} />
          : <span className="ck-noresp"><i className="ti ti-user" /> Sem responsável</span>}
      </div>
      <div className="ck-row ck-row-dim">
        <span title="Data de cadastro"><i className="ti ti-calendar" /> {lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "—"}</span>
        {lead.cadastrado_por && <span title="Cadastrado por"><i className="ti ti-user-edit" /> {lead.cadastrado_por}</span>}
      </div>
    </>
  );
  return overlay ? <div className="pv-card pv-card-overlay" style={{ "--pvc": color } as React.CSSProperties}>{body}</div> : body;
}

function OrphanCardDraggable({ participant, hidden, onEdit }: { participant: Participant; hidden: boolean; onEdit?: () => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `part-${participant.id}` });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`pv-card${hidden ? " pv-ghost" : ""}`} style={{ borderLeft: "3px solid var(--teal)" }}>
      <OrphanCardInner participant={participant} onEdit={onEdit} />
    </div>
  );
}

function OrphanCardInner({ participant: p, overlay, onEdit }: { participant: Participant; overlay?: boolean; onEdit?: () => void }) {
  const { initials, color } = respAvatar(p.nome);
  return (
    <>
      <div className="pv-card-head">
        {p.foto_url
          ? <img src={p.foto_url} alt={p.nome} className="pv-avatar" style={{ objectFit: "cover" }} />
          : <span className="pv-avatar" style={{ background: color }}>{initials}</span>}
        <div className="pv-card-id">
          <div className="pv-card-name">
            {onEdit && !overlay
              ? <button className="p-link pv-name-link" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit(); }}>{p.nome}</button>
              : p.nome}
          </div>
          <div className="pv-card-meta">{[p.empresa, p.cidade].filter(Boolean).join(" · ") || "—"}</div>
        </div>
      </div>
      <div className="pv-card-foot" style={{ marginTop: 2 }}>
        <span className="badge badge-ok" style={{ fontSize: 10 }}><i className="ti ti-user-check" /> Confirmado</span>
      </div>
    </>
  );
}

// ══════════════════════════ DETALHAMENTO DO LEAD ══════════════════════════
function LeadDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: leads = [] } = useLeads();
  const { data: participants = [] } = useParticipants();
  const update = useUpdateLead();
  const del = useDeleteLead();
  const setResp = useSetLeadResponsaveis();
  const addActivity = useCreateLeadActivity();
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [respDraft, setRespDraft] = useState<string[] | null>(null);

  useEffect(() => { setRespDraft(null); }, [id]);

  const lead = leads.find((l) => l.id === id);
  if (!lead) {
    return (
      <div className="main">
        <button className="back-btn" onClick={onBack}><i className="ti ti-arrow-left" /> Voltar para o comercial</button>
        <div className="nota-estrategica">Lead não encontrado. Ele pode ter sido excluído.</div>
      </div>
    );
  }
  const p = lead;
  const initials = (p.nome || "?").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const declined = isDeclined(p);
  const currentStatus = normalizeStatus(p.status);
  const savedRespIds = (p.responsaveis ?? []).map((r) => r.id);
  const respIds = respDraft ?? savedRespIds;
  const responsaveisChanged = [...respIds].sort().join(",") !== [...savedRespIds].sort().join(",");
  const save = (patch: Partial<Lead>) => update.mutate({ id, patch });
  const alreadyParticipant = participants.some((x) => x.nome.toLowerCase().trim() === p.nome.toLowerCase().trim());

  const onChangeStatus = (v: string) => {
    if (v === "declinado") { setConfirmDecline(true); return; }
    const patch: Partial<Lead> = { status: v };
    if (v === "confirmado") patch.passo = STAGE_CONFIRMADO;
    save(patch);
  };

  const doDecline = () => {
    // Só muda o status — o passo é preservado, guardando em qual etapa o lead estava.
    save({ status: "declinado" });
    addActivity.mutate({ lead_id: id, conteudo: `Lead declinado em ${passoLabel(p.passo)}.`, autor: "Sistema", tipo: "status" });
  };
  const doReactivate = () => {
    save({ status: "abordado" });
    addActivity.mutate({ lead_id: id, conteudo: `Lead reativado em ${passoLabel(p.passo)}.`, autor: "Sistema", tipo: "status" });
  };
  const saveResponsaveis = () => {
    setResp.mutate(
      { leadId: id, responsavelIds: respIds },
      { onSuccess: () => setRespDraft(null) },
    );
  };

  return (
    <div className="main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="back-btn" onClick={onBack}><i className="ti ti-arrow-left" style={{ fontSize: 13 }} /> Voltar para o comercial</button>
        <div style={{ display: "flex", gap: 8 }}>
          {declined
            ? <button className="btn-secondary" style={{ fontSize: 12, padding: "7px 14px" }} onClick={doReactivate}><i className="ti ti-refresh" /> Reativar lead</button>
            : <button className="btn-danger-outline" onClick={() => setConfirmDecline(true)}><i className="ti ti-user-x" /> Declinar</button>}
          <button className="btn-danger-outline" onClick={() => setConfirmDel(true)}><i className="ti ti-trash" /> Excluir</button>
        </div>
      </div>

      <div className="participant-header-card">
        <div className="participant-avatar">{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{p.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{[p.cargo, p.empresa, p.cidade].filter(Boolean).join(" · ") || "—"}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span className="badge badge-neutral" style={{ borderColor: COL_COLOR[isDeclined(p) ? DECLINADO_COL : pipelineStage(p.passo)], color: COL_COLOR[isDeclined(p) ? DECLINADO_COL : pipelineStage(p.passo)] }}>{etapaLabel(isDeclined(p) ? DECLINADO_COL : pipelineStage(p.passo))}</span>
            <ResponsavelTags responsaveis={p.responsaveis} />
          </div>
        </div>
        {alreadyParticipant && (
          <span className="badge badge-ok" style={{ flexShrink: 0 }}><i className="ti ti-user-check" /> Já é participante</span>
        )}
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><i className="ti ti-address-book" /> Contato & empresa</div>
          <div className="panel-body">
            <LeadRows rows={[["Nome", "nome"], ["Cargo", "cargo"], ["Empresa", "empresa"], ["E-mail", "email"], ["Telefone / WhatsApp", "telefone"], ["Cidade", "cidade"], ["Origem", "origem"]]} lead={p} onSave={save} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><i className="ti ti-git-branch" /> Funil comercial</div>
          <div className="panel-body">
            <SelectRow
              label="Etapa"
              value={String(pipelineStage(p.passo))}
              onChange={(v) => save({ passo: Number(v) })}
              options={(STAGES.includes(pipelineStage(p.passo)) ? STAGES : [...STAGES, pipelineStage(p.passo)]).map((s) => ({ value: String(s), label: etapaLabel(s) }))}
            />
            <div style={{ padding: "8px 0" }}>
              <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 6 }}>Responsáveis</div>
              <ResponsavelSelect value={respIds} onChange={(ids) => setRespDraft(ids)} />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn-primary" style={{ fontSize: 11, padding: "6px 10px" }} onClick={saveResponsaveis} disabled={!responsaveisChanged || setResp.isPending}>
                  {setResp.isPending ? <i className="ti ti-loader-2 modal-spinner" /> : <i className="ti ti-check" />} Salvar responsáveis
                </button>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>Cadastrado por</span>
              <EditableField value={p.cadastrado_por ?? ""} onSave={(v) => save({ cadastrado_por: v })} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>Data de cadastro</span>
              <span>{p.created_at ? new Date(p.created_at).toLocaleString("pt-BR") : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><i className="ti ti-timeline" /> Atividades & observações</div>
        <div className="panel-body">
          <LeadTimeline leadId={id} legacyNote={p.observacoes} />
        </div>
      </div>

      <ConfirmDialog open={confirmDecline} onClose={() => setConfirmDecline(false)} onConfirm={doDecline} title="Declinar lead" message={`Marcar ${p.nome} como declinado? Ele sai do funil ativo e dos indicadores de negociação, mas continua no histórico e pode ser reativado.`} confirmLabel="Declinar" />
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => del.mutate(id, { onSuccess: onBack })} title="Excluir lead" message={`Tem certeza que deseja excluir ${p.nome}? Essa ação não pode ser desfeita — considere declinar em vez de excluir.`} confirmLabel="Excluir" />
    </div>
  );
}

function LeadRows({ rows, lead, onSave }: { rows: [string, keyof Lead][]; lead: Lead; onSave: (patch: Partial<Lead>) => void }) {
  return (
    <table style={{ width: "100%", fontSize: 12, border: "none", borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(([label, field]) => (
          <tr key={field as string}>
            <td style={{ color: "var(--text3)", padding: "6px 0", width: "42%" }}>{label}</td>
            <td style={{ padding: "6px 0" }}><EditableField value={(lead[field] as any) ?? ""} onSave={(v) => onSave({ [field]: v } as any)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", alignItems: "center", fontSize: 12, gap: 8 }}>
      <span style={{ color: "var(--text3)" }}>{label}</span>
      <select className="tier-select-inline" value={value} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: "60%" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ══════════════════════════ MODAIS ══════════════════════════
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

function LeadModal({ open, onClose, initialPasso }: { open: boolean; onClose: () => void; initialPasso?: number }) {
  const create = useCreateLead();
  const setResp = useSetLeadResponsaveis();
  const { data: responsaveis = [] } = useResponsaveis();
  const [form, setForm] = useState({ nome: "", cargo: "", empresa: "", cidade: "", email: "", telefone: "", passo: initialPasso ?? 0, status: "novo", cadastrado_por: "Caetano" });
  const [respIds, setRespIds] = useState<string[]>([]);

  const submit = () => {
    if (!form.nome.trim()) return;
    const nomes = respIds.map((rid) => responsaveis.find((r) => r.id === rid)?.nome).filter(Boolean) as string[];
    const payload = { ...form, responsavel: nomes.join(" + ").toLowerCase() || "caetano", ordem: 0 };
    create.mutate(payload, {
      onSuccess: (newLead: any) => {
        if (respIds.length && newLead?.id) setResp.mutate({ leadId: newLead.id, responsavelIds: respIds });
        onClose();
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo lead">
      <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group"><label className="form-label">Cargo</label><input className="form-input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Empresa</label><input className="form-input" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Passo</label><select className="form-select" value={form.passo} onChange={(e) => setForm({ ...form, passo: Number(e.target.value) })}>{STAGES.filter((s) => s !== 6).map((s) => <option key={s} value={s}>{PASSO_LABELS[s]}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Cadastrado por</label><select className="form-select" value={form.cadastrado_por} onChange={(e) => setForm({ ...form, cadastrado_por: e.target.value })}><option value="Caetano">Caetano</option><option value="Joyce">Joyce</option><option value="Roque">Roque</option><option value="Google Sheets">Google Sheets</option></select></div>
      </div>
      <div className="form-group">
        <label className="form-label">Responsáveis</label>
        <ResponsavelSelect value={respIds} onChange={setRespIds} />
        <div style={{ fontSize: 10.5, color: "var(--text3)", marginTop: 5 }}><i className="ti ti-bulb" /> Você pode selecionar um ou mais responsáveis.</div>
      </div>
      <div className="flex-end"><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={submit}>Adicionar</button></div>
    </Modal>
  );
}
