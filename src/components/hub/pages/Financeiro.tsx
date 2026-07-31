import { useState } from "react";
import {
  CATEGORIAS_CUSTO, categoriaLabel, custoValor, fmtBRL,
  useCreateCusto, useCustos, useDeleteCusto, useFinanceiroConfig,
  useParcelasPagamento, useParticipants, useUpdateCusto, useUpdateFinanceiroConfig,
  useUpdateParcelaPagamento, useUpdateParticipant,
  type Custo, type ParcelaPagamento, type Participant,
} from "@/lib/hub-api";
import { Modal, ConfirmDialog } from "@/components/hub/Modal";
import { SmartNumberInput } from "@/components/hub/SmartNumberInput";

const VALOR_CENARIO_POR_PESSOA = 90_000;

export function FinanceiroPage() {
  const { data: fin } = useFinanceiroConfig();
  const { data: participants = [] } = useParticipants();
  const { data: parcelas = [] } = useParcelasPagamento();
  const { data: custos = [] } = useCustos();
  const update = useUpdateFinanceiroConfig();
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  if (!fin) return <div className="main">Carregando…</div>;

  const meta = fin.meta_vagas;
  const signed = participants.filter((p) => p.contrato_status === "assinado");
  const signedIds = new Set(signed.map((p) => p.id));
  const parcelasContrato = parcelas.filter((parcela) => signedIds.has(parcela.participant_id));
  const parcelasPagas = parcelasContrato.filter((parcela) => parcela.paga);
  const totalContratos = signed.reduce((s, p) => s + Number(p.valor_pago || 0), 0);
  const recebido = parcelasPagas.reduce((s, parcela) => s + Number(parcela.valor || 0), 0);
  const aReceber = Math.max(0, totalContratos - recebido);
  const custoTotal = custos.reduce((s, c) => s + custoValor(c), 0);
  const margem = totalContratos > 0 ? ((totalContratos - custoTotal) / totalContratos) * 100 : 0;
  const localMode = parcelas.some((parcela) => parcela.local);
  const recebidoPorParticipante = new Map<string, number>();
  for (const parcela of parcelas.filter((item) => item.paga)) {
    recebidoPorParticipante.set(
      parcela.participant_id,
      (recebidoPorParticipante.get(parcela.participant_id) ?? 0) + Number(parcela.valor || 0),
    );
  }

  return (
    <div className="main">
      <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
        <Metric icon="ti-file-check" label="Valor total em contratos fechados" value={fmtBRL(totalContratos)} sub={`${signed.length} contrato(s) assinado(s)`} cls="metric-ok"
          tooltip="Soma do valor cheio de todos os participantes com contrato assinado. É a receita total já contratada, independentemente de quanto já foi pago." />
        <Metric icon="ti-check" label="Valor recebido" value={fmtBRL(recebido)} sub={`${parcelasPagas.length} parcela(s) paga(s)`} cls="metric-ok"
          tooltip="Soma de todas as parcelas marcadas como pagas nos contratos assinados. É o dinheiro efetivamente em caixa até agora." />
        <Metric icon="ti-clock-dollar" label="Valor a receber" value={fmtBRL(aReceber)} sub="contratos fechados menos recebido"
          tooltip="Saldo ainda a entrar: valor total em contratos fechados menos o valor já recebido. Cai a cada parcela paga e sobe quando um novo contrato é assinado." />
        <Metric icon="ti-trending-down" label="Custos e despesas totais" value={fmtBRL(custoTotal)} sub={`câmbio adotado R$ ${fin.cambio.toFixed(2).replace(".", ",")}`} cls="metric-warn"
          tooltip="Soma de todos os custos cadastrados na estrutura de custos abaixo, já convertidos pelo câmbio adotado (R$/USD)." />
        <Metric
          icon="ti-chart-line"
          label="Margem estimada"
          value={totalContratos > 0 ? `${margem.toFixed(0)}%` : "—"}
          sub={totalContratos > 0 ? `${fmtBRL(totalContratos - custoTotal)} após custos` : "aguardando contratos assinados"}
          cls={totalContratos > 0 && margem < 0 ? "metric-danger" : "metric-ok"}
          tooltip="Percentual da receita contratada que sobra depois de descontar todos os custos. Calculada como (contratos fechados − custos) ÷ contratos fechados."
        />
      </div>
      <div className="nota-estrategica">
        <strong><i className="ti ti-info-circle" /> Nota:</strong> Os valores abaixo são editáveis. Os cenários de resultado são recalculados em tempo real.
        {localMode && (
          <span style={{ marginLeft: 8 }}>
            <strong>Modo de teste local:</strong> datas e pagamentos das parcelas estão salvos somente neste navegador.
          </span>
        )}
      </div>
      <div className="section-label" style={{ marginTop: 0 }}>Configuração geral</div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-body" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          <FinField label="Tier Cliente Matter (R$)" value={fin.tier_standard} kind="currency" onSave={(v) => update.mutate({ tier_standard: v })} />
          <FinField label="Vagas mínimas" value={fin.min_vagas} kind="integer" onSave={(v) => update.mutate({ min_vagas: v })} />
          <FinField label="Vagas meta" value={fin.meta_vagas} kind="integer" onSave={(v) => update.mutate({ meta_vagas: v })} />
        </div>
      </div>
      <div className="section-label">Financeiro por participante</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Participante</th><th>Tier</th><th>Valor</th><th>Parcelas</th><th>Contrato</th><th>Recebido</th><th>A receber</th><th /></tr></thead>
          <tbody>
            {participants.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text3)", padding: 16 }}>Nenhum participante cadastrado ainda.</td></tr>}
            {participants.map((p) => {
              const participanteRecebido = recebidoPorParticipante.get(p.id) ?? 0;
              const contratoAssinado = p.contrato_status === "assinado";
              return (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td><span className={`badge ${p.tier === "premium" ? "badge-blue" : "badge-neutral"}`}>{p.tier === "premium" ? "Standard" : "Cliente Matter"}</span></td>
                  <td className="financial-number">{fmtBRL(Number(p.valor_pago))}</td>
                  <td><span className="badge badge-neutral">{Math.max(1, Number(p.parcelas) || 1)}x</span></td>
                  <td><span className={`badge ${contratoAssinado ? "badge-ok" : "badge-warn"}`}>{contratoAssinado ? "Assinado" : "Pendente"}</span></td>
                  <td className="financial-number" style={{ color: "var(--teal)" }}>{fmtBRL(participanteRecebido)}</td>
                  <td className="financial-number">{contratoAssinado ? fmtBRL(Math.max(0, Number(p.valor_pago) - participanteRecebido)) : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn-secondary" style={{ fontSize: 11, padding: "5px 9px" }} onClick={() => setEditingParticipant(p)}>
                      <i className="ti ti-pencil" /> Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="two-col">
        <CustosPanel custos={custos} custoTotal={custoTotal} />
        <div className="panel">
          <div className="panel-header"><i className="ti ti-chart-bar" /> Cenários de resultado</div>
          <div className="panel-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Cenario title={`Atual — ${signed.length} contrato(s) fechado(s)`} badge="Realizado" badgeClass={totalContratos >= custoTotal ? "badge-ok" : "badge-warn"} receita={totalContratos} custo={custoTotal} bg="var(--surface2)" />
              <Cenario title={`Meta — ${meta} pax × ${fmtBRL(VALOR_CENARIO_POR_PESSOA)}`} badge="Cenário alvo" badgeClass="badge-ok" receita={meta * VALOR_CENARIO_POR_PESSOA} custo={custoTotal} bg="var(--teal-light)" accent="var(--teal)" />
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 12 }}>* Custos reais dependem de confirmação com parceiros locais. Câmbio adotado: R$ {fin.cambio.toFixed(2).replace(".", ",")} / USD.</div>
          </div>
        </div>
      </div>
      {editingParticipant && (
        <ParticipantFinanceModal
          participant={editingParticipant}
          parcelas={parcelas.filter((parcela) => parcela.participant_id === editingParticipant.id)}
          onClose={() => setEditingParticipant(null)}
        />
      )}
    </div>
  );
}

function ParticipantFinanceModal({
  participant,
  parcelas,
  onClose,
}: {
  participant: Participant;
  parcelas: ParcelaPagamento[];
  onClose: () => void;
}) {
  const updateParticipant = useUpdateParticipant();
  const updateParcela = useUpdateParcelaPagamento();
  const [form, setForm] = useState({
    tier: participant.tier,
    valor_pago: Number(participant.valor_pago ?? 0),
    parcelas: Math.max(1, Number(participant.parcelas) || 1),
    contrato_status: participant.contrato_status,
  });
  const [error, setError] = useState<string | null>(null);
  const pagas = parcelas.filter((parcela) => parcela.paga);
  const maiorParcelaPaga = Math.max(0, ...pagas.map((parcela) => parcela.numero));
  const recebido = pagas.reduce((total, parcela) => total + Number(parcela.valor || 0), 0);
  const localMode = parcelas.some((parcela) => parcela.local);
  const quantidadePreview = Math.max(1, Math.floor(form.parcelas));
  const estruturaEmPrevia = quantidadePreview !== parcelas.length || form.valor_pago !== Number(participant.valor_pago || 0);
  const totalCentavosPreview = Math.round(form.valor_pago * 100);
  const baseCentavosPreview = Math.floor(totalCentavosPreview / quantidadePreview);
  const existentesPorNumero = new Map(parcelas.map((parcela) => [parcela.numero, parcela]));
  const parcelasExibidas = Array.from({ length: quantidadePreview }, (_, index) => {
    const numero = index + 1;
    const existente = existentesPorNumero.get(numero);
    const valorCentavos = numero === quantidadePreview
      ? totalCentavosPreview - baseCentavosPreview * (quantidadePreview - 1)
      : baseCentavosPreview;
    return existente
      ? { ...existente, valor: valorCentavos / 100, valor_manual: false }
      : {
        id: `preview:${participant.id}:${numero}`,
        participant_id: participant.id,
        numero,
        data_vencimento: null,
        valor: valorCentavos / 100,
        valor_manual: false,
        paga: false,
        data_pagamento: null,
        created_at: "",
        updated_at: "",
      };
  });

  const save = () => {
    const valor = form.valor_pago;
    const quantidade = Math.max(1, Math.floor(form.parcelas));
    if (!Number.isFinite(valor) || valor < 0 || !Number.isFinite(quantidade)) {
      setError("Informe um valor e uma quantidade de parcelas válidos.");
      return;
    }
    if (quantidade < maiorParcelaPaga) {
      setError(`Não é possível reduzir para ${quantidade} parcela(s), pois a ${maiorParcelaPaga}ª já foi paga.`);
      return;
    }
    setError(null);
    updateParticipant.mutate(
      {
        id: participant.id,
        patch: {
          tier: form.tier,
          valor_pago: valor,
          parcelas: quantidade,
          contrato_status: form.contrato_status,
        },
      },
      {
        onSuccess: onClose,
        onError: () => setError("Não foi possível salvar. Revise os dados e tente novamente."),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Financeiro — ${participant.nome}`}
      description="As alterações atualizam automaticamente os totais e a margem do dashboard."
      icon="ti-cash"
      size="lg"
    >
      {localMode && (
        <div className="nota-estrategica" style={{ marginBottom: 16 }}>
          <strong><i className="ti ti-device-desktop" /> Teste local:</strong> vencimentos e checkboxes ficam salvos somente neste navegador até a migration ser aplicada.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Tier</label>
          <select className="form-select" value={form.tier} onChange={(event) => setForm({ ...form, tier: event.target.value })}>
            <option value="standard">Cliente Matter</option>
            <option value="premium">Standard</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Contrato</label>
          <select className="form-select" value={form.contrato_status} onChange={(event) => setForm({ ...form, contrato_status: event.target.value })}>
            <option value="pendente">Pendente</option>
            <option value="assinado">Assinado</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Valor total do contrato (R$)</label>
          <SmartNumberInput
            value={form.valor_pago}
            kind="currency"
            min={0}
            ariaLabel="Valor total do contrato"
            onValueChange={(value) => setForm((current) => ({ ...current, valor_pago: value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Número de parcelas</label>
          <SmartNumberInput
            value={form.parcelas}
            kind="integer"
            min={1}
            ariaLabel="Número de parcelas"
            onValueChange={(value) => setForm((current) => ({ ...current, parcelas: value }))}
          />
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 8 }}>Parcelas deste participante</div>
      <div style={{ fontSize: 11, color: "var(--text3)", margin: "-5px 0 10px" }}>
        {estruturaEmPrevia
          ? "Prévia atualizada. Salve o financeiro para criar as novas parcelas e liberar a edição individual."
          : "Edite qualquer parcela. O saldo do contrato será redistribuído automaticamente entre as demais."}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th style={{ textAlign: "center" }}>Paga</th></tr></thead>
          <tbody>
            {parcelasExibidas.map((parcela) => (
              <tr key={parcela.id}>
                <td>{parcela.numero}ª de {parcelasExibidas.length}</td>
                <td>
                  <input
                    className="form-input"
                    type="date"
                    value={parcela.data_vencimento ?? ""}
                    disabled={estruturaEmPrevia}
                    onChange={(event) => updateParcela.mutate({
                      id: parcela.id,
                      patch: { data_vencimento: event.target.value || null },
                    })}
                    style={{ maxWidth: 180, padding: "6px 8px" }}
                  />
                </td>
                <td style={{ width: 160 }}>
                  <SmartNumberInput
                    value={Number(parcela.valor)}
                    kind="currency"
                    min={0}
                    ariaLabel={`Valor da ${parcela.numero}ª parcela`}
                    disabled={estruturaEmPrevia}
                    onCommit={(value) => {
                      if (estruturaEmPrevia) return;
                      if (value === Number(parcela.valor)) return;
                      setError(null);
                      updateParcela.mutate(
                        { id: parcela.id, patch: { valor: value } },
                        { onError: (cause) => setError(cause instanceof Error ? cause.message : "Não foi possível redistribuir as parcelas.") },
                      );
                    }}
                  />
                  {parcela.valor_manual && <span style={{ fontSize: 9, color: "var(--text3)" }}>ajuste manual</span>}
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={parcela.paga}
                    disabled={updateParcela.isPending || estruturaEmPrevia}
                    onChange={(event) => updateParcela.mutate({
                      id: parcela.id,
                      patch: { paga: event.target.checked },
                    })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12 }}>
        <span style={{ color: "var(--text3)" }}>{pagas.length} de {parcelasExibidas.length} parcela(s) paga(s)</span>
        <strong style={{ color: "var(--teal)" }}>Recebido: {fmtBRL(recebido)}</strong>
      </div>
      {error && <div className="modal-inline-error"><i className="ti ti-alert-circle" /> {error}</div>}
      <div className="flex-end">
        <button className="btn-secondary" onClick={onClose} disabled={updateParticipant.isPending}>Cancelar</button>
        <button className="btn-primary" onClick={save} disabled={updateParticipant.isPending}>
          {updateParticipant.isPending && <i className="ti ti-loader-2 modal-spinner" />} Salvar financeiro
        </button>
      </div>
    </Modal>
  );
}

function Metric({ icon, label, value, sub, cls, tooltip }: any) {
  return (
    <div className="metric-card">
      <div className="metric-label">
        <i className={`ti ${icon}`} />{label}
        {tooltip && (
          <span className="metric-info" tabIndex={0} data-tooltip={tooltip} aria-label={tooltip}>
            <i className="ti ti-info-circle" />
          </span>
        )}
      </div>
      <div className={`metric-value ${cls ?? ""}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function Cenario({ title, badge, badgeClass, receita, custo, bg, accent }: any) {
  const resultado = receita - custo;
  const pct = receita > 0 ? (resultado / receita) * 100 : 0;
  const resultColor = resultado >= 0 ? "var(--teal)" : "var(--danger)";
  return (
    <div style={{ background: bg, borderRadius: "var(--radius-sm)", padding: 14, border: accent ? `.5px solid ${accent}33` : "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: accent ?? "var(--text2)" }}>{title}</div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text3)" }}>Receita bruta</span><span className="financial-number">{fmtBRL(receita)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text3)" }}>Custo estimado</span><span className="financial-number" style={{ color: "var(--accent)" }}>− {fmtBRL(custo)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 8, paddingTop: 8, borderTop: ".5px solid var(--border)" }}>
        <span style={{ fontWeight: 500 }}>Resultado estimado</span>
        <span className="financial-number" style={{ color: resultColor }}>{fmtBRL(resultado)} ({pct.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

function FinField({
  label,
  value,
  onSave,
  kind,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
  kind: "currency" | "integer";
}) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <SmartNumberInput
        value={value}
        kind={kind}
        min={kind === "integer" ? 1 : 0}
        ariaLabel={label}
        onCommit={(next) => {
          if (next !== value) onSave(next);
        }}
      />
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
              <span className="financial-number" style={{ fontSize: 13 }}>{fmtBRL(custoValor(c))}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: ".5px solid var(--border-strong)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Total estimado</span>
          <span className="financial-number" style={{ fontSize: 14, color: "var(--accent)" }}>{fmtBRL(custoTotal)}</span>
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
        {(form.tipo === "fixo" || form.tipo === "ambos") && (
          <div className="form-group">
            <label className="form-label">Valor fixo (R$)</label>
            <SmartNumberInput
              value={Number(form.valor_fixo || 0)}
              kind="currency"
              min={0}
              ariaLabel="Valor fixo"
              onValueChange={(value) => setForm((current) => ({ ...current, valor_fixo: value }))}
            />
          </div>
        )}
        {(form.tipo === "variavel" || form.tipo === "ambos") && (
          <div className="form-group">
            <label className="form-label">Valor variável (R$)</label>
            <SmartNumberInput
              value={Number(form.valor_variavel || 0)}
              kind="currency"
              min={0}
              ariaLabel="Valor variável"
              onValueChange={(value) => setForm((current) => ({ ...current, valor_variavel: value }))}
            />
          </div>
        )}
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
