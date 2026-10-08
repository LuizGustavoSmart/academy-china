import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import hubCss from "../styles-hub.css?url";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Academy China 2026 CRM" },
      { name: "description", content: "Acesso restrito à plataforma operacional Academy China 2026." },
      { property: "og:title", content: "Entrar — Academy China 2026 CRM" },
      { property: "og:description", content: "Acesso restrito à plataforma operacional." },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "stylesheet", href: hubCss },
      { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setLoading(false);
    if (error) { setErro("E-mail ou senha incorretos."); setSenha(""); return; }
    navigate({ to: "/admin", replace: true });
  };

  const reset = async () => {
    if (!email) { setErro("Digite seu e-mail para redefinir a senha."); return; }
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setResetMsg("Se o e-mail existir, enviaremos um link de redefinição.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <form onSubmit={submit} style={{ background: "var(--surface)", border: ".5px solid var(--border)", borderRadius: "var(--radius)", padding: "40px 48px", width: 380, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Academy China 2026</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Acesso restrito</div>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">E-mail</label>
          <input className="form-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Senha</label>
          <input className="form-input" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <div style={{ fontSize: 12, color: "var(--accent)" }}>{erro}</div>}
        {resetMsg && <div style={{ fontSize: 12, color: "var(--text3)" }}>{resetMsg}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <button type="button" onClick={reset} style={{ background: "none", border: 0, color: "var(--text3)", fontSize: 12, cursor: "pointer" }}>
          Esqueci minha senha
        </button>
      </form>
    </div>
  );
}
