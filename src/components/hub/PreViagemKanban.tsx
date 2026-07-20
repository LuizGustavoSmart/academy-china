import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useParticipants, useTouchpoints, useUpsertTouchpoints, useUpdateParticipant, type Participant, type Touchpoint } from "@/lib/hub-api";

// ────────── CONSTANTES DA JORNADA ──────────
export const TPS = ["D-60", "D-45", "D-30", "D-21", "D-14", "D-7", "D-3"];
export const TP_NAMES: Record<string, string> = {
  "D-60": "Kickoff", "D-45": "Aquecimento", "D-30": "Logística",
  "D-21": "Dicas", "D-14": "Confirmação", "D-7": "Vídeos", "D-3": "Pré-embarque",
};
export const TP_DAYS: Record<string, number> = { "D-60": 60, "D-45": 45, "D-30": 30, "D-21": 21, "D-14": 14, "D-7": 7, "D-3": 3 };
export const DEPARTURE_DATE = new Date("2026-10-28");

// Colunas do board: entrada (recém-cadastrados, ainda sem contrato/pagamento) → aguardando
// formulário → formulário preenchido → 7 touchpoints → Concluído. Cor esquenta conforme o
// embarque se aproxima.
const COLS = ["entrada", "aguardando_formulario", "formulario_preenchido", ...TPS, "done"];
const COL_COLORS: Record<string, string> = {
  entrada: "#5c6470", aguardando_formulario: "#8a6d3b", formulario_preenchido: "#3f7d5c",
  "D-60": "#185fa5", "D-45": "#4a6fc0", "D-30": "#7268c4", "D-21": "#945dbb",
  "D-14": "#ad5299", "D-7": "#bc4767", "D-3": "#c0392b", done: "#0f6e56",
};
const COL_ICONS: Record<string, string> = {
  entrada: "ti-user-plus", aguardando_formulario: "ti-clipboard-text", formulario_preenchido: "ti-clipboard-check",
  "D-60": "ti-video", "D-45": "ti-flame", "D-30": "ti-plane-departure", "D-21": "ti-bulb",
  "D-14": "ti-checklist", "D-7": "ti-movie", "D-3": "ti-luggage", done: "ti-confetti",
};
const COL_META: Record<string, { title: string; sub: string }> = {
  entrada: { title: "Entrada do participante", sub: "Pagamento confirmado — pronto para iniciar a Pré-viagem" },
  aguardando_formulario: { title: "Aguardando formulário", sub: "Aguardando preenchimento do formulário público" },
  formulario_preenchido: { title: "Formulário preenchido", sub: "Dados recebidos — pronto para a jornada" },
  done: { title: "Concluído", sub: "Prontos para embarcar" },
};

/** Um participante só entra na jornada de touchpoints depois de contrato assinado + pagamento confirmado. */
function isJourneyReady(p: Participant): boolean {
  return p.pagamento_status === "confirmado" && p.contrato_status === "assinado";
}
/** O formulário público (china.matteracademy.ai/formulario) foi identificado e sincronizado
 * com este participante — ver supabase/functions/sync-participant-form. */
function isFormFilled(p: Participant): boolean {
  return !!p.form_synced_at;
}

export function getTpDate(code: string): Date {
  const d = new Date(DEPARTURE_DATE);
  d.setDate(d.getDate() - TP_DAYS[code]);
  return d;
}
export function getTpDateLabel(code: string): string {
  return getTpDate(code).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// ────────── HELPERS DE ESTADO ──────────
type TpMap = Map<string, string>; // `${pid}|${code}` → status

function buildTpMap(tps: Touchpoint[]): TpMap {
  const m: TpMap = new Map();
  for (const t of tps) m.set(`${t.participant_id}|${t.touchpoint_code}`, t.status);
  return m;
}
const getStatus = (m: TpMap, pid: string, code: string) => m.get(`${pid}|${code}`) ?? "nao_iniciado";

function hasStartedTouchpoints(m: TpMap, p: Participant): boolean {
  return TPS.some((code) => getStatus(m, p.id, code) !== "nao_iniciado");
}

/** Índice da coluna atual: 0 = entrada, 1 = aguardando formulário, 2 = formulário preenchido
 * (descansa aqui até ser arrastado manualmente para o primeiro touchpoint), 3..9 = touchpoints,
 * 10 = concluído. */
function getStageIndex(m: TpMap, p: Participant): number {
  if (!isJourneyReady(p)) return 0;
  if (!isFormFilled(p)) return 1;
  if (!hasStartedTouchpoints(m, p)) return 2;
  for (let i = 0; i < TPS.length; i++) if (getStatus(m, p.id, TPS[i]) !== "realizado") return i + 3;
  return TPS.length + 3;
}

function countOverdue(m: TpMap, pid: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return TPS.filter((c) => {
    if (getStatus(m, pid, c) === "realizado") return false;
    const d = getTpDate(c); d.setHours(0, 0, 0, 0);
    return d <= today;
  }).length;
}

const AVATAR_HUES = [210, 262, 330, 150, 25, 190, 285, 95];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${AVATAR_HUES[h % AVATAR_HUES.length]} 42% 46%)`;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// ────────── BOARD ──────────
export function PreViagemKanban({ onViewParticipant }: { onViewParticipant?: (id: string) => void }) {
  const { data: allParts = [] } = useParticipants();
  const { data: tps = [] } = useTouchpoints();
  const upsertMany = useUpsertTouchpoints();
  const updateParticipant = useUpdateParticipant();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Todo participante aparece no board: os sem contrato/pagamento ficam em "Entrada".
  const parts = allParts;
  const tpMap = useMemo(() => buildTpMap(tps), [tps]);
  const activePart = activeId ? parts.find((p) => p.id === activeId) ?? null : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const pid = String(e.active.id);
    const part = parts.find((p) => p.id === pid);
    if (!part) return;
    if (e.over?.id == null) return;
    const target = COLS.indexOf(String(e.over.id));
    const current = getStageIndex(tpMap, part);
    if (target <= 0 || target === current) return; // não é possível arrastar de volta para "Entrada"

    // Sair de "Entrada" confirma contrato + pagamento automaticamente, para qualquer coluna à frente.
    const patch: Partial<Participant> = {};
    if (!isJourneyReady(part)) { patch.pagamento_status = "confirmado"; patch.contrato_status = "assinado"; }

    if (target === 1) {
      // "Aguardando formulário": zera o sinal de formulário preenchido (regressão manual).
      if (part.form_synced_at) patch.form_synced_at = null;
    } else {
      // "Formulário preenchido" (2) ou qualquer touchpoint à frente — marca o formulário como
      // preenchido manualmente, caso ainda não tenha vindo do formulário público.
      if (!part.form_synced_at) patch.form_synced_at = new Date().toISOString();
    }
    if (Object.keys(patch).length) updateParticipant.mutate({ id: pid, patch });

    // Touchpoints: coluna N = etapas anteriores realizadas, N em diante zeradas. Nas colunas
    // "aguardando formulário"/"formulário preenchido" (1 e 2) todos ficam zerados.
    const tpTarget = target - 3;
    const patches = TPS
      .map((code, i) => ({ participant_id: pid, touchpoint_code: code, status: i < tpTarget ? "realizado" : "nao_iniciado" }))
      .filter((t) => getStatus(tpMap, pid, t.touchpoint_code) !== t.status);
    if (patches.length) upsertMany.mutate(patches);
  };

  const totalOverdue = parts.reduce((acc, p) => acc + countOverdue(tpMap, p.id), 0);

  return (
    <div className="main main-wide">
      <div className="flex-between mb-16">
        <div className="section-label" style={{ margin: 0 }}>Jornada pré-viagem — arraste os participantes pelas etapas</div>
        {totalOverdue > 0 && (
          <span className="pv-overdue-banner"><i className="ti ti-alert-triangle" /> {totalOverdue} touchpoint{totalOverdue > 1 ? "s" : ""} atrasado{totalOverdue > 1 ? "s" : ""}</span>
        )}
      </div>
      {parts.length === 0 && <div className="nota-estrategica">Nenhum participante cadastrado ainda.</div>}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="pv-board">
          {COLS.map((col, i) => (
            <Column key={col} col={col} index={i}
              parts={parts.filter((p) => getStageIndex(tpMap, p) === i)}
              tpMap={tpMap} activeId={activeId} onViewParticipant={onViewParticipant}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.2,.9,.3,1.15)" }}>
          {activePart && <CardInner p={activePart} tpMap={tpMap} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({ col, index, parts, tpMap, activeId, onViewParticipant }: {
  col: string; index: number; parts: Participant[]; tpMap: TpMap; activeId: string | null;
  onViewParticipant?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col });
  const color = COL_COLORS[col];
  const isDone = col === "done";
  const meta = COL_META[col];
  const title = meta ? meta.title : `${col} · ${TP_NAMES[col]}`;
  const sub = meta ? meta.sub : `até ${getTpDateLabel(col)}`;
  return (
    <div className={`pv-col${isOver ? " pv-col-over" : ""}`} style={{ "--pvc": color } as React.CSSProperties}>
      <div className="pv-col-head">
        <div className="pv-col-title">
          <span className="pv-col-icon"><i className={`ti ${COL_ICONS[col]}`} /></span>
          <div>
            <div className="pv-col-name">{title}</div>
            <div className="pv-col-sub">{sub}</div>
          </div>
        </div>
        <span className="pv-col-count">{parts.length}</span>
      </div>
      <div ref={setNodeRef} className={`pv-col-body${isOver ? " pv-drop" : ""}`}>
        {parts.map((p) => <Card key={p.id} p={p} tpMap={tpMap} hidden={activeId === p.id} onView={onViewParticipant} />)}
        {parts.length === 0 && (
          <div className="pv-empty">
            <i className={`ti ${isDone ? "ti-flag-check" : "ti-inbox"}`} />
            {isOver ? "Solte aqui" : "Vazio"}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ p, tpMap, hidden, onView }: { p: Participant; tpMap: TpMap; hidden: boolean; onView?: (id: string) => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: p.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`pv-card${hidden ? " pv-ghost" : ""}`}>
      <CardInner p={p} tpMap={tpMap} onView={onView} />
    </div>
  );
}

function CardInner({ p, tpMap, overlay, onView }: { p: Participant; tpMap: TpMap; overlay?: boolean; onView?: (id: string) => void }) {
  const done = TPS.filter((c) => getStatus(tpMap, p.id, c) === "realizado").length;
  const stageIdx = getStageIndex(tpMap, p);
  const overdue = countOverdue(tpMap, p.id);
  const next = stageIdx >= 3 && stageIdx - 3 < TPS.length ? TPS[stageIdx - 3] : null;
  const pct = Math.round((done / TPS.length) * 100);
  const body = (
    <>
      <div className="pv-card-head">
        {p.foto_url ? (
          <img src={p.foto_url} alt={p.nome} className="pv-avatar" style={{ objectFit: "cover" }} />
        ) : (
          <span className="pv-avatar" style={{ background: avatarColor(p.nome) }}>{initials(p.nome)}</span>
        )}
        <div className="pv-card-id">
          <div className="pv-card-name">
            {onView && !overlay
              ? <button className="p-link pv-name-link" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onView(p.id); }}>{p.nome}</button>
              : p.nome}
          </div>
          <div className="pv-card-meta">{[p.cargo, p.empresa].filter(Boolean).join(" · ") || "—"}</div>
        </div>
        {p.tier === "premium" && <span className="pv-tier" title="Tier premium"><i className="ti ti-crown" /></span>}
      </div>

      <div className="pv-progress-row">
        <div className="pv-progress-track"><div className="pv-progress-fill" style={{ width: `${pct}%` }} /></div>
        <span className="pv-progress-label">{done}/{TPS.length}</span>
      </div>

      <div className="pv-next">
        {next
          ? <><i className="ti ti-arrow-right" /> Próxima: <strong>{next} · {TP_NAMES[next]}</strong> <span className="pv-next-date">{getTpDateLabel(next)}</span></>
          : stageIdx === 0
          ? <><i className="ti ti-check" /> Pagamento confirmado — aguardando início da jornada</>
          : stageIdx === 1
          ? <><i className="ti ti-mail-forward" /> Aguardando preenchimento do formulário</>
          : stageIdx === 2
          ? <><i className="ti ti-clipboard-check" /> Pronto para iniciar a jornada</>
          : <><i className="ti ti-confetti" /> Jornada concluída</>}
      </div>

      <div className="pv-card-foot">
        <div className="pv-chips">
          <StatusChip ok={p.seguro_status === "contratado"} icon="ti-shield-check" label="Seguro" />
          <StatusChip ok={p.voo_ida_status === "confirmado"} icon="ti-plane" label="Voo" />
          <StatusChip ok={p.uso_imagem_status === "assinado"} icon="ti-camera" label="Imagem" />
        </div>
        <div className="pv-contacts">
          {p.cidade && <span className="pv-city" title={p.cidade}><i className="ti ti-map-pin" /> {p.cidade}</span>}
          {p.telefone && <i className="ti ti-brand-whatsapp pv-contact-ok" title={p.telefone} />}
          {p.email && <i className="ti ti-mail pv-contact-ok" title={p.email} />}
        </div>
      </div>

      {overdue > 0 && <div className="pv-overdue"><i className="ti ti-alert-triangle" /> {overdue} etapa{overdue > 1 ? "s" : ""} atrasada{overdue > 1 ? "s" : ""}</div>}
    </>
  );
  return overlay ? <div className="pv-card pv-card-overlay">{body}</div> : body;
}

function StatusChip({ ok, icon, label }: { ok: boolean; icon: string; label: string }) {
  return (
    <span className={`pv-chip ${ok ? "pv-chip-ok" : "pv-chip-pend"}`} title={`${label}: ${ok ? "OK" : "pendente"}`}>
      <i className={`ti ${icon}`} />
    </span>
  );
}
