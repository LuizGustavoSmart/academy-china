import { useState } from "react";
import {
  useCreateParticipant,
  useCreateLead,
  useDeleteParticipant,
  useParticipants,
  useUpdateParticipant,
  type Participant,
} from "@/lib/hub-api";
import { ConfirmDialog, Modal } from "@/components/hub/Modal";
import { EditableField } from "@/components/hub/Editable";
import { ParticipantTimeline } from "@/components/hub/ParticipantTimeline";

const STATUS_BADGE: Record<string, string> = {
  confirmado: "badge-ok",
  pendente: "badge-warn",
  em_andamento: "badge-warn",
  contratado: "badge-ok",
};

function statusBadge(s: string) {
  return <span className={`badge ${STATUS_BADGE[s] ?? "badge-neutral"}`}>{labelStatus(s)}</span>;
}

function labelStatus(s: string) {
  return ({ confirmado: "Confirmado", pendente: "Pendente", em_andamento: "Em andamento", contratado: "Contratado" } as any)[s] ?? s;
}

// O `download` do HTML não força nada em recurso de outra origem (o storage do Supabase é
// outro domínio) — por isso o parâmetro `?download`, que o Supabase Storage entende
// nativamente (em URL pública ou assinada) e responde com Content-Disposition: attachment.
function photoDownloadUrl(p: Participant): string {
  const filename = encodeURIComponent(`${p.nome.replace(/\s+/g, "_")}.jpg`);
  return `${p.foto_url}${p.foto_url!.includes("?") ? "&" : "?"}download=${filename}`;
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
  // Conta como participante quem já assinou contrato OU respondeu o formulário público
  // (mesmo critério da coluna "Entrada" no Kanban de pré-viagem).
  const list = all.filter((p) => p.contrato_status === "assinado" || p.origem === "formulario");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
                <td><span className={`badge ${p.restricoes_alimentares && p.restricoes_alimentares !== "Nenhuma" ? "badge-warn" : "badge-neutral"}`}>{p.restricoes_alimentares || "Nenhuma"}</span></td>
                <td>{statusBadge(p.seguro_status)}</td>
                <td>{statusBadge(p.voo_ida_status)}</td>
                <td>{statusBadge(p.pagamento_status)}</td>
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
          <input className="form-input" type="number" value={form.valor_pago ?? 0} onChange={(e) => setForm({ ...form, valor_pago: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label className="form-label">Pagamento</label>
          <select className="form-select" value={form.pagamento_status} onChange={(e) => setForm({ ...form, pagamento_status: e.target.value })}>
            <option value="pendente">Pendente</option>
            <option value="confirmado">Confirmado</option>
          </select>
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
            {statusBadge(p.pagamento_status === "confirmado" ? "confirmado" : "pendente")}
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
      {p.voo_detalhes && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header"><i className="ti ti-plane" /> Passagem aérea (respondida no formulário)</div>
          <div className="panel-body">
            <VooDetalhesTable detalhes={p.voo_detalhes} />
          </div>
        </div>
      )}
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
              <EditableField value={String(p.valor_pago)} onSave={(v) => save({ valor_pago: Number(v) || 0 })} />
            </div>
            <StatusRow label="Pagamento" field="pagamento_status" value={p.pagamento_status} onSave={save} options={["pendente","confirmado"]} />
            <StatusRow label="Contrato" field="contrato_status" value={p.contrato_status} onSave={save} options={["pendente","assinado"]} />
          </div>
        </div>
      </div>
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><i className="ti ti-meat" /> Saúde & restrições</div>
        <div className="panel-body">
          <ProfileTable rows={[["Restrições alimentares","restricoes_alimentares"],["Alergias","alergias"],["Observações médicas","observacoes_medicas"],["Medicamentos","medicamentos"]]} participant={p} onSave={save} />
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

function ProfileTable({ rows, participant, onSave }: { rows: [string, keyof Participant][]; participant: Participant; onSave: (patch: Partial<Participant>) => void }) {
  return (
    <table style={{ width: "100%", fontSize: 12, border: "none", borderCollapse: "collapse" }}>
      <tbody>
        {rows.map(([label, field]) => (
          <tr key={field as string}>
            <td style={{ color: "var(--text3)", padding: "6px 0", width: "42%" }}>{label}</td>
            <td style={{ padding: "6px 0" }}><EditableField value={(participant[field] as any) ?? ""} onSave={(v) => onSave({ [field]: v } as any)} /></td>
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

