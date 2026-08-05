import { useState } from "react";
import { ConfirmDialog } from "@/components/hub/Modal";
import { CfgSkeleton, CfgEmpty, CfgError } from "@/components/hub/configuracoes/CfgStates";
import { mensagemDeErro } from "@/lib/erros";
import {
  useResponsaveis, useCreateResponsavel, useUpdateResponsavel, useDeleteResponsavel,
  type Responsavel,
} from "@/lib/hub-api";

const PALETA = ["#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400", "#16a085", "#2c3e50", "#e67e22"];

/** Cor estável a partir do nome: sem isto todo responsável novo nasce cinza,
 * porque a criação não pede cor e o banco guarda null. */
function corPadrao(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

const iniciais = (nome: string) => {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase() || "?";
};

export function ResponsaveisSettings() {
  const q = useResponsaveis();
  const { data: responsaveis = [], isLoading } = q;
  const create = useCreateResponsavel();
  const [novoNome, setNovoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const ativos = responsaveis.filter((r) => r.ativo).length;

  const adicionar = async () => {
    const limpo = novoNome.trim();
    if (!limpo) return;
    setErro(null);
    try {
      await create.mutateAsync(limpo);
      setNovoNome("");
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  return (
    <div className="cfg-page">
      <div className="card">
        <div className="cfg-card-head">
          <h3><i className="ti ti-users-plus" /> Responsáveis</h3>
          {!isLoading && responsaveis.length > 0 && (
            <span className="cfg-count">{ativos} de {responsaveis.length} {ativos === 1 ? "ativo" : "ativos"}</span>
          )}
        </div>
        <div className="cfg-card-body">
          <p className="cfg-intro" style={{ marginBottom: 14 }}>
            Quem pode ser atribuído a leads e atividades do CRM. Desativar preserva o histórico:
            o responsável some das listas de escolha, mas continua nos registros antigos.
          </p>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              className="form-input"
              placeholder="Nome do novo responsável"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") adicionar(); }}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={adicionar} disabled={create.isPending || !novoNome.trim()}>
              <i className="ti ti-plus" /> Adicionar
            </button>
          </div>

          {erro && (
            <div className="modal-inline-error" style={{ marginBottom: 12 }}>
              <i className="ti ti-alert-circle" /> Não foi possível adicionar: {erro}
            </div>
          )}

          {isLoading ? (
            <CfgSkeleton rows={3} />
          ) : q.isError ? (
            <CfgError titulo="Não foi possível carregar os responsáveis" erro={q.error} onRetry={() => q.refetch()} tentando={q.isFetching} />
          ) : responsaveis.length === 0 ? (
            <CfgEmpty icon="ti-user-plus" title="Nenhum responsável ainda">
              <p>Adicione a primeira pessoa acima para começar a distribuir leads e atividades.</p>
            </CfgEmpty>
          ) : (
            responsaveis.map((r) => <ResponsavelRow key={r.id} responsavel={r} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ResponsavelRow({ responsavel }: { responsavel: Responsavel }) {
  const update = useUpdateResponsavel();
  const del = useDeleteResponsavel();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(responsavel.nome);
  const [cor, setCor] = useState(responsavel.cor ?? corPadrao(responsavel.nome));
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const legado = responsavel.id.startsWith("legacy-");
  const corAtual = responsavel.cor ?? corPadrao(responsavel.nome);

  const executar = async (fn: () => Promise<unknown>) => {
    setErro(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setErro(mensagemDeErro(e));
      return false;
    }
  };

  const salvar = async () => {
    if (!nome.trim()) return;
    if (await executar(() => update.mutateAsync({ id: responsavel.id, patch: { nome: nome.trim(), cor } }))) {
      setEditando(false);
    }
  };

  const cancelar = () => {
    setEditando(false);
    setNome(responsavel.nome);
    setCor(corAtual);
    setErro(null);
  };

  if (editando) {
    return (
      <div className="cfg-resp" style={{ gridTemplateColumns: "1fr" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            className="form-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") cancelar(); }}
            autoFocus
          />
          <div className="cfg-swatches">
            {PALETA.map((c) => (
              <button
                key={c}
                className="cfg-swatch"
                style={{ background: c }}
                aria-pressed={cor === c}
                aria-label={`Usar a cor ${c}`}
                onClick={() => setCor(c)}
              />
            ))}
          </div>
          {erro && <div className="modal-inline-error"><i className="ti ti-alert-circle" /> {erro}</div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="btn-secondary" onClick={cancelar}>Cancelar</button>
            <button className="btn-primary" onClick={salvar} disabled={update.isPending || !nome.trim()}>
              <i className="ti ti-check" /> Salvar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`cfg-resp${responsavel.ativo ? "" : " off"}`}>
        <span className="cfg-resp-avatar" style={{ background: corAtual }}>{iniciais(responsavel.nome)}</span>
        <div style={{ minWidth: 0 }}>
          <div className="cfg-resp-name">
            {responsavel.nome}
            {!responsavel.ativo && <span className="badge badge-neutral">inativo</span>}
            {legado && <span className="badge badge-neutral">legado</span>}
          </div>
          {erro && <div className="modal-inline-error" style={{ marginTop: 6 }}><i className="ti ti-alert-circle" /> {erro}</div>}
        </div>
        {!legado && (
          <div className="cfg-resp-actions">
            <button
              className="cfg-icon-btn"
              onClick={() => executar(() => update.mutateAsync({ id: responsavel.id, patch: { ativo: !responsavel.ativo } }))}
              disabled={update.isPending}
              title={responsavel.ativo ? "Desativar" : "Ativar"}
              aria-label={responsavel.ativo ? `Desativar ${responsavel.nome}` : `Ativar ${responsavel.nome}`}
            >
              <i className={`ti ${responsavel.ativo ? "ti-eye-off" : "ti-eye"}`} />
            </button>
            <button className="cfg-icon-btn" onClick={() => setEditando(true)} title="Editar" aria-label={`Editar ${responsavel.nome}`}>
              <i className="ti ti-pencil" />
            </button>
            <button
              className="cfg-icon-btn danger"
              onClick={() => setConfirmarExclusao(true)}
              disabled={del.isPending}
              title="Excluir"
              aria-label={`Excluir ${responsavel.nome}`}
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={() => executar(() => del.mutateAsync(responsavel.id))}
        title={`Excluir ${responsavel.nome}?`}
        message={`${responsavel.nome} será removido de todos os leads vinculados. Para tirá-lo das listas sem perder o histórico, desative em vez de excluir.`}
        confirmLabel="Excluir"
        icon="ti-trash"
      />
    </>
  );
}
