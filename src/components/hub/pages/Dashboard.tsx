import { useCustos, useFinanceiroConfig, useLeads, useParcelasPagamento, useParticipants, usePendencias, custoValor, categoriaLabel, fmtBRL, isDeclined, isConfirmedLead, pipelineStage, NEGOTIATION_STAGES, STAGE_NEGOCIACAO } from "@/lib/hub-api";

export function DashboardPage() {
  const { data: participants = [] } = useParticipants();
  const { data: leads = [] } = useLeads();
  const { data: pendencias = [] } = usePendencias();
  const { data: fin } = useFinanceiroConfig();
  const { data: custos = [] } = useCustos();
  const { data: parcelas = [] } = useParcelasPagamento();

  const signedParticipants = participants.filter((p) => p.contrato_status === "assinado");
  const signedIds = new Set(signedParticipants.map((participant) => participant.id));
  const paidInstallments = parcelas.filter((parcela) => parcela.paga && signedIds.has(parcela.participant_id));
  const confirmedLeadNames = leads
    .filter(isConfirmedLead)
    .map((lead) => lead.nome.toLowerCase().trim());
  const signedParticipantNames = signedParticipants.map((participant) => participant.nome.toLowerCase().trim());
  // Um participante promovido a partir de um lead confirmado conta só uma vez.
  const confirmedTotal = new Set([...confirmedLeadNames, ...signedParticipantNames]).size;
  const pagamentosRecebidos = paidInstallments.reduce((s, parcela) => s + Number(parcela.valor || 0), 0);
  const minVagas = fin?.min_vagas ?? 20;
  const tierStandard = Number(fin?.tier_standard ?? 93600);
  const breakEvenTotal = minVagas * tierStandard;
  const falta = Math.max(0, breakEvenTotal - pagamentosRecebidos);

  const activeLeads = leads.filter((lead) =>
    !isDeclined(lead) && !isConfirmedLead(lead),
  );
  const totalFunil = activeLeads.length;
  const leadsAtivos = activeLeads.filter((l) => NEGOTIATION_STAGES.includes(l.passo)).length;
  const pendCriticas = pendencias.filter((p) => p.status !== "resolvida" && p.prioridade === "critico").length;

  const proximosVencimentos = custos
    .filter((c) => !!c.data_vencimento)
    .sort((a, b) => (a.data_vencimento! < b.data_vencimento! ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="main">
      <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <MetricCard icon="ti-users" label="Leads no funil" value={String(totalFunil)} sub={`${leadsAtivos} em negociação ativa`} />
        <MetricCard icon="ti-check" label="Confirmados" value={String(confirmedTotal)} sub={`meta: ${fin?.min_vagas ?? 20}–${fin?.meta_vagas ?? 25} vagas`} valueClass="metric-ok" />
        <MetricCard icon="ti-calendar" label="Duração da missão" value="9 dias" sub="Pequim · Xangai · Hangzhou" />
        <MetricCard icon="ti-cash" label="Pagamentos recebidos" value={fmtBRL(pagamentosRecebidos)} sub={`${paidInstallments.length} parcela(s) paga(s) de contratos assinados`} valueClass="metric-ok" />
        <MetricCard icon="ti-alert-circle" label="Faltam para o ponto de equilíbrio" value={fmtBRL(falta)} sub={`${minVagas} pax × ${fmtBRL(tierStandard)} — base mínima`} valueClass="metric-danger" />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><i className="ti ti-git-branch" /> Status das 3 fases</div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FaseStatus dot="var(--amber)" nome="Comercial" badge="Em andamento" badgeClass="badge-warn" desc={`Pipeline ativo — ${pendencias.filter((p) => p.fase === "comercial" && p.status !== "resolvida").length} pendências abertas`} />
            <FaseStatus dot="var(--text3)" nome="Pré-viagem" badge={confirmedTotal > 0 ? "Em andamento" : "Não iniciado"} badgeClass={confirmedTotal > 0 ? "badge-warn" : "badge-neutral"} desc="Disparado após confirmação comercial (P7)" />
            <FaseStatus dot="var(--text3)" nome="Viagem" badge="Não iniciado" badgeClass="badge-neutral" desc="Depende de definições abertas" />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><i className="ti ti-alert-circle" /> Próximas ações críticas</div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendencias.filter((p) => p.status !== "resolvida").slice(0, 5).map((p) => (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className={`badge ${p.prioridade === "critico" ? "badge-danger" : "badge-warn"}`} style={{ flexShrink: 0, marginTop: 1 }}>
                  {p.prioridade === "critico" ? "Urgente" : "Alta"}
                </span>
                <div style={{ fontSize: 12 }}>{p.titulo}</div>
              </div>
            ))}
            {pendencias.length === 0 && <div style={{ fontSize: 12, color: "var(--text3)" }}>Sem pendências registradas.</div>}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><i className="ti ti-users" /> Leads por passo</div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(() => {
              const stages = [
                { p: 0, label: "P0 — Cadastro",   color: "#52b788" },
                { p: 1, label: "P1 — Abordagem",   color: "var(--text3)" },
                { p: 2, label: "P2 — Qualificação", color: "var(--purple)" },
                { p: STAGE_NEGOCIACAO, label: "Negociação", color: "var(--amber)" },
                { p: 6, label: "P6 — Contrato",    color: "#d85a30" },
                { p: 7, label: "P7 — Confirmado",  color: "var(--teal)" },
                { p: -1, label: "Declinado",        color: "#c0392b" },
              ];
              const countStage = (p: number) => p === -1
                ? leads.filter(isDeclined).length
                : leads.filter((lead) => !isDeclined(lead) && pipelineStage(lead.passo) === p).length;
              const max = Math.max(1, ...stages.map(({ p }) => countStage(p)));
              return stages.map(({ p, label, color }) => {
                const count = countStage(p);
                return (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)", width: 130, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: color, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, width: 16, textAlign: "right" }}>{count}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><i className="ti ti-map-2" /> Rota da missão</div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column" }}>
            {[
              { color: "var(--accent)", title: "Dia 0 — Embarque", sub: "Brasil → China · Terminal BTG a confirmar" },
              { color: "var(--blue)", title: "Dias 1–3 — Pequim", sub: "Capital política · Visitas, debrief, vídeos, jantar" },
              { color: "var(--purple)", title: "Dias 4–6 — Xangai", sub: "Capital financeira · Trem-bala desde Pequim" },
              { color: "var(--teal)", title: "Dias 7–8 — Hangzhou", sub: "Capital tecnológica · Ecossistema Alibaba" },
              { color: "var(--text3)", title: "Dia 9 — Retorno + Pós-viagem", sub: "Síntese executiva até 14 dias · Reengajamento 2027" },
            ].map((r, i, arr) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: i === 0 ? "0 0 12px 0" : i === arr.length - 1 ? "12px 0 0 0" : "12px 0", borderBottom: i < arr.length - 1 ? ".5px solid var(--border)" : "none" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, marginTop: 3, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 12 }}>
        <div className="panel-header"><i className="ti ti-calendar-due" /> Próximos vencimentos</div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proximosVencimentos.length === 0 && <div style={{ fontSize: 12, color: "var(--text3)" }}>Nenhum custo com vencimento definido.</div>}
          {proximosVencimentos.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="badge badge-warn">{new Date(c.data_vencimento! + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                <span>{c.titulo}</span>
                <span className="badge badge-neutral" style={{ fontSize: 10 }}>{categoriaLabel(c.categoria)}</span>
              </div>
              <span style={{ fontWeight: 500 }}>{fmtBRL(custoValor(c))}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, padding: "12px 14px", background: "var(--surface)", border: ".5px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--text3)" }}>
        <i className="ti ti-info-circle" /> {pendCriticas} pendência(s) crítica(s) abertas no backlog unificado.
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, valueClass }: { icon: string; label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label"><i className={`ti ${icon}`} />{label}</div>
      <div className={`metric-value ${valueClass ?? ""}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function FaseStatus({ dot, nome, badge, badgeClass, desc }: { dot: string; nome: string; badge: string; badgeClass: string; desc: string }) {
  return (
    <div style={{ borderTop: nome !== "Comercial" ? ".5px solid var(--border)" : "none", paddingTop: nome !== "Comercial" ? 14 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, display: "inline-block" }} />
          <strong style={{ fontSize: 13 }}>{nome}</strong>
        </div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text2)" }}>{desc}</div>
    </div>
  );
}
