import { useState } from "react";
import { useResponsaveis, useCreateResponsavel, useUpdateResponsavel, useDeleteResponsavel, type Responsavel } from "@/lib/hub-api";

const PALETA = ["#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400", "#16a085", "#2c3e50", "#e67e22"];

export function ConfiguracoesPage() {
  const { data: responsaveis = [], isLoading } = useResponsaveis();
  const create = useCreateResponsavel();
  const [novoNome, setNovoNome] = useState("");

  const adicionar = async () => {
    const clean = novoNome.trim();
    if (!clean) return;
    try {
      await create.mutateAsync(clean);
      setNovoNome("");
    } catch (e: any) {
      alert("Erro ao criar responsável: " + (e?.message ?? e));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 780 }}>
      <div className="card">
        <div className="card-header">
          <i className="ti ti-users-plus" /> <span>Responsáveis</span>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            Cadastre, edite ou remova as pessoas que podem ser atribuídas a leads e atividades do CRM.
          </div>

          <div style={{ display: "flex", gap: 8 }}>
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

          {isLoading ? (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Carregando…</div>
          ) : responsaveis.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Nenhum responsável cadastrado ainda.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {responsaveis.map((r) => (
                <ResponsavelRow key={r.id} responsavel={r} />
              ))}
            </div>
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
  const [cor, setCor] = useState(responsavel.cor ?? PALETA[0]);
  const legacy = responsavel.id.startsWith("legacy-");

  const salvar = async () => {
    try {
      await update.mutateAsync({ id: responsavel.id, patch: { nome, cor } });
      setEditando(false);
    } catch (e: any) {
      alert("Erro ao salvar: " + (e?.message ?? e));
    }
  };

  const excluir = async () => {
    if (!confirm(`Excluir "${responsavel.nome}"? Ele será removido de todos os leads vinculados.`)) return;
    try {
      await del.mutateAsync(responsavel.id);
    } catch (e: any) {
      alert("Erro ao excluir: " + (e?.message ?? e));
    }
  };

  const alternarAtivo = async () => {
    try {
      await update.mutateAsync({ id: responsavel.id, patch: { ativo: !responsavel.ativo } });
    } catch (e: any) {
      alert("Erro: " + (e?.message ?? e));
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", border: ".5px solid var(--border)", borderRadius: 8,
      background: responsavel.ativo ? "var(--surface)" : "var(--bg)",
      opacity: responsavel.ativo ? 1 : 0.6,
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: "50%",
        background: responsavel.cor ?? "#999", color: "#fff",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 600, flexShrink: 0,
      }}>
        {responsavel.nome.charAt(0).toUpperCase()}
      </span>

      {editando ? (
        <>
          <input className="form-input" value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 4 }}>
            {PALETA.map((c) => (
              <button
                key={c}
                onClick={() => setCor(c)}
                style={{
                  width: 20, height: 20, borderRadius: "50%", background: c,
                  border: cor === c ? "2px solid var(--text)" : "1px solid var(--border)",
                  cursor: "pointer",
                }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
          <button className="btn-primary" onClick={salvar} disabled={update.isPending || !nome.trim()} style={{ fontSize: 11, padding: "6px 10px" }}>
            <i className="ti ti-check" /> Salvar
          </button>
          <button className="btn-secondary" onClick={() => { setEditando(false); setNome(responsavel.nome); setCor(responsavel.cor ?? PALETA[0]); }} style={{ fontSize: 11, padding: "6px 10px" }}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
            {responsavel.nome}
            {!responsavel.ativo && <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>· inativo</span>}
            {legacy && <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 6 }}>· legado</span>}
          </div>
          {!legacy && (
            <>
              <button className="btn-secondary" onClick={alternarAtivo} disabled={update.isPending} style={{ fontSize: 11, padding: "6px 10px" }} title={responsavel.ativo ? "Desativar" : "Ativar"}>
                <i className={`ti ${responsavel.ativo ? "ti-eye-off" : "ti-eye"}`} />
              </button>
              <button className="btn-secondary" onClick={() => setEditando(true)} style={{ fontSize: 11, padding: "6px 10px" }}>
                <i className="ti ti-pencil" /> Editar
              </button>
              <button
                onClick={excluir}
                disabled={del.isPending}
                style={{
                  fontSize: 11, padding: "6px 10px", border: ".5px solid var(--border)",
                  borderRadius: 6, background: "transparent", color: "var(--accent)", cursor: "pointer",
                }}
              >
                <i className="ti ti-trash" /> Excluir
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}