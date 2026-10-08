import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, createUser, updateUser, deleteUser } from "@/lib/admin-users.functions";

export function UsuariosSettings() {
  const qc = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const doCreate = useServerFn(createUser);
  const doUpdate = useServerFn(updateUser);
  const doDelete = useServerFn(deleteUser);
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const [form, setForm] = useState({ email: "", nome: "", senha: "", role: "usuario" as "admin" | "usuario" });
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => { setMsg(null); refresh(); },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Nova conta</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 140px auto", gap: 8, alignItems: "end" }}>
          <input className="form-input" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="form-input" placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <input className="form-input" type="password" placeholder="Senha inicial (mín. 10)" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "usuario" })}>
            <option value="usuario">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <button
            className="btn-primary"
            disabled={run.isPending}
            onClick={() => run.mutate(async () => { await doCreate({ data: form }); setForm({ email: "", nome: "", senha: "", role: "usuario" }); })}
          >Criar</button>
        </div>
        {msg && <div style={{ color: "var(--accent)", fontSize: 12, marginTop: 8 }}>{msg}</div>}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Contas</div>
        {isLoading && <div>Carregando…</div>}
        {error && <div style={{ color: "var(--accent)" }}>{(error as Error).message}</div>}
        <table style={{ width: "100%", fontSize: 13 }}>
          <thead><tr style={{ textAlign: "left", color: "var(--text3)" }}><th>E-mail</th><th>Nome</th><th>Cargo</th><th>Status</th><th>Último login</th><th /></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: ".5px solid var(--border)" }}>
                <td style={{ padding: "8px 0" }}>{u.email}</td>
                <td>{u.nome || "—"}</td>
                <td>
                  <select className="form-input" value={u.role} onChange={(e) => run.mutate(() => doUpdate({ data: { id: u.id, role: e.target.value as "admin" | "usuario" } }))}>
                    <option value="usuario">Usuário</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{u.banido ? "Desativado" : "Ativo"}</td>
                <td>{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString("pt-BR") : "—"}</td>
                <td style={{ display: "flex", gap: 6, justifyContent: "flex-end", padding: "6px 0" }}>
                  <button className="btn-secondary" onClick={() => {
                    const nome = prompt("Nome", u.nome); if (nome !== null) run.mutate(() => doUpdate({ data: { id: u.id, nome } }));
                  }}>Editar</button>
                  <button className="btn-secondary" onClick={() => {
                    const senha = prompt("Nova senha (mín. 10 caracteres)"); if (senha) run.mutate(() => doUpdate({ data: { id: u.id, senha } }));
                  }}>Senha</button>
                  <button className="btn-secondary" onClick={() => run.mutate(() => doUpdate({ data: { id: u.id, banido: !u.banido } }))}>
                    {u.banido ? "Reativar" : "Desativar"}
                  </button>
                  <button className="btn-secondary" onClick={() => { if (confirm(`Excluir ${u.email}?`)) run.mutate(() => doDelete({ data: { id: u.id } })); }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
