import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, ConfirmDialog } from "@/components/hub/Modal";
import { CfgSkeleton, CfgEmpty, CfgError } from "@/components/hub/configuracoes/CfgStates";
import { mensagemDeErro } from "@/lib/erros";
import {
  ETAPA_KEYS, PRE_VIAGEM_PIPELINE_ID, etapaLabel, etapaCor, etapaIcone,
} from "@/lib/pre-viagem-etapas";
import {
  EMAIL_PLACEHOLDERS, resolvePlaceholders, placeholdersDesconhecidos,
  useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate,
  useDuplicateEmailTemplate, useDeleteEmailTemplate,
  usePipelineEmailAutomations, useUpsertPipelineEmailAutomation,
  useEmailSendHistory, useSendStageEmail, useParticipants,
  type EmailTemplate, type PipelineEmailAutomation, type EmailSendHistoryEntry, type Participant,
} from "@/lib/hub-api";

/** Usado na prévia quando não há participante escolhido (ou nenhum cadastrado). */
const CONTEXTO_EXEMPLO: Record<string, string> = {
  nome_contato: "Ana Souza",
  email_contato: "ana.souza@exemplo.com",
  etapa_anterior: "Formulário preenchido",
  etapa_atual: "D-60 · Kickoff",
};

function contextoDoParticipante(p: Participant | null): Record<string, string> {
  if (!p) return CONTEXTO_EXEMPLO;
  return {
    nome_contato: p.nome,
    email_contato: p.email ?? "— sem e-mail cadastrado —",
    etapa_anterior: CONTEXTO_EXEMPLO.etapa_anterior,
    etapa_atual: CONTEXTO_EXEMPLO.etapa_atual,
  };
}

export function EmailAutomationSettings() {
  const qModelos = useEmailTemplates();
  const qAutomacoes = usePipelineEmailAutomations();
  const { data: templates = [], isLoading: carregandoModelos } = qModelos;
  const { data: automations = [], isLoading: carregandoAutomacoes } = qAutomacoes;
  const [editor, setEditor] = useState<{ template: EmailTemplate | null } | null>(null);
  const [previa, setPrevia] = useState<EmailTemplate | null>(null);

  const porEtapa = useMemo(() => {
    const m = new Map<string, PipelineEmailAutomation>();
    for (const a of automations) m.set(a.etapa_key, a);
    return m;
  }, [automations]);

  const modelosAtivos = useMemo(() => templates.filter((t) => t.ativo), [templates]);

  // Só conta como ativa a etapa que realmente enviaria algo.
  const etapasArmadas = ETAPA_KEYS.filter((k) => {
    const a = porEtapa.get(k);
    return a?.automacao_ativa && modelosAtivos.some((t) => t.id === a.email_template_id);
  }).length;

  const carregando = carregandoModelos || carregandoAutomacoes;
  const falhou = qModelos.isError || qAutomacoes.isError;
  const erro = qModelos.error ?? qAutomacoes.error;
  const recarregar = () => { qModelos.refetch(); qAutomacoes.refetch(); };

  return (
    <div className="cfg-page">
      <div className="card">
        <div className="cfg-card-head">
          <h3><i className="ti ti-mail-cog" /> Automação por etapa</h3>
          {!carregando && (
            <span className={`cfg-count${etapasArmadas > 0 ? " on" : ""}`}>
              {etapasArmadas} de {ETAPA_KEYS.length} {etapasArmadas === 1 ? "ativa" : "ativas"}
            </span>
          )}
        </div>
        <div className="cfg-card-body">
          <p className="cfg-intro" style={{ marginBottom: 14 }}>
            Mover um card para uma etapa ativa envia o modelo escolhido ao participante, com os
            placeholders já preenchidos. As cores são as mesmas das colunas do board de Pré-Viagem.
            Cancelar um envio não desfaz a movimentação do card.
          </p>

          {carregando ? (
            <CfgSkeleton rows={5} />
          ) : falhou ? (
            <CfgError
              titulo="Não foi possível carregar as automações"
              erro={erro}
              onRetry={recarregar}
              tentando={qModelos.isFetching || qAutomacoes.isFetching}
            />
          ) : templates.length === 0 ? (
            <CfgEmpty icon="ti-mail-plus" title="Nenhum modelo para enviar">
              <p>Crie um modelo de e-mail abaixo e ele aparecerá aqui para ser ligado a uma etapa.</p>
            </CfgEmpty>
          ) : (
            ETAPA_KEYS.map((key) => (
              <EtapaRow
                key={key}
                etapaKey={key}
                automation={porEtapa.get(key) ?? null}
                templates={templates}
                onPreview={setPrevia}
              />
            ))
          )}
        </div>
      </div>

      <ModelosCard
        templates={templates}
        automations={automations}
        carregando={carregandoModelos}
        falhou={qModelos.isError}
        erro={qModelos.error}
        onRecarregar={() => qModelos.refetch()}
        recarregando={qModelos.isFetching}
        onNovo={() => setEditor({ template: null })}
        onEditar={(t) => setEditor({ template: t })}
        onPreview={setPrevia}
      />

      <HistoricoCard />

      {editor && <TemplateEditorModal template={editor.template} onClose={() => setEditor(null)} />}
      {previa && <PreviewModal template={previa} onClose={() => setPrevia(null)} />}
    </div>
  );
}

// ────────── CONFIGURAÇÃO DE UMA ETAPA ──────────
function EtapaRow({ etapaKey, automation, templates, onPreview }: {
  etapaKey: string;
  automation: PipelineEmailAutomation | null;
  templates: EmailTemplate[];
  onPreview: (t: EmailTemplate) => void;
}) {
  const upsert = useUpsertPipelineEmailAutomation();
  const [salvo, setSalvo] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const ligada = automation?.automacao_ativa ?? false;
  const templateId = automation?.email_template_id ?? "";
  const confirmacao = automation?.confirmacao_obrigatoria ?? true;
  const template = templates.find((t) => t.id === templateId) ?? null;
  const enviaria = ligada && !!template?.ativo;

  useEffect(() => {
    if (!salvo) return;
    const t = setTimeout(() => setSalvo(0), 1700);
    return () => clearTimeout(t);
  }, [salvo]);

  const salvar = async (patch: Partial<PipelineEmailAutomation>) => {
    setErro(null);
    try {
      // Sem `id`: o upsert resolve por (pipeline_id, etapa_key), e a linha otimista
      // ainda pode estar com um id temporário que o banco rejeitaria.
      await upsert.mutateAsync({
        pipeline_id: PRE_VIAGEM_PIPELINE_ID,
        etapa_key: etapaKey,
        automacao_ativa: ligada,
        confirmacao_obrigatoria: confirmacao,
        email_template_id: templateId || null,
        ...patch,
      });
      setSalvo((n) => n + 1);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  const nota = erro
    ? { classe: "warn", icone: "ti-alert-circle", texto: `Não salvou: ${erro}` }
    : salvo
      ? null
      : ligada && !template
        ? { classe: "warn", icone: "ti-alert-triangle", texto: "Escolha um modelo para esta etapa enviar" }
        : ligada && template && !template.ativo
          ? { classe: "warn", icone: "ti-alert-triangle", texto: "O modelo está inativo — nada será enviado" }
          : null;

  return (
    <div
      className={`cfg-stage${enviaria ? " on" : ""}`}
      style={{ "--etc": etapaCor(etapaKey) } as React.CSSProperties}
    >
      <div className="cfg-stage-id">
        <span className="cfg-stage-icon"><i className={`ti ${etapaIcone(etapaKey)}`} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="cfg-stage-name">{etapaLabel(etapaKey)}</div>
          <div className={`cfg-stage-note${nota?.classe === "warn" ? " warn" : ""}`}>
            {salvo ? (
              <span key={salvo} className="cfg-saved"><i className="ti ti-check" /> Salvo</span>
            ) : nota ? (
              <><i className={`ti ${nota.icone}`} /> {nota.texto}</>
            ) : enviaria ? (
              <><i className="ti ti-mail-check" /> Envia “{template!.nome}”</>
            ) : null}
          </div>
        </div>
      </div>

      <select
        className="form-select"
        value={templateId}
        disabled={upsert.isPending}
        aria-label={`Modelo de e-mail para ${etapaLabel(etapaKey)}`}
        onChange={(e) => salvar({ email_template_id: e.target.value || null })}
        style={ligada && !template ? { borderColor: "var(--amber)" } : undefined}
      >
        <option value="">— sem modelo —</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>{t.nome}{t.ativo ? "" : " (inativo)"}</option>
        ))}
      </select>

      {/* Só faz sentido enquanto a etapa envia algo — em 10 linhas, exibir sempre
          encheria a tela de controles irrelevantes. */}
      {ligada ? (
        <label className="cfg-switch" title="Revisar a mensagem antes de cada envio">
          <input
            type="checkbox"
            checked={confirmacao}
            disabled={upsert.isPending}
            onChange={(e) => salvar({ confirmacao_obrigatoria: e.target.checked })}
          />
          <span className="cfg-switch-track" />
          Confirmar
        </label>
      ) : <span />}

      <div className="cfg-stage-actions">
        <button
          className="cfg-icon-btn"
          disabled={!template}
          onClick={() => template && onPreview(template)}
          title={template ? "Ver prévia do e-mail" : "Escolha um modelo para ver a prévia"}
          aria-label={`Ver prévia do e-mail de ${etapaLabel(etapaKey)}`}
        >
          <i className="ti ti-eye" />
        </button>
        <label className="cfg-switch stage" title={ligada ? "Desativar automação" : "Ativar automação"}>
          <input
            type="checkbox"
            checked={ligada}
            disabled={upsert.isPending}
            aria-label={`Automação de e-mail na etapa ${etapaLabel(etapaKey)}`}
            onChange={(e) => salvar({ automacao_ativa: e.target.checked })}
          />
          <span className="cfg-switch-track" />
        </label>
      </div>
    </div>
  );
}

// ────────── MODELOS ──────────
function ModelosCard({ templates, automations, carregando, falhou, erro, onRecarregar, recarregando, onNovo, onEditar, onPreview }: {
  templates: EmailTemplate[];
  automations: PipelineEmailAutomation[];
  carregando: boolean;
  falhou: boolean;
  erro: unknown;
  onRecarregar: () => void;
  recarregando: boolean;
  onNovo: () => void;
  onEditar: (t: EmailTemplate) => void;
  onPreview: (t: EmailTemplate) => void;
}) {
  return (
    <div className="card">
      <div className="cfg-card-head">
        <h3><i className="ti ti-template" /> Modelos de e-mail</h3>
        <button className="btn-primary" onClick={onNovo} style={{ padding: "6px 13px", fontSize: 12 }}>
          <i className="ti ti-plus" /> Novo modelo
        </button>
      </div>
      <div className="cfg-card-body">
        {carregando ? (
          <CfgSkeleton rows={3} />
        ) : falhou ? (
          <CfgError titulo="Não foi possível carregar os modelos" erro={erro} onRetry={onRecarregar} tentando={recarregando} />
        ) : templates.length === 0 ? (
          <CfgEmpty icon="ti-template" title="Nenhum modelo ainda">
            <p>Um modelo guarda assunto e mensagem com placeholders, prontos para reutilizar em qualquer etapa.</p>
            <button className="btn-primary" onClick={onNovo} style={{ marginTop: 4 }}>
              <i className="ti ti-plus" /> Criar o primeiro modelo
            </button>
          </CfgEmpty>
        ) : (
          templates.map((t) => (
            <TemplateRow
              key={t.id}
              template={t}
              etapasLigadas={automations.filter((a) => a.email_template_id === t.id && a.automacao_ativa).map((a) => a.etapa_key)}
              onEdit={() => onEditar(t)}
              onPreview={() => onPreview(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TemplateRow({ template, etapasLigadas, onEdit, onPreview }: {
  template: EmailTemplate;
  etapasLigadas: string[];
  onEdit: () => void;
  onPreview: () => void;
}) {
  const update = useUpdateEmailTemplate();
  const duplicate = useDuplicateEmailTemplate();
  const del = useDeleteEmailTemplate();
  const upsert = useUpsertPipelineEmailAutomation();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executar = async (fn: () => Promise<unknown>) => {
    setErro(null);
    try {
      await fn();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  // Excluir um modelo em uso deixaria as etapas ligadas sem nada para enviar,
  // então elas são desligadas junto — explicitamente, não como efeito colateral.
  const excluir = () => executar(async () => {
    for (const etapa of etapasLigadas) {
      await upsert.mutateAsync({
        pipeline_id: PRE_VIAGEM_PIPELINE_ID,
        etapa_key: etapa,
        automacao_ativa: false,
        email_template_id: null,
      });
    }
    await del.mutateAsync(template.id);
  });

  return (
    <>
      <div className={`cfg-tpl${template.ativo ? "" : " off"}`}>
        <div style={{ minWidth: 0 }}>
          <div className="cfg-tpl-name">
            {template.nome}
            {!template.ativo && <span className="badge badge-neutral">inativo</span>}
            {etapasLigadas.length > 0 && (
              <span className="badge badge-blue" title={etapasLigadas.map(etapaLabel).join(", ")}>
                {etapasLigadas.length} {etapasLigadas.length === 1 ? "etapa" : "etapas"}
              </span>
            )}
          </div>
          <div className="cfg-tpl-subject">{template.assunto || <span className="cfg-muted">sem assunto</span>}</div>
          {erro && <div className="modal-inline-error" style={{ marginTop: 6 }}><i className="ti ti-alert-circle" /> {erro}</div>}
        </div>

        <span className="cfg-tpl-meta">
          {new Date(template.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </span>

        <div className="cfg-tpl-actions">
          <button className="cfg-icon-btn" onClick={onPreview} title="Ver prévia" aria-label={`Ver prévia de ${template.nome}`}>
            <i className="ti ti-eye" />
          </button>
          <button className="cfg-icon-btn" onClick={onEdit} title="Editar" aria-label={`Editar ${template.nome}`}>
            <i className="ti ti-pencil" />
          </button>
          <button
            className="cfg-icon-btn"
            onClick={() => executar(() => duplicate.mutateAsync(template))}
            disabled={duplicate.isPending}
            title="Duplicar"
            aria-label={`Duplicar ${template.nome}`}
          >
            <i className="ti ti-copy" />
          </button>
          <button
            className="cfg-icon-btn"
            onClick={() => executar(() => update.mutateAsync({ id: template.id, patch: { ativo: !template.ativo } }))}
            disabled={update.isPending}
            title={template.ativo ? "Desativar" : "Ativar"}
            aria-label={template.ativo ? `Desativar ${template.nome}` : `Ativar ${template.nome}`}
          >
            <i className={`ti ${template.ativo ? "ti-eye-off" : "ti-eye"}`} />
          </button>
          <button
            className="cfg-icon-btn danger"
            onClick={() => setConfirmar(true)}
            disabled={del.isPending}
            title="Excluir"
            aria-label={`Excluir ${template.nome}`}
          >
            <i className="ti ti-trash" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={excluir}
        title={`Excluir “${template.nome}”?`}
        message={
          etapasLigadas.length > 0
            ? `${etapasLigadas.length === 1 ? "A etapa" : "As etapas"} ${etapasLigadas.map(etapaLabel).join(", ")} ${etapasLigadas.length === 1 ? "usa" : "usam"} este modelo e ${etapasLigadas.length === 1 ? "será desligada" : "serão desligadas"} junto. Os envios já registrados no histórico permanecem.`
            : "O modelo será removido. Os envios já registrados no histórico permanecem."
        }
        confirmLabel="Excluir"
        icon="ti-trash"
      />
    </>
  );
}

// ────────── EDITOR DE MODELO ──────────
function TemplateEditorModal({ template, onClose }: { template: EmailTemplate | null; onClose: () => void }) {
  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate();
  const [nome, setNome] = useState(template?.nome ?? "");
  const [assunto, setAssunto] = useState(template?.assunto ?? "");
  const [conteudo, setConteudo] = useState(template?.conteudo ?? "");
  const [verPrevia, setVerPrevia] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);

  const [campoAtivo, setCampoAtivo] = useState<"assunto" | "conteudo">("conteudo");
  const assuntoRef = useRef<HTMLInputElement>(null);
  const conteudoRef = useRef<HTMLTextAreaElement>(null);

  // Reposicionar o cursor só funciona depois que o React comitou o novo valor —
  // fazer isso no próprio clique perderia a posição, porque atribuir `value` a um
  // campo controlado joga o cursor para o fim do texto.
  const caretPendente = useRef<{ campo: "assunto" | "conteudo"; pos: number } | null>(null);
  useEffect(() => {
    const alvo = caretPendente.current;
    if (!alvo) return;
    caretPendente.current = null;
    const el = alvo.campo === "assunto" ? assuntoRef.current : conteudoRef.current;
    el?.focus();
    el?.setSelectionRange(alvo.pos, alvo.pos);
  }, [assunto, conteudo]);

  const inserirPlaceholder = (chave: string) => {
    const token = `{{${chave}}}`;
    const emAssunto = campoAtivo === "assunto";
    const el: HTMLInputElement | HTMLTextAreaElement | null = emAssunto ? assuntoRef.current : conteudoRef.current;
    const valor = emAssunto ? assunto : conteudo;
    const set = emAssunto ? setAssunto : setConteudo;
    const inicio = el?.selectionStart ?? valor.length;
    const fim = el?.selectionEnd ?? valor.length;
    set(valor.slice(0, inicio) + token + valor.slice(fim));
    caretPendente.current = { campo: campoAtivo, pos: inicio + token.length };
  };

  const alterado =
    nome !== (template?.nome ?? "") ||
    assunto !== (template?.assunto ?? "") ||
    conteudo !== (template?.conteudo ?? "");

  const desconhecidos = placeholdersDesconhecidos(assunto, conteudo);
  const podeSalvar = !!nome.trim() && !!assunto.trim() && !!conteudo.trim();
  const salvando = create.isPending || update.isPending;

  const fechar = () => (alterado ? setConfirmarDescarte(true) : onClose());

  const salvar = async () => {
    if (!podeSalvar) return;
    setErro(null);
    const patch = { nome: nome.trim(), assunto: assunto.trim(), conteudo };
    try {
      if (template) await update.mutateAsync({ id: template.id, patch });
      else await create.mutateAsync(patch);
      onClose();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  return (
    <>
      <Modal
        open
        onClose={fechar}
        title={template ? "Editar modelo de e-mail" : "Novo modelo de e-mail"}
        description="Os placeholders são trocados pelos dados reais de cada participante no envio."
        icon="ti-template"
        size="lg"
      >
        <div className="form-group">
          <label className="form-label" htmlFor="tpl-nome">Nome do modelo</label>
          <input
            id="tpl-nome"
            className="form-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Boas-vindas — Kickoff"
            autoFocus
          />
          <div className="form-help">
            <i className="ti ti-info-circle" />
            Só aparece para a equipe, na hora de escolher o modelo da etapa.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="tpl-assunto">Assunto</label>
          <input
            id="tpl-assunto"
            ref={assuntoRef}
            className="form-input"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            onFocus={() => setCampoAtivo("assunto")}
            placeholder="{{nome_contato}}, sua jornada para a China começou"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="tpl-conteudo">Mensagem</label>
          <textarea
            id="tpl-conteudo"
            ref={conteudoRef}
            className="form-textarea"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            onFocus={() => setCampoAtivo("conteudo")}
            placeholder="Olá {{nome_contato}},"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Placeholders — clique para inserir em <strong>{campoAtivo === "assunto" ? "Assunto" : "Mensagem"}</strong>
          </label>
          <div className="cfg-ph-row">
            {EMAIL_PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                className="cfg-ph"
                // Sem isto o botão rouba o foco no mousedown e a posição do cursor
                // no campo se perde antes de o clique ser processado.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => inserirPlaceholder(p.key)}
                title={p.label}
              >
                {`{{${p.key}}}`}
              </button>
            ))}
          </div>
          <div className="form-help">
            <i className="ti ti-info-circle" />
            A lista cobre os dados que o CRM guarda hoje. Novos campos do cadastro aparecem aqui automaticamente.
          </div>
        </div>

        {desconhecidos.length > 0 && (
          <div className="modal-inline-error" style={{ marginBottom: 14 }}>
            <i className="ti ti-alert-triangle" />
            {desconhecidos.map((d) => `{{${d}}}`).join(", ")} {desconhecidos.length === 1 ? "não existe" : "não existem"} —
            {desconhecidos.length === 1 ? " sairá" : " sairão"} como texto literal no e-mail.
          </div>
        )}

        {verPrevia && (
          <div className="form-group">
            <label className="form-label">Prévia com dados de exemplo</label>
            <PreviewBox assunto={assunto} conteudo={conteudo} contexto={CONTEXTO_EXEMPLO} />
          </div>
        )}

        {erro && (
          <div className="modal-inline-error"><i className="ti ti-alert-circle" /> Não foi possível salvar: {erro}</div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={fechar} disabled={salvando}>Cancelar</button>
          <button className="btn-secondary" onClick={() => setVerPrevia((v) => !v)}>
            <i className="ti ti-eye" /> {verPrevia ? "Ocultar prévia" : "Ver prévia"}
          </button>
          <button
            className="btn-primary"
            onClick={salvar}
            disabled={salvando || !podeSalvar}
            title={podeSalvar ? undefined : "Preencha nome, assunto e mensagem"}
          >
            {salvando
              ? <><i className="ti ti-loader-2 modal-spinner" /> Salvando…</>
              : <><i className="ti ti-check" /> Salvar modelo</>}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmarDescarte}
        onClose={() => setConfirmarDescarte(false)}
        onConfirm={onClose}
        title="Descartar as alterações?"
        message="As mudanças neste modelo ainda não foram salvas e serão perdidas."
        confirmLabel="Descartar"
        icon="ti-trash"
      />
    </>
  );
}

// ────────── PRÉVIA ──────────
function PreviewModal({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const { data: participantes = [] } = useParticipants();
  const comEmail = useMemo(() => participantes.filter((p) => p.email), [participantes]);
  const [participanteId, setParticipanteId] = useState("");
  const participante = comEmail.find((p) => p.id === participanteId) ?? null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Prévia — ${template.nome}`}
      description="Veja como a mensagem chega antes de ligar a automação."
      icon="ti-eye"
      size="lg"
    >
      {comEmail.length > 0 && (
        <div className="form-group">
          <label className="form-label" htmlFor="previa-part">Simular com</label>
          <select
            id="previa-part"
            className="form-select"
            value={participanteId}
            onChange={(e) => setParticipanteId(e.target.value)}
          >
            <option value="">Dados de exemplo</option>
            {comEmail.map((p) => (
              <option key={p.id} value={p.id}>{p.nome} · {p.email}</option>
            ))}
          </select>
        </div>
      )}

      <PreviewBox assunto={template.assunto} conteudo={template.conteudo} contexto={contextoDoParticipante(participante)} />

      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  );
}

function PreviewBox({ assunto, conteudo, contexto }: {
  assunto: string;
  conteudo: string;
  contexto: Record<string, string>;
}) {
  return (
    <div className="cfg-preview">
      <div className="cfg-preview-subject">
        {resolvePlaceholders(assunto, contexto) || <span className="cfg-muted">sem assunto</span>}
      </div>
      <div className="cfg-preview-body">
        {resolvePlaceholders(conteudo, contexto) || <span className="cfg-muted">sem conteúdo</span>}
      </div>
    </div>
  );
}

// ────────── HISTÓRICO ──────────
const STATUS_BADGE: Record<EmailSendHistoryEntry["status_envio"], { classe: string; rotulo: string }> = {
  enviado: { classe: "badge-ok", rotulo: "enviado" },
  erro: { classe: "badge-danger", rotulo: "erro" },
  pendente: { classe: "badge-warn", rotulo: "pendente" },
  cancelado: { classe: "badge-neutral", rotulo: "cancelado" },
};

type FiltroHistorico = "todos" | "enviado" | "erro";

function HistoricoCard() {
  const q = useEmailSendHistory();
  const { data: historico = [], isLoading } = q;
  const [filtro, setFiltro] = useState<FiltroHistorico>("todos");
  const [expandido, setExpandido] = useState(false);

  const comErro = historico.filter((h) => h.status_envio === "erro").length;
  const filtrado = filtro === "todos" ? historico : historico.filter((h) => h.status_envio === filtro);
  const visiveis = expandido ? filtrado : filtrado.slice(0, 8);

  return (
    <div className="card">
      <div className="cfg-card-head">
        <h3><i className="ti ti-history" /> Histórico de envios</h3>
        {comErro > 0 && <span className="badge badge-danger"><i className="ti ti-alert-triangle" /> {comErro} com erro</span>}
      </div>
      <div className="cfg-card-body">
        {isLoading ? (
          <CfgSkeleton rows={3} />
        ) : q.isError ? (
          <CfgError titulo="Não foi possível carregar o histórico" erro={q.error} onRetry={() => q.refetch()} tentando={q.isFetching} />
        ) : historico.length === 0 ? (
          <CfgEmpty icon="ti-mail-opened" title="Nenhum e-mail enviado ainda">
            <p>Cada tentativa de envio aparece aqui, com o resultado e o motivo de eventuais falhas.</p>
          </CfgEmpty>
        ) : (
          <>
            <div className="cfg-hist-filters">
              {([
                ["todos", `Todos (${historico.length})`],
                ["enviado", `Enviados (${historico.filter((h) => h.status_envio === "enviado").length})`],
                ["erro", `Erros (${comErro})`],
              ] as [FiltroHistorico, string][]).map(([id, rotulo]) => (
                <button
                  key={id}
                  className={`cfg-chip${filtro === id ? " active" : ""}`}
                  onClick={() => { setFiltro(id); setExpandido(false); }}
                  aria-pressed={filtro === id}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {filtrado.length === 0 ? (
              <CfgEmpty icon="ti-filter-off" title="Nada com esse filtro" />
            ) : (
              <>
                {visiveis.map((h) => <HistoricoRow key={h.id} entrada={h} />)}
                {filtrado.length > visiveis.length && (
                  <button className="p-link" style={{ marginTop: 10 }} onClick={() => setExpandido(true)}>
                    Ver os {filtrado.length - visiveis.length} envios restantes
                  </button>
                )}
                {expandido && filtrado.length > 8 && (
                  <button className="p-link" style={{ marginTop: 10 }} onClick={() => setExpandido(false)}>
                    Mostrar menos
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HistoricoRow({ entrada }: { entrada: EmailSendHistoryEntry }) {
  const reenviar = useSendStageEmail();
  const [erroReenvio, setErroReenvio] = useState<string | null>(null);
  const badge = STATUS_BADGE[entrada.status_envio] ?? STATUS_BADGE.pendente;

  const tentarNovamente = async () => {
    setErroReenvio(null);
    try {
      await reenviar.mutateAsync({
        participant_id: entrada.participant_id ?? "",
        etapa_origem: entrada.etapa_origem,
        etapa_destino: entrada.etapa_destino,
        email_template_id: entrada.email_template_id,
        destinatario: entrada.destinatario,
        assunto: entrada.assunto_enviado,
        conteudo: entrada.conteudo_enviado,
      });
    } catch (e) {
      setErroReenvio(mensagemDeErro(e));
    }
  };

  return (
    <div className="cfg-tpl" style={{ gridTemplateColumns: "1fr auto auto" }}>
      <div style={{ minWidth: 0 }}>
        <div className="cfg-tpl-name">
          {entrada.destinatario}
          <span className={`badge ${badge.classe}`}>{badge.rotulo}</span>
        </div>
        <div className="cfg-tpl-subject">
          {etapaLabel(entrada.etapa_destino)} · {entrada.assunto_enviado}
        </div>
        {entrada.erro_envio && (
          <div className="cfg-hist-error"><i className="ti ti-alert-circle" /> {entrada.erro_envio}</div>
        )}
        {erroReenvio && (
          <div className="cfg-hist-error"><i className="ti ti-alert-circle" /> Reenvio falhou: {erroReenvio}</div>
        )}
      </div>

      <span className="cfg-tpl-meta">
        {new Date(entrada.enviado_em ?? entrada.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </span>

      <div className="cfg-tpl-actions">
        {entrada.status_envio === "erro" && (
          <button
            className="cfg-icon-btn"
            onClick={tentarNovamente}
            disabled={reenviar.isPending}
            title="Tentar enviar de novo"
            aria-label={`Tentar enviar de novo para ${entrada.destinatario}`}
          >
            <i className={`ti ti-refresh${reenviar.isPending ? " modal-spinner" : ""}`} />
          </button>
        )}
      </div>
    </div>
  );
}
