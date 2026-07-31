import { useState } from "react";
import {
  useCreateParticipant,
  useCreateLead,
  useDeleteParticipant,
  useParcelasPagamento,
  useParticipants,
  useUpdateParcelaPagamento,
  useUpdateParticipant,
  fmtBRL,
  type ParcelaPagamento,
  type Participant,
} from "@/lib/hub-api";
import { ConfirmDialog, Modal } from "@/components/hub/Modal";
import { EditableField } from "@/components/hub/Editable";
import { SmartNumberInput } from "@/components/hub/SmartNumberInput";
import { ParticipantTimeline } from "@/components/hub/ParticipantTimeline";

const STATUS_BADGE: Record<string, string> = {
  confirmado: "badge-ok",
  pendente: "badge-warn",
  parcial: "badge-blue",
  em_andamento: "badge-warn",
  contratado: "badge-ok",
};

function statusBadge(s: string) {
  return <span className={`badge ${STATUS_BADGE[s] ?? "badge-neutral"}`}>{labelStatus(s)}</span>;
}

function labelStatus(s: string) {
  return ({ confirmado: "Confirmado", pendente: "Pendente", parcial: "Parcial", em_andamento: "Em andamento", contratado: "Contratado" } as any)[s] ?? s;
}

function paymentStatus(parcelas: ParcelaPagamento[]) {
  const pagas = parcelas.filter((parcela) => parcela.paga).length;
  if (parcelas.length > 0 && pagas === parcelas.length) return "confirmado";
  if (pagas > 0) return "parcial";
  return "pendente";
}

/** null/"" = ainda não respondeu essa etapa do formulário (alguns registros mais antigos, sem
 * origem no formulário, gravam "" em vez de null — tratamos os dois como "não informado");
 * "Nenhuma" = respondeu que não tem restrição; qualquer outro texto = respondeu que tem, com o detalhe. */
function restricaoBadge(v: string | null) {
  if (!v) return <span className="badge badge-neutral">Não informado</span>;
  if (v === "Nenhuma") return <span className="badge badge-ok">Nenhuma</span>;
  return <span className="badge badge-warn">{v}</span>;
}

// O `download` do HTML não força nada em recurso de outra origem (o storage do Supabase é
// outro domínio) — por isso o parâmetro `?download`, que o Supabase Storage entende
// nativamente (em URL pública ou assinada) e responde com Content-Disposition: attachment.
function photoDownloadUrl(p: Participant): string {
  const filename = encodeURIComponent(`${p.nome.replace(/\s+/g, "_")}.jpg`);
  return `${p.foto_url}${p.foto_url!.includes("?") ? "&" : "?"}download=${filename}`;
}

const vd = (p: Participant, campo: string, volta = false) => {
  const detalhes = volta ? p.voo_volta_detalhes : p.voo_detalhes;
  const v = detalhes?.[campo];
  return v == null ? "" : String(v);
};

/** O formulário grava "Nenhuma" quando o participante respondeu explicitamente que não tem —
 * null continua significando "ainda não respondeu essa etapa", nunca "não tem". */
const NAO_INFORMADO = "Não informado no formulário";
const alergiaExcel = (v: string | null) => (!v ? "Não informado" : v === "Nenhuma" ? "Não" : v);
const passagemExcel = (p: Participant) =>
  vd(p, "comprada") === "sim" ? "Sim" : vd(p, "comprada") === "nao" ? "Não" : "Não informado";

/** yyyy-mm-dd sem componente de hora → data "pura" em UTC, para o serial do Excel bater
 * com o dia exibido independente do fuso de quem abre o arquivo. */
const dataParaExcel = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

/** Timestamp com hora → preserva o horário local "disfarçado" de UTC, já que o Excel
 * calcula o serial a partir de getTime() sem qualquer ajuste de fuso. */
const dataHoraParaExcel = (ts: string): Date => {
  const d = new Date(ts);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
};

type ColunaParticipante = {
  header: string;
  key: string;
  width: number;
  kind?: "date" | "datetime" | "currency";
  get: (p: Participant) => string | number | null;
};

const COLUNAS_PARTICIPANTE: ColunaParticipante[] = [
  { header: "Nome", key: "nome", width: 20, get: (p) => p.nome ?? "" },
  { header: "Nome completo", key: "nome_completo", width: 24, get: (p) => p.nome_completo ?? "" },
  { header: "Cargo", key: "cargo", width: 20, get: (p) => p.cargo ?? "" },
  { header: "Empresa", key: "empresa", width: 20, get: (p) => p.empresa ?? "" },
  { header: "Perfil da empresa", key: "empresa_perfil", width: 32, get: (p) => p.empresa_perfil ?? "" },
  { header: "Áreas de interesse", key: "areas_interesse", width: 32, get: (p) => p.areas_interesse ?? "" },
  { header: "Site da empresa", key: "empresa_site", width: 24, get: (p) => p.empresa_site ?? "" },
  { header: "Cidade", key: "cidade", width: 18, get: (p) => p.cidade ?? "" },
  { header: "E-mail", key: "email", width: 26, get: (p) => p.email ?? "" },
  { header: "WhatsApp", key: "telefone", width: 16, get: (p) => p.telefone ?? "" },
  { header: "Nacionalidade", key: "nacionalidade", width: 16, get: (p) => p.nacionalidade ?? "" },
  { header: "Nascimento", key: "data_nascimento", width: 14, kind: "date", get: (p) => p.data_nascimento },
  { header: "Passaporte", key: "passaporte", width: 16, get: (p) => p.passaporte ?? "" },
  {
    header: "Passaporte — emissão",
    key: "passaporte_emissao",
    width: 14,
    kind: "date",
    get: (p) => p.passaporte_emissao,
  },
  {
    header: "Passaporte — validade",
    key: "passaporte_validade",
    width: 14,
    kind: "date",
    get: (p) => p.passaporte_validade,
  },
  { header: "Tipo sanguíneo", key: "tipo_sanguineo", width: 12, get: (p) => p.tipo_sanguineo ?? "" },
  {
    header: "Restrições alimentares",
    key: "restricoes_alimentares",
    width: 22,
    get: (p) => alergiaExcel(p.restricoes_alimentares),
  },
  { header: "Alergias a medicamentos", key: "alergias", width: 22, get: (p) => alergiaExcel(p.alergias) },
  {
    header: "Observações médicas",
    key: "observacoes_medicas",
    width: 26,
    get: (p) => p.observacoes_medicas ?? "",
  },
  { header: "Medicamentos", key: "medicamentos", width: 20, get: (p) => p.medicamentos ?? "" },
  {
    header: "Contato de emergência",
    key: "contato_emergencia",
    width: 24,
    get: (p) => p.contato_emergencia ?? "",
  },
  { header: "Camisa", key: "tamanho_camisa", width: 10, get: (p) => p.tamanho_camisa ?? "" },
  { header: "Blazer", key: "tamanho_blazer", width: 10, get: (p) => p.tamanho_blazer ?? "" },
  { header: "Foto enviada", key: "foto", width: 12, get: (p) => (p.foto_url ? "Sim" : "Não") },
  { header: "Quarto", key: "quarto", width: 12, get: (p) => p.quarto ?? "" },
  { header: "Seguro viagem", key: "seguro_status", width: 14, get: (p) => p.seguro_status ?? "" },
  { header: "Uso de imagem", key: "uso_imagem_status", width: 14, get: (p) => p.uso_imagem_status ?? "" },
  {
    header: "Passagem comprada",
    key: "passagem_comprada",
    width: 16,
    get: passagemExcel,
  },
  { header: "Compra via", key: "compra_via", width: 16, get: (p) => vd(p, "empresa_compra") },
  { header: "Ida — status", key: "voo_ida_status", width: 14, get: (p) => p.voo_ida_status ?? "" },
  { header: "Ida — Cia aérea", key: "ida_cia", width: 16, get: (p) => vd(p, "cia") },
  { header: "Ida — Voo", key: "ida_numero", width: 12, get: (p) => vd(p, "numero") },
  { header: "Ida — Classe", key: "ida_classe", width: 12, get: (p) => vd(p, "classe") },
  { header: "Ida — Origem", key: "ida_origem", width: 14, get: (p) => vd(p, "origem") },
  { header: "Ida — Conexões", key: "ida_conexoes", width: 16, get: (p) => vd(p, "conexoes") },
  { header: "Ida — Destino", key: "ida_destino", width: 14, get: (p) => vd(p, "destino") },
  {
    header: "Ida — Embarque",
    key: "ida_embarque",
    width: 14,
    kind: "date",
    get: (p) => vd(p, "data_embarque") || null,
  },
  { header: "Ida — Partida", key: "ida_partida", width: 12, get: (p) => vd(p, "partida") },
  { header: "Ida — Chegada", key: "ida_chegada", width: 12, get: (p) => vd(p, "chegada") },
  { header: "Ida — Terminal", key: "ida_terminal", width: 12, get: (p) => vd(p, "terminal") },
  { header: "Volta — status", key: "voo_volta_status", width: 14, get: (p) => p.voo_volta_status ?? "" },
  { header: "Volta — Cia aérea", key: "volta_cia", width: 16, get: (p) => vd(p, "cia", true) },
  { header: "Volta — Voo", key: "volta_numero", width: 12, get: (p) => vd(p, "numero", true) },
  { header: "Volta — Classe", key: "volta_classe", width: 12, get: (p) => vd(p, "classe", true) },
  { header: "Volta — Origem", key: "volta_origem", width: 14, get: (p) => vd(p, "origem", true) },
  { header: "Volta — Conexões", key: "volta_conexoes", width: 16, get: (p) => vd(p, "conexoes", true) },
  { header: "Volta — Destino", key: "volta_destino", width: 14, get: (p) => vd(p, "destino", true) },
  {
    header: "Volta — Embarque",
    key: "volta_embarque",
    width: 14,
    kind: "date",
    get: (p) => vd(p, "data_embarque", true) || null,
  },
  { header: "Volta — Partida", key: "volta_partida", width: 12, get: (p) => vd(p, "partida", true) },
  { header: "Volta — Chegada", key: "volta_chegada", width: 12, get: (p) => vd(p, "chegada", true) },
  { header: "Volta — Terminal", key: "volta_terminal", width: 12, get: (p) => vd(p, "terminal", true) },
  { header: "Tier", key: "tier", width: 12, get: (p) => p.tier ?? "" },
  { header: "Valor pago (R$)", key: "valor_pago", width: 16, kind: "currency", get: (p) => p.valor_pago ?? 0 },
  { header: "Parcelas", key: "parcelas", width: 10, get: (p) => p.parcelas ?? "" },
  { header: "Pagamento", key: "pagamento_status", width: 14, get: (p) => p.pagamento_status ?? "" },
  { header: "Contrato", key: "contrato_status", width: 14, get: (p) => p.contrato_status ?? "" },
  { header: "Status geral", key: "status", width: 14, get: (p) => p.status ?? "" },
  { header: "Origem do cadastro", key: "origem", width: 16, get: (p) => p.origem ?? "" },
  { header: "Observações", key: "observacoes", width: 32, get: (p) => p.observacoes ?? "" },
  { header: "Cadastrado em", key: "created_at", width: 18, kind: "datetime", get: (p) => p.created_at },
];

const COR_MARCA = "FFC0392B";
const COR_MARCA_ESCURA = "FF922017";

/** Gera e baixa a planilha .xlsx com todos os campos dos participantes, com cabeçalho fixo,
 * filtro automático, larguras por coluna e zebra listrada — sempre em dia porque lê direto do
 * estado já sincronizado com o Supabase (a mesma base de dados exibida na tabela). */
async function exportarPlanilha(list: Participant[]) {
  if (!list.length) return;
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Academy China 2026";
  wb.created = new Date();

  const ws = wb.addWorksheet("Participantes", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { tabColor: { argb: COR_MARCA } },
  });

  ws.columns = COLUNAS_PARTICIPANTE.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  list.forEach((p) => {
    const linha: Record<string, unknown> = {};
    COLUNAS_PARTICIPANTE.forEach((c) => {
      const raw = c.get(p);
      if (c.kind === "date") linha[c.key] = dataParaExcel(raw as string);
      else if (c.kind === "datetime") linha[c.key] = dataHoraParaExcel(raw as string);
      else linha[c.key] = raw;
    });
    ws.addRow(linha);
  });

  COLUNAS_PARTICIPANTE.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.kind === "date") col.numFmt = "dd/mm/yyyy";
    else if (c.kind === "datetime") col.numFmt = "dd/mm/yyyy hh:mm";
    else if (c.kind === "currency") col.numFmt = '"R$" #,##0.00';
  });

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_MARCA } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = { bottom: { style: "medium", color: { argb: COR_MARCA_ESCURA } } };
  });

  for (let i = 2; i <= list.length + 1; i++) {
    const row = ws.getRow(i);
    row.height = 18;
    const fundo = i % 2 === 0 ? "FFF7F6F3" : "FFFFFFFF";
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fundo } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E2DC" } } };
      cell.alignment = { vertical: "middle" };
      cell.font = { color: { argb: "FF1A1A18" }, size: 10.5 };
    });
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUNAS_PARTICIPANTE.length } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `participantes-academy-china-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Dispara um download por vez, escalonado — abrir vários <a download> juntos costuma ser
 * bloqueado ou parcialmente ignorado pelo navegador. */
function downloadPhotosSequentially(participants: Participant[]) {
  participants.forEach((p, i) => {
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = photoDownloadUrl(p);
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, i * 400);
  });
}

export function ParticipantesPage({ openId, setOpenId }: { openId: string | null; setOpenId: (id: string | null) => void }) {
  const { data: all = [] } = useParticipants();
  const { data: allParcelas = [] } = useParcelasPagamento();
  // Conta como participante quem já assinou contrato OU respondeu o formulário público
  // (mesmo critério da coluna "Entrada" no Kanban de pré-viagem).
  const list = all.filter((p) => p.contrato_status === "assinado" || p.origem === "formulario");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState(false);

  if (openId) {
    // Busca em `all`, não em `list`: participantes recém-criados (ex.: pelo formulário) ainda
    // sem contrato assinado precisam ser visualizáveis a partir do Kanban/funil.
    const p = all.find((x) => x.id === openId);
    if (p) return <ProfileView participant={p} onBack={() => setOpenId(null)} />;
  }

  const withPhoto = list.filter((p) => p.foto_url);
  const allWithPhotoSelected = withPhoto.length > 0 && withPhoto.every((p) => selected.has(p.id));
  const toggleAll = () => setSelected(allWithPhotoSelected ? new Set() : new Set(withPhoto.map((p) => p.id)));
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectedWithPhoto = list.filter((p) => selected.has(p.id) && p.foto_url);

  return (
    <div className="main">
      <div className="flex-between mb-16">
        <div className="section-label" style={{ margin: 0 }}>Participantes</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 12, padding: "7px 14px" }}
            onClick={async () => {
              setExportando(true);
              try {
                await exportarPlanilha(list);
              } finally {
                setExportando(false);
              }
            }}
            disabled={list.length === 0 || exportando}
          >
            <i className={exportando ? "ti ti-loader-2" : "ti ti-download"} /> {exportando ? "Gerando planilha…" : "Baixar planilha"}
          </button>
          {selectedWithPhoto.length > 0 && (
            <button
              className="btn-secondary"
              style={{ fontSize: 12, padding: "7px 14px" }}
              onClick={() => downloadPhotosSequentially(selectedWithPhoto)}
            >
              <i className="ti ti-download" /> Baixar {selectedWithPhoto.length} foto{selectedWithPhoto.length > 1 ? "s" : ""}
            </button>
          )}
          <button className="btn-primary" onClick={() => setCreating(true)} style={{ fontSize: 12, padding: "7px 14px" }}>
            <i className="ti ti-plus" /> Novo cliente
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={allWithPhotoSelected} onChange={toggleAll} disabled={withPhoto.length === 0} title="Selecionar todos com foto" />
              </th>
              <th>Nome</th><th>Cargo</th><th>Empresa</th><th>Cidade</th><th>WhatsApp</th><th>Restrições</th><th>Seguro</th><th>Voo</th><th>Pagamento</th><th>Status</th><th>Foto</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={12} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>Ainda nenhum participante cadastrado. Adicione o primeiro.</td></tr>
            )}
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} disabled={!p.foto_url} title={p.foto_url ? "Selecionar" : "Sem foto"} />
                </td>
                <td><button className="p-link" onClick={() => setOpenId(p.id)}>{p.nome}</button></td>
                <td>{p.cargo ?? "—"}</td>
                <td>{p.empresa ?? "—"}</td>
                <td>{p.cidade ?? "—"}</td>
                <td>{p.telefone ?? "—"}</td>
                <td>{restricaoBadge(p.restricoes_alimentares)}</td>
                <td>{statusBadge(p.seguro_status)}</td>
                <td>{statusBadge(p.voo_ida_status)}</td>
                <td>{statusBadge(paymentStatus(allParcelas.filter((parcela) => parcela.participant_id === p.id)))}</td>
                <td>{statusBadge(p.status)}</td>
                <td>
                  {p.foto_url ? (
                    <a className="p-link" href={photoDownloadUrl(p)} title="Baixar foto"><i className="ti ti-download" /> Baixar</a>
                  ) : (
                    <span style={{ color: "var(--text3)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <NovoClienteModal open onClose={() => setCreating(false)} />}
    </div>
  );
}

function NovoClienteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateLead();
  const [form, setForm] = useState({ nome: "", cargo: "", empresa: "", cidade: "", responsavel: "caetano", status: "abordado" });
  const submit = () => {
    if (!form.nome.trim()) return;
    create.mutate({ ...form, passo: 1, ordem: 0 }, { onSuccess: onClose });
  };
  return (
    <Modal open={open} onClose={onClose} title="Novo cliente">
      <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14 }}>
        O cliente entrará em <strong>P1 — Início do funil comercial</strong>.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group" style={{ gridColumn: "span 2" }}>
          <label className="form-label">Nome *</label>
          <input className="form-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Cargo</label>
          <input className="form-input" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Empresa</label>
          <input className="form-input" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Cidade</label>
          <input className="form-input" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Responsável</label>
          <select className="form-select" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })}>
            <option value="caetano">Caetano</option>
            <option value="roque">Roque</option>
            <option value="ambos">Caetano + Roque</option>
          </select>
        </div>
      </div>
      <div className="flex-end">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit}>Adicionar ao funil</button>
      </div>
    </Modal>
  );
}

export function ParticipantModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<Participant> }) {
  const create = useCreateParticipant();
  const [form, setForm] = useState<Partial<Participant>>({
    nome: "", cargo: "", empresa: "", cidade: "", telefone: "", email: "",
    restricoes_alimentares: "", observacoes: "", tier: "standard", valor_pago: 93600,
    pagamento_status: "pendente", status: "em_andamento", ...initial,
  });

  const submit = () => {
    if (!form.nome?.trim()) return;
    create.mutate(form, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo participante">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div className="form-group" style={{ gridColumn: "span 2" }}>
          <label className="form-label">Nome *</label>
          <input className="form-input" value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="form-group"><label className="form-label">Cargo</label><input className="form-input" value={form.cargo ?? ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Empresa</label><input className="form-input" value={form.empresa ?? ""} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Cidade</label><input className="form-input" value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">WhatsApp</label><input className="form-input" value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Restrições alimentares</label><input className="form-input" value={form.restricoes_alimentares ?? ""} onChange={(e) => setForm({ ...form, restricoes_alimentares: e.target.value })} /></div>
        <div className="form-group">
          <label className="form-label">Tier</label>
          <select className="form-select" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value, valor_pago: e.target.value === "premium" ? 109200 : 93600 })}>
            <option value="standard">Cliente Matter (R$ 93.600)</option>
            <option value="premium">Standard (R$ 109.200)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <SmartNumberInput
            value={Number(form.valor_pago ?? 0)}
            kind="currency"
            min={0}
            ariaLabel="Valor do contrato"
            onValueChange={(value) => setForm((current) => ({ ...current, valor_pago: value }))}
          />
        </div>
        <div className="form-group" style={{ gridColumn: "span 2" }}>
          <label className="form-label">Observações</label>
          <textarea className="form-textarea" style={{ minHeight: 80 }} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </div>
      </div>
      <div className="flex-end">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit}>Adicionar</button>
      </div>
    </Modal>
  );
}

function ProfileView({ participant, onBack }: { participant: Participant; onBack: () => void }) {
  const update = useUpdateParticipant();
  const del = useDeleteParticipant();
  const { data: parcelas = [], isLoading: loadingParcelas, isError: parcelasError } = useParcelasPagamento(participant.id);
  const [confirmDel, setConfirmDel] = useState(false);
  const p = participant;
  const initials = (p.nome || "?").split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const save = (patch: Partial<Participant>) => update.mutate({ id: p.id, patch });

  return (
    <div className="main">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="back-btn" onClick={onBack}><i className="ti ti-arrow-left" style={{ fontSize: 13 }} /> Voltar para participantes</button>
        <button className="btn-danger-outline" onClick={() => setConfirmDel(true)}><i className="ti ti-trash" /> Excluir participante</button>
      </div>
      <div className="participant-header-card">
        {p.foto_url ? (
          <img src={p.foto_url} alt={p.nome} className="participant-avatar" style={{ objectFit: "cover" }} />
        ) : (
          <div className="participant-avatar">{initials}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{p.nome}</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 2 }}>{[p.cargo, p.empresa, p.cidade].filter(Boolean).join(" · ")}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {statusBadge(paymentStatus(parcelas))}
            <span className={`badge ${p.voo_ida_status === "confirmado" ? "badge-ok" : "badge-warn"}`}>Voo {p.voo_ida_status === "confirmado" ? "confirmado" : "pendente"}</span>
          </div>
        </div>
        {p.foto_url ? (
          <a
            className="btn-secondary"
            href={photoDownloadUrl(p)}
            style={{ fontSize: 12, padding: "7px 14px", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <i className="ti ti-download" /> Baixar foto
          </a>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>Nenhuma foto enviada no formulário</span>
        )}
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><i className="ti ti-id-badge" /> Dados pessoais</div>
          <div className="panel-body">
            <ProfileTable rows={[["Nome completo","nome_completo"],["Nacionalidade","nacionalidade"],["Data de nascimento","data_nascimento"],["WhatsApp","telefone"],["E-mail","email"],["Cidade / estado","cidade"],["Contato emergência","contato_emergencia"],["Tipo sanguíneo","tipo_sanguineo"]]} participant={p} onSave={save} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><i className="ti ti-stamp" /> Passaporte</div>
          <div className="panel-body">
            <ProfileTable rows={[["Número","passaporte"],["Emissão","passaporte_emissao"],["Validade","passaporte_validade"]]} participant={p} onSave={save} />
          </div>
        </div>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><i className="ti ti-briefcase" /> Perfil profissional (formulário)</div>
          <div className="panel-body">
            <ProfileTable rows={[["Empresa","empresa"],["Cargo","cargo"],["Perfil da empresa","empresa_perfil"],["Áreas de interesse","areas_interesse"],["Site","empresa_site"]]} participant={p} onSave={save} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><i className="ti ti-shirt" /> Vestuário</div>
          <div className="panel-body">
            <ProfileTable rows={[["Tamanho da camisa","tamanho_camisa"],["Tamanho do blazer","tamanho_blazer"]]} participant={p} onSave={save} />
          </div>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><i className="ti ti-plane" /> Passagem de ida (respondida no formulário)</div>
        <div className="panel-body">
          {p.voo_detalhes ? (
            <VooDetalhesTable detalhes={p.voo_detalhes} />
          ) : (
            <p style={{ fontSize: 12, color: "var(--text3)", padding: "6px 0" }}>{NAO_INFORMADO}.</p>
          )}
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><i className="ti ti-plane" /> Passagem de volta (respondida no formulário)</div>
        <div className="panel-body">
          {p.voo_volta_detalhes ? (
            <VooDetalhesTable detalhes={p.voo_volta_detalhes} />
          ) : (
            <p style={{ fontSize: 12, color: "var(--text3)", padding: "6px 0" }}>{NAO_INFORMADO}.</p>
          )}
        </div>
      </div>
      <div className="two-col">
        <div className="panel">
          <div className="panel-header"><i className="ti ti-plane" /> Logística</div>
          <div className="panel-body">
            <ProfileTable rows={[["Origem","origem"],["Quarto","quarto"]]} participant={p} onSave={save} />
            <StatusRow label="Seguro viagem" field="seguro_status" value={p.seguro_status} onSave={save} options={["pendente","contratado"]} />
            <StatusRow label="Voo de ida" field="voo_ida_status" value={p.voo_ida_status} onSave={save} options={["pendente","confirmado"]} />
            <StatusRow label="Voo de volta" field="voo_volta_status" value={p.voo_volta_status} onSave={save} options={["pendente","confirmado"]} />
            <StatusRow label="Uso de imagem" field="uso_imagem_status" value={p.uso_imagem_status} onSave={save} options={["pendente","assinado"]} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-header"><i className="ti ti-cash" /> Financeiro</div>
          <div className="panel-body">
            <StatusRow label="Tier" field="tier" value={p.tier} onSave={save} options={["standard","premium"]} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>Valor (R$)</span>
              <div style={{ width: 160 }}>
                <SmartNumberInput
                  value={Number(p.valor_pago || 0)}
                  kind="currency"
                  min={0}
                  ariaLabel="Valor do contrato"
                  onCommit={(value) => {
                    if (value !== Number(p.valor_pago || 0)) save({ valor_pago: value });
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>Parcelas (x)</span>
              <div style={{ width: 92 }}>
                <SmartNumberInput
                  value={Math.max(1, Number(p.parcelas) || 1)}
                  kind="integer"
                  min={1}
                  ariaLabel="Número de parcelas"
                  onCommit={(value) => {
                    if (value !== Math.max(1, Number(p.parcelas) || 1)) save({ parcelas: value });
                  }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12 }}>
              <span style={{ color: "var(--text3)" }}>Valor por parcela (R$)</span>
              <span style={{ fontWeight: 500 }}>
                {((p.valor_pago ?? 0) / Math.max(1, p.parcelas ?? 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <StatusRow label="Contrato" field="contrato_status" value={p.contrato_status} onSave={save} options={["pendente","assinado"]} />
          </div>
        </div>
      </div>
      <ParcelasPagamentoPanel parcelas={parcelas} loading={loadingParcelas} error={parcelasError} />
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><i className="ti ti-meat" /> Saúde & restrições</div>
        <div className="panel-body">
          <ProfileTable
            rows={[
              ["Restrições alimentares", "restricoes_alimentares", NAO_INFORMADO],
              ["Alergias a medicamentos", "alergias", NAO_INFORMADO],
              ["Observações médicas", "observacoes_medicas"],
              ["Medicamentos", "medicamentos"],
            ]}
            participant={p}
            onSave={save}
          />
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><i className="ti ti-timeline" /> Histórico & observações</div>
        <div className="panel-body">
          <ParticipantTimeline participantId={p.id} participantName={p.nome} legacyNote={p.observacoes} />
        </div>
      </div>
      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={() => del.mutate(p.id, { onSuccess: onBack })} title="Excluir participante" message={`Tem certeza que deseja excluir ${p.nome}? Essa ação não pode ser desfeita.`} confirmLabel="Excluir" />
    </div>
  );
}

function ParcelasPagamentoPanel({
  parcelas,
  loading,
  error,
}: {
  parcelas: ParcelaPagamento[];
  loading: boolean;
  error: boolean;
}) {
  const update = useUpdateParcelaPagamento();
  const recebido = parcelas
    .filter((parcela) => parcela.paga)
    .reduce((total, parcela) => total + Number(parcela.valor || 0), 0);
  const total = parcelas.reduce((sum, parcela) => sum + Number(parcela.valor || 0), 0);
  const localMode = parcelas.some((parcela) => parcela.local);

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span><i className="ti ti-calendar-dollar" /> Parcelas de pagamento</span>
        {!loading && !error && (
          <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400 }}>
            {localMode && <span className="badge badge-warn" style={{ marginRight: 8 }}>Teste local</span>}
            Recebido: <strong style={{ color: "var(--teal)" }}>{fmtBRL(recebido)}</strong> de {fmtBRL(total)}
          </span>
        )}
      </div>
      <div className="panel-body">
        {loading && <div style={{ fontSize: 12, color: "var(--text3)", padding: 8 }}>Carregando parcelas…</div>}
        {error && (
          <div className="modal-inline-error">
            <i className="ti ti-alert-circle" /> Não foi possível carregar as parcelas. Verifique se a migration do banco foi aplicada.
          </div>
        )}
        {!loading && !error && parcelas.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: 12 }}>
            As parcelas serão criadas automaticamente a partir dos dados financeiros.
          </div>
        )}
        {!loading && !error && parcelas.length > 0 && (
          <div className="table-wrap" style={{ border: "none" }}>
            <table>
              <thead>
                <tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th style={{ textAlign: "center" }}>Paga</th></tr>
              </thead>
              <tbody>
                {parcelas.map((parcela) => (
                  <tr key={parcela.id}>
                    <td style={{ fontWeight: 500 }}>{parcela.numero}ª parcela</td>
                    <td>
                      <input
                        className="form-input"
                        type="date"
                        aria-label={`Vencimento da ${parcela.numero}ª parcela`}
                        value={parcela.data_vencimento ?? ""}
                        onChange={(event) => update.mutate({
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
                        onCommit={(value) => {
                          if (value !== Number(parcela.valor)) {
                            update.mutate({ id: parcela.id, patch: { valor: value } });
                          }
                        }}
                      />
                      {parcela.valor_manual && <span style={{ fontSize: 9, color: "var(--text3)" }}>ajuste manual</span>}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        aria-label={`Confirmar pagamento da ${parcela.numero}ª parcela`}
                        checked={parcela.paga}
                        disabled={update.isPending}
                        onChange={(event) => update.mutate({
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
        )}
      </div>
    </div>
  );
}

function ProfileTable({ rows, participant, onSave }: { rows: [string, keyof Participant, string?][]; participant: Participant; onSave: (patch: Partial<Participant>) => void }) {
  return (
    <table style={{ width: "100%", fontSize: 12, border: "none", borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(([label, field, placeholder]) => (
          <tr key={field as string}>
            <td style={{ color: "var(--text3)", padding: "6px 0", width: "42%" }}>{label}</td>
            <td style={{ padding: "6px 0" }}>
              <EditableField
                value={(participant[field] as any) ?? ""}
                onSave={(v) => onSave({ [field]: v } as any)}
                {...(placeholder ? { placeholder } : {})}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const VOO_LABELS: Record<string, string> = {
  comprada: "Passagem já comprada?",
  empresa_compra: "Empresa/agência da compra",
  cia: "Companhia aérea",
  numero: "Número do voo",
  classe: "Classe",
  origem: "Origem",
  conexoes: "Conexões",
  destino: "Destino",
  data_embarque: "Data do embarque",
  partida: "Partida",
  chegada: "Chegada",
  terminal: "Terminal",
};
const VOO_ORDER = ["comprada", "empresa_compra", "cia", "numero", "classe", "origem", "conexoes", "destino", "data_embarque", "partida", "chegada", "terminal"];

/** Somente leitura: dados do voo respondidos no formulário (jsonb), sem os campos editáveis do CRM. */
function VooDetalhesTable({ detalhes }: { detalhes: Record<string, unknown> }) {
  return (
    <table style={{ width: "100%", fontSize: 12, border: "none", borderCollapse: "collapse" }}>
      <tbody>
        {VOO_ORDER.filter((k) => detalhes[k]).map((k) => (
          <tr key={k}>
            <td style={{ color: "var(--text3)", padding: "6px 0", width: "42%" }}>{VOO_LABELS[k]}</td>
            <td style={{ padding: "6px 0" }}>{k === "comprada" ? (detalhes[k] === "sim" ? "Sim" : "Não") : String(detalhes[k])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusRow({ label, field, value, options, onSave }: { label: string; field: keyof Participant; value: string; options: string[]; onSave: (patch: Partial<Participant>) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", alignItems: "center", fontSize: 12 }}>
      <span style={{ color: "var(--text3)" }}>{label}</span>
      <select className="tier-select-inline" value={value} onChange={(e) => onSave({ [field]: e.target.value } as any)}>
        {options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  );
}

