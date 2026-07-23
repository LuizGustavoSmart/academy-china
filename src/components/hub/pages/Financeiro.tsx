import { useEffect, useState } from "react";
import {
  CATEGORIAS_CUSTO, categoriaLabel, custoValor, fmtBRL,
  useCreateCusto, useCustos, useDeleteCusto, useFinanceiroConfig,
  useParticipants, useUpdateCusto, useUpdateFinanceiroConfig, type Custo,
} from "@/lib/hub-api";
import { Modal, ConfirmDialog } from "@/components/hub/Modal";

export function FinanceiroPage() {
  const { data: fin } = useFinanceiroConfig();
  const { data: participants = [] } = useParticipants();
  const { data: custos = [] } = useCustos();
  const update = useUpdateFinanceiroConfig();

  if (!fin) return <div className="main">Carregando…</div>;

  const tierStd = Number(fin.tier_standard);
  const tierPrem = Number(fin.tier_premium);
  const meta = fin.meta_vagas;
  const minV = fin.min_vagas;
  const confirmed = participants.filter((p) => p.pagamento_status === "confirmado");
  const recebido = confirmed.reduce((s, p) => s + Number(p.valor_pago || 0), 0);
  const custoTotal = custos.reduce((s, c) => s + custoValor(c), 0);
  const ticketMedio = (tierStd + tierPrem) / 2;
  const projecaoMax = meta * ticketMedio;
  const receitaMin = minV * tierStd;
  const margem = ((projecaoMax - custoTotal) / projecaoMax) * 100;

  return (
    <div className="main">
      <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <Metric icon="ti-chart-line" label="Projeção máxima de receita" value={fmtBRL(projecaoMax)} sub={`${meta} vagas × ${fmtBRL(ticketMedio)} médio`} cls="metric-ok" />
        <Metric icon="ti-cash" label="Receita mínima viável" value={fmtBRL(receitaMin)} sub={`${minV} vagas × ${fmtBRL(tierStd)}`} />
        <Metric icon="ti-trending-down" label="Custos e despesas totais" value={fmtBRL(custoTotal)} sub={`câmbio adotado R$ ${fin.cambio.toFixed(2).replace(".", ",")}`} cls="metric-warn" />
        <Metric icon="ti-chart-line" label="Margem bruta estimada" value={`~${margem.toFixed(0)}%`} sub="cenário meta / ticket médio" cls="metric-ok" />
        <Metric icon="ti-check" label="Recebido até agora" value={fmtBRL(recebido)} sub={`${confirmed.length} pagamento(s) confirmado(s)`} cls="metric-ok" />
      </div>
      <div className="nota-estrategica">
        <strong><i className="ti ti-info-circle" /> Nota:</strong> Os valores abaixo são editáveis. Os cenários de resultado são recalculados em tempo real.
      </div>
      <div className="section-label" style={{ marginTop: 0 }}>Configuração geral</div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-body" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <FinField label="Tier Cliente Matter (R$)" value={fin.tier_standard} onSave={(v) => update.mutate({ tier_standard: v })} />
          <FinField label="Vagas mínimas" value={fin.min_vagas} onSave={(v) => update.mutate({ min_vagas: v })} />
          <FinField label="Vagas meta" value={fin.meta_vagas} onSave={(v) => update.mutate({ meta_vagas: v })} />
        </div>
      </div>
      <div className="section-label">Receita por participante confirmado</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Participante</th><th>Tier</th><th>Valor (R$)</th><th>Contrato</th><th>Pagamento</th></tr></thead>
          <tbody>
            {confirmed.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text3)", padding: 16 }}>Aguardando confirmações de pagamento.</td></tr>}
            {confirmed.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td><span className={`badge ${p.tier === "premium" ? "badge-blue" : "badge-neutral"}`}>{p.tier === "premium" ? "Standard" : "Cliente Matter"}</span></td>
                <td style={{ fontWeight: 500 }}>{fmtBRL(Number(p.valor_pago))}</td>
                <td><span className={`badge ${p.contrato_status === "assinado" ? "badge-ok" : "badge-warn"}`}>{p.contrato_status === "assinado" ? "Assinado" : "Pendente"}</span></td>
                <td><span className="badge badge-ok">Confirmado</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="two-col">
        <CustosPanel custos={custos} custoTotal={custoTotal} />
        <div className="panel">
          <div className="panel-header"><i className="ti ti-chart-bar" /> Cenários de resultado</div>
          <div className="panel-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Cenario title={`Mínimo viável — ${minV} pax × ${fmtBRL(tierStd)}`} badge="Ponto de equilíbrio" badgeClass="badge-warn" receita={minV * tierStd} custo={custoTotal} bg="var(--surface2)" />
              <Cenario title={`Meta — ${meta} pax × ${fmtBRL(tierStd)}`} badge="Cenário alvo" badgeClass="badge-ok" receita={meta * tierStd} custo={custoTotal} bg="var(--teal-light)" accent="var(--teal)" />
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>* Custos reais dependem de confirmação com parceiros locais. Câmbio adotado: R$ {fin.cambio.toFixed(2).replace(".", ",")} / USD.</div>
          </div>
        </div>
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

function Cenario({ title, badge, badgeClass, receita, custo, bg, accent }: any) {
  const resultado = receita - custo;
  const pct = ((resultado / receita) * 100) || 0;
  return (
    <div style={{ background: bg, borderRadius: "var(--radius-sm)", padding: 14, border: accent ? `.5px solid ${accent}33` : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: accent ?? "var(--text2)" }}>{title}</div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text3)" }}>Receita bruta</span><span style={{ fontWeight: 500 }}>{fmtBRL(receita)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text3)" }}>Custo estimado</span><span style={{ color: "var(--accent)" }}>− {fmtBRL(custo)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8, paddingTop: 8, borderTop: ".5px solid var(--border)" }}>
        <span style={{ fontWeight: 500 }}>Resultado estimado</span>
        <span style={{ fontWeight: 500, color: "var(--teal)" }}>{fmtBRL(resultado)} ({pct.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

function FinField({ label, value, onSave, step }: { label: string; value: number; onSave: (v: number) => void; step?: string }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <div>
      <label className="form-label">{label}</label>
      <input className="form-input" type="number" step={step ?? "1"} value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => { const n = Number(v); if (!isNaN(n) && n !== value) onSave(n); }} />
    </div>
  );
}

function CustosPanel({ custos, custoTotal }: { custos: Custo[]; custoTotal: number }) {
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Custo | null>(null);
  // Sugestões: as categorias padrão + qualquer categoria livre já usada em custos existentes,
  // para reaproveitar nomes em vez de criar variações do mesmo conceito.
  const categoriasExistentes = Array.from(
    new Set([...CATEGORIAS_CUSTO.map((c) => c.label), ...custos.map((c) => categoriaLabel(c.categoria))]),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return (
    <div className="panel">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span><i className="ti ti-receipt" /> Estrutura de custos estimada</span>
        <button className="btn-primary" onClick={() => setCreating(true)} style={{ fontSize: 11, padding: "5px 10px" }}><i className="ti ti-plus" /> Novo custo</button>
      </div>
      <div className="panel-body">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {custos.length === 0 && <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: 12 }}>Nenhum custo cadastrado.</div>}
          {custos.map((c) => (
            <button key={c.id} onClick={() => setViewing(c)} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", paddingBottom: 8, borderBottom: ".5px solid var(--border)", background: "none", border: "none", borderBottomStyle: "solid", textAlign: "left", cursor: "pointer", width: "100%" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{c.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="badge badge-neutral" style={{ fontSize: 10 }}>{categoriaLabel(c.categoria)}</span>
                  {c.data_vencimento && <span className="badge badge-warn" style={{ fontSize: 10 }}><i className="ti ti-calendar" style={{ fontSize: 9 }} /> vence {new Date(c.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtBRL(custoValor(c))}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: ".5px solid var(--border-strong)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Total estimado</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--accent)" }}>{fmtBRL(custoTotal)}</span>
        </div>
      </div>
      {creating && <CustoFormModal open onClose={() => setCreating(false)} categoriasExistentes={categoriasExistentes} />}
      {viewing && <CustoDetailModal custo={viewing} onClose={() => setViewing(null)} categoriasExistentes={categoriasExistentes} />}
    </div>
  );
}

function CustoDetailModal({ custo, onClose, categoriasExistentes }: { custo: Custo; onClose: () => void; categoriasExistentes: string[] }) {
  const del = useDeleteCusto();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  if (editing) return <CustoFormModal open onClose={onClose} custo={custo} categoriasExistentes={categoriasExistentes} />;
  return (
    <Modal open onClose={onClose} title={custo.titulo}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <DetailRow label="Categoria" value={categoriaLabel(custo.categoria)} />
        {custo.descricao && <DetailRow label="Descrição" value={custo.descricao} />}
        <DetailRow label="Tipo" value={custo.tipo === "fixo" ? "Valor fixo" : custo.tipo === "variavel" ? "Valor variável" : "Fixo + variável"} />
        {(custo.tipo === "fixo" || custo.tipo === "ambos") && <DetailRow label="Valor fixo" value={fmtBRL(Number(custo.valor_fixo || 0))} />}
        {(custo.tipo === "variavel" || custo.tipo === "ambos") && <DetailRow label="Valor variável" value={fmtBRL(Number(custo.valor_variavel || 0))} />}
        <DetailRow label="Valor total" value={fmtBRL(custoValor(custo))} />
        <DetailRow label="Prazo / vencimento" value={custo.data_vencimento ? new Date(custo.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "Sem prazo definido"} />
      </div>
      <div className="flex-end">
        <button className="btn-secondary" onClick={() => setConfirmDel(true)}><i className="ti ti-trash" /> Excluir</button>
        <button className="btn-primary" onClick={() => setEditing(true)}><i className="ti ti-pencil" /> Editar</button>
      </div>
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => { del.mutate(custo.id); onClose(); }} title="Excluir custo" message="Tem certeza? Essa ação não pode ser desfeita." confirmLabel="Excluir" />
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>{label}</div><div style={{ fontSize: 13 }}>{value}</div></div>;
}

function CustoFormModal({ open, onClose, custo, categoriasExistentes }: { open: boolean; onClose: () => void; custo?: Custo; categoriasExistentes: string[] }) {
  const create = useCreateCusto();
  const update = useUpdateCusto();
  const [form, setForm] = useState({ categoria: custo?.categoria ?? "", titulo: custo?.titulo ?? "", descricao: custo?.descricao ?? "", tipo: custo?.tipo ?? "fixo", valor_fixo: custo?.valor_fixo ?? 0, valor_variavel: custo?.valor_variavel ?? 0, data_vencimento: custo?.data_vencimento ?? "" });
  const [erro, setErro] = useState<string | null>(null);
  const salvando = create.isPending || update.isPending;
  const submit = () => {
    if (!form.titulo.trim() || !form.categoria.trim()) {
      setErro("Preencha ao menos o título e a categoria.");
      return;
    }
    setErro(null);
    const patch = { ...form, categoria: form.categoria.trim(), data_vencimento: form.data_vencimento || null };
    const opts = {
      onSuccess: onClose,
      onError: () =>
        setErro("Não foi possível salvar o custo. Verifique a conexão com o banco e tente novamente."),
    };
    if (custo) update.mutate({ id: custo.id, patch }, opts);
    else create.mutate(patch, opts);
  };
  return (
    <Modal open={open} onClose={onClose} title={custo ? "Editar custo" : "Novo custo"}>
      <div className="form-group"><label className="form-label">Título *</label><input className="form-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Descrição</label><textarea className="form-textarea" style={{ minHeight: 70 }} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Categoria *</label>
          <input
            className="form-input"
            list="categorias-existentes"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            placeholder="Escolha uma existente ou digite uma nova"
          />
          <datalist id="categorias-existentes">
            {categoriasExistentes.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div className="form-group"><label className="form-label">Tipo de valor</label><select className="form-select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="fixo">Somente valor fixo</option><option value="variavel">Somente valor variável</option><option value="ambos">Fixo + variável</option></select></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {(form.tipo === "fixo" || form.tipo === "ambos") && <div className="form-group"><label className="form-label">Valor fixo (R$)</label><input className="form-input" type="number" value={form.valor_fixo} onChange={(e) => setForm({ ...form, valor_fixo: Number(e.target.value) })} /></div>}
        {(form.tipo === "variavel" || form.tipo === "ambos") && <div className="form-group"><label className="form-label">Valor variável (R$)</label><input className="form-input" type="number" value={form.valor_variavel} onChange={(e) => setForm({ ...form, valor_variavel: Number(e.target.value) })} /></div>}
        <div className="form-group"><label className="form-label">Prazo / vencimento</label><input className="form-input" type="date" value={form.data_vencimento ?? ""} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} /></div>
      </div>
      {erro && <div className="modal-inline-error"><i className="ti ti-alert-circle" /> {erro}</div>}
      <div className="flex-end">
        <button className="btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={salvando}>
          {salvando ? <i className="ti ti-loader-2 modal-spinner" /> : null} {custo ? "Salvar" : "Adicionar"}
        </button>
      </div>
    </Modal>
  );
}
