import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import hubCss from "../styles-hub.css?url";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Academy China 2026 CRM" },
      { name: "description", content: "Defina uma nova senha de acesso." },
      { property: "og:title", content: "Redefinir senha — Academy China 2026" },
      { property: "og:description", content: "Defina uma nova senha de acesso." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "stylesheet", href: hubCss }],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 10) { setErro("Mínimo de 10 caracteres."); return; }
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) { setErro(error.message); return; }
    navigate({ to: "/admin", replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <form onSubmit={submit} style={{ background: "var(--surface)", border: ".5px solid var(--border)", borderRadius: "var(--radius)", padding: "40px 48px", width: 380, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 600, textAlign: "center" }}>Nova senha</div>
        <input className="form-input" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erro && <div style={{ fontSize: 12, color: "var(--accent)" }}>{erro}</div>}
        <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>Salvar</button>
      </form>
    </div>
  );
}
