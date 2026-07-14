import { useParticipants, useTouchpoints, useUpsertTouchpoint, type Participant, type Touchpoint } from "@/lib/hub-api";
import { MensagensAccordion } from "@/components/hub/MensagensAccordion";
import { PendenciasList } from "@/components/hub/PendenciasList";

const TPS = ["D-60", "D-45", "D-30", "D-21", "D-14", "D-7", "D-3"];
const TP_NAMES: Record<string, string> = { "D-60": "Kickoff", "D-45": "Aquecimento", "D-30": "Logística", "D-21": "Dicas", "D-14": "Confirm.", "D-7": "Vídeos", "D-3": "Pré-emb." };
const DEPARTURE_DATE = new Date("2026-10-28");
const TP_DAYS: Record<string, number> = { "D-60": 60, "D-45": 45, "D-30": 30, "D-21": 21, "D-14": 14, "D-7": 7, "D-3": 3 };

function getTpDate(code: string): Date {
  const d = new Date(DEPARTURE_DATE);
  d.setDate(d.getDate() - TP_DAYS[code]);
  return d;
}

function getTpDateLabel(code: string): string {
  return getTpDate(code).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type TpState = "future" | "active" | "overdue" | "done";

function getTpState(code: string, status: string): TpState {
  if (status === "realizado") return "done";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tp = getTpDate(code); tp.setHours(0, 0, 0, 0);
  if (today < tp) return "future";
  if (today.getTime() === tp.getTime()) return "active";
  return "overdue";
}

function getActiveStage(pid: string, tpsList: Touchpoint[]): string | null {
  const getStatus = (code: string) => tpsList.find((t) => t.participant_id === pid && t.touchpoint_code === code)?.status ?? "nao_iniciado";
  for (const code of TPS) {
    const state = getTpState(code, getStatus(code));
    if (state === "overdue" || state === "active") return code;
    if (state === "future") return null;
  }
  return null;
}

export function PreViagemPage({ sub, onViewParticipant }: { sub: string; onViewParticipant?: (id: string) => void }) {
  if (sub === "pipeline") return <TouchpointGrid onViewParticipant={onViewParticipant} />;
  if (sub === "parts") return <PartsCompactList onViewParticipant={onViewParticipant} />;
  if (sub === "mensagens") return <MensagensAccordion etapa="preop" intro="Mensagens em ordem cronológica (D-60 → D-3). D-60 e D-3 são obrigatórios e síncronos." />;
  if (sub === "pendencias") return <PendenciasList fase="preop" title="Pendências — fase pré-viagem" />;
  return <PreDash />;
}

function PreDash() {
  return (
    <div className="main">
      <div className="metrics">
        <Metric icon="ti-calendar" label="Janela total" value="~60" sub="dias antes do embarque" />
        <Metric icon="ti-video" label="Síncronos obrigatórios" value="2" sub="Kickoff D-60 + pré-embarque D-3" />
        <Metric icon="ti-message-dots" label="Async recomendados" value="5" sub="quinzenais e semanais" />
        <Metric icon="ti-user-check" label="Responsável" value="Caetano" sub="+ Zé Ricardo / Lit" />
      </div>
      <div className="nota-critica">
        <strong><i className="ti ti-alert-triangle" /> Ponto crítico:</strong> Engajamento de grupo WhatsApp sem dono claro tende a morrer após a segunda semana.
      </div>
      <div className="section-label" style={{ marginTop: 0 }}>Cadência de touchpoints (D-60 → D-3)</div>
      <div className="timeline-track">
        {[
          ["D-60","Obrigatório · síncrono","Kickoff oficial","Boas-vindas, José Ricardo, recomendações + conteúdo de IA","ti-video","Live",true],
          ["D-45","Recomendado · async","Aquecimento inicial","Visão das 3 cidades, proposta de valor, o que esperar","ti-video","Vídeo curto",false],
          ["D-30","Recomendado · async","Logística da saída","Terminal BTG, upgrade Emirates, case da edição anterior","ti-brand-whatsapp","WhatsApp",false],
          ["D-21","Recomendado · async","Dicas práticas","Apps (VPN, WeChat), câmbio, etiqueta de negócios","ti-file-text","Guia PDF",false],
          ["D-14","Recomendado · async","Confirmação logística","Voos, documentos, seguro viagem (obrigatório)","ti-checklist","Checklist",false],
          ["D-7","Recomendado · async","Preparo vídeos","Dinâmica do videomaker, uso de imagem","ti-brand-whatsapp","WhatsApp",false],
          ["D-3","Obrigatório · síncrono","Pré-embarque","Checklist final, ponto de encontro, contato de emergência","ti-video","Live",true],
        ].map((tp: any, i) => (
          <div key={i} className={`tp-card ${tp[6] ? "tp-obrigatorio" : "tp-opcional"}`}>
            <div className="tp-day">{tp[0]}</div>
            <div className="tp-tipo">{tp[1]}</div>
            <div className="tp-nome">{tp[2]}</div>
            <div className="tp-desc">{tp[3]}</div>
            <span className="tp-formato"><i className={`ti ${tp[4]}`} style={{ fontSize: 11 }} /> {tp[5]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub }: any) {
  return (
    <div className="metric-card">
      <div className="metric-label"><i className={`ti ${icon}`} />{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function TouchpointGrid({ onViewParticipant }: { onViewParticipant?: (id: string) => void }) {
  const { data: allParts = [] } = useParticipants();
  const { data: tps = [] } = useTouchpoints();
  const upsert = useUpsertTouchpoint();
  const parts = allParts.filter((p) => p.pagamento_status === "confirmado" && p.contrato_status === "assinado");
  const getStatus = (pid: string, code: string) => tps.find((t) => t.participant_id === pid && t.touchpoint_code === code)?.status ?? "nao_iniciado";
  const handleClick = (pid: string, code: string, st: string, state: TpState) => {
    if (state === "future") return;
    upsert.mutate({ participant_id: pid, touchpoint_code: code, status: st === "realizado" ? "nao_iniciado" : "realizado" });
  };
  const overdueCount = parts.reduce((acc, p) => acc + TPS.filter((c) => getTpState(c, getStatus(p.id, c)) === "overdue").length, 0);
  return (
    <div className="main">
      <div className="section-label" style={{ marginTop: 0 }}>Pipeline pré-viagem — por participante</div>
      {overdueCount > 0 && <div className="nota-critica"><strong><i className="ti ti-alert-triangle" /> {overdueCount} touchpoint{overdueCount > 1 ? "s" : ""} atrasado{overdueCount > 1 ? "s" : ""}.</strong> Conclua os itens em vermelho para avançar o pipeline.</div>}
      {parts.length === 0 && <div className="nota-estrategica">Nenhum participante com contrato assinado e pagamento confirmado ainda.</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Participante</th>
              {TPS.map((c) => <th key={c} style={{ textAlign: "center" }}>{c}<br /><span style={{ fontWeight: 400, color: "var(--text3)", fontSize: 10 }}>{getTpDateLabel(c)}</span><br /><span style={{ fontWeight: 400, color: "var(--text3)" }}>{TP_NAMES[c]}</span></th>)}
              <th>Etapa atual</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const activeStage = getActiveStage(p.id, tps);
              const allDone = TPS.every((c) => getStatus(p.id, c) === "realizado");
              return (
                <tr key={p.id}>
                  <td>
                    {onViewParticipant ? <button className="p-link" onClick={() => onViewParticipant(p.id)}>{p.nome}</button> : <div style={{ fontWeight: 500 }}>{p.nome}</div>}
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{[p.empresa, p.cidade].filter(Boolean).join(" · ")}</div>
                  </td>
                  {TPS.map((code) => {
                    const st = getStatus(p.id, code);
                    const state = getTpState(code, st);
                    const dotStyle = state === "overdue" ? { background: "var(--accent-light)", borderColor: "transparent", color: "var(--accent)" } : undefined;
                    const dotClass = state === "done" ? "done" : state === "active" ? "pend" : "";
                    const title = state === "future" ? `Disponível em ${getTpDateLabel(code)}` : state === "overdue" ? "Atrasado — clique para concluir" : state === "active" ? "Clique para concluir" : "Concluído — clique para desfazer";
                    return (
                      <td key={code} style={{ textAlign: "center" }}>
                        <span className={`check-dot ${dotClass}`} style={{ ...dotStyle, cursor: state === "future" ? "default" : "pointer" }} onClick={() => handleClick(p.id, code, st, state)} title={title}>
                          {state === "done" ? <i className="ti ti-check" style={{ fontSize: 10 }} /> : state === "overdue" ? <i className="ti ti-alert-triangle" style={{ fontSize: 9 }} /> : state === "active" ? "●" : "·"}
                        </span>
                      </td>
                    );
                  })}
                  <td>
                    {allDone ? <span className="badge badge-ok">Concluído</span> : activeStage ? <span className="badge badge-warn">{activeStage} — {TP_NAMES[activeStage]}</span> : <span className="badge badge-neutral">Aguardando D-60</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
        <Legend cls="done" label="Concluído" /><Legend cls="pend" label="Para concluir hoje" /><Legend cls="overdue" label="Atrasado" /><Legend cls="" label="Ainda não chegou" />
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  const overdueStyle = cls === "overdue" ? { background: "var(--accent-light)", borderColor: "transparent", color: "var(--accent)" } : undefined;
  const dotClass = cls === "overdue" ? "" : cls;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text2)" }}>
      <span className={`check-dot ${dotClass}`} style={{ width: 16, height: 16, fontSize: 9, ...overdueStyle }}>
        {cls === "done" ? <i className="ti ti-check" style={{ fontSize: 9 }} /> : cls === "overdue" ? <i className="ti ti-alert-triangle" style={{ fontSize: 8 }} /> : cls === "pend" ? "●" : "·"}
      </span>
      {label}
    </div>
  );
}

function PartsCompactList({ onViewParticipant }: { onViewParticipant?: (id: string) => void }) {
  const { data: allParts = [] } = useParticipants();
  const parts = allParts.filter((p) => p.pagamento_status === "confirmado" && p.contrato_status === "assinado");
  return (
    <div className="main">
      <div className="section-label" style={{ marginTop: 0 }}>Participantes confirmados — dados relevantes para o pré-operacional</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Empresa</th><th>Cidade</th><th>Restrições</th><th>Seguro</th><th>Voo</th><th>Uso de imagem</th><th>WhatsApp</th></tr></thead>
          <tbody>
            {parts.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text3)", padding: 16 }}>Sem participantes cadastrados ainda.</td></tr>}
            {parts.map((p) => (
              <tr key={p.id}>
                <td>{onViewParticipant ? <button className="p-link" onClick={() => onViewParticipant(p.id)}>{p.nome}</button> : p.nome}</td>
                <td>{p.empresa ?? "—"}</td><td>{p.cidade ?? "—"}</td>
                <td><span className="badge badge-neutral">{p.restricoes_alimentares || "Nenhuma"}</span></td>
                <td><span className={`badge ${p.seguro_status === "contratado" ? "badge-ok" : "badge-warn"}`}>{p.seguro_status}</span></td>
                <td><span className={`badge ${p.voo_ida_status === "confirmado" ? "badge-ok" : "badge-warn"}`}>{p.voo_ida_status}</span></td>
                <td><span className={`badge ${p.uso_imagem_status === "assinado" ? "badge-ok" : "badge-warn"}`}>{p.uso_imagem_status}</span></td>
                <td style={{ fontSize: 11, color: "var(--text3)" }}>{p.telefone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="nota-estrategica" style={{ marginTop: 4 }}><strong>Atenção:</strong> a coluna "Uso de imagem" deve estar assinada antes do D-7.</div>
    </div>
  );
}
