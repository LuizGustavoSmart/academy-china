import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { DashboardPage } from "@/components/hub/pages/Dashboard";
import { ParticipantesPage } from "@/components/hub/pages/Participantes";
import { FinanceiroPage } from "@/components/hub/pages/Financeiro";
import { ComercialPage } from "@/components/hub/pages/Comercial";
import { PreViagemPage } from "@/components/hub/pages/PreViagem";
import { ViagemPage } from "@/components/hub/pages/Viagem";
import { PendenciasList } from "@/components/hub/PendenciasList";
import { AliancasPage } from "@/components/hub/pages/Aliancas";
import { SincronizacaoPage } from "@/components/hub/pages/Sincronizacao";
import { ConfiguracoesPage } from "@/components/hub/pages/Configuracoes";
import { ExperienciaPage } from "@/components/hub/pages/Experiencia";
import { usePendencias } from "@/lib/hub-api";
import menuLogo from "@/assets/china2026-academy-logo.png.asset.json";

import hubCss from "../../styles-hub.css?url";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

type GateState = "loading" | "forbidden" | "ok";

function AuthGate({ children }: { children: (signOut: () => void, email: string) => ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [state, setState] = useState<GateState>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) { navigate({ to: "/login", replace: true }); return; }
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!alive) return;
      setEmail(user.email ?? "");
      setState(isAdmin ? "ok" : "forbidden");
      if (isAdmin) {
        const k = `admin_log_${user.id}`;
        if (!sessionStorage.getItem(k)) {
          sessionStorage.setItem(k, "1");
          void supabase.from("admin_access_log").insert({ user_id: user.id, email: user.email, acao: "acesso_admin" });
        }
      }
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/login", replace: true });
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (state === "loading") return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
  if (state === "forbidden") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, fontWeight: 700 }}>403</div>
          <div style={{ margin: "8px 0 16px", color: "var(--text3)" }}>Sua conta ({email}) não tem permissão de administrador.</div>
          <button className="btn-primary" onClick={signOut}>Sair</button>
        </div>
      </div>
    );
  }
  return <>{children(signOut, email)}</>;
}

export const Route = createFileRoute("/admin/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CRM — Academy China 2026" },
      { name: "description", content: "Plataforma operacional restrita da Academy China 2026." },
      { property: "og:title", content: "CRM — Academy China 2026" },
      { property: "og:description", content: "Plataforma operacional restrita." },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "stylesheet", href: hubCss },
      { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" },
    ],
  }),
  component: Index,
});

type Tab = "dashboard" | "participantes" | "financeiro" | "comercial" | "preop" | "operacional" | "pendencias" | "aliancas" | "experiencia" | "sincronizacao" | "config";

const PAGE_META: Record<Tab, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Visão geral da operação" },
  participantes: { title: "Participantes", sub: "Dados e perfis dos confirmados" },
  financeiro: { title: "Financeiro", sub: "Receita, custos e margens" },
  comercial: { title: "Comercial", sub: "Etapas · Funil comercial" },
  preop: { title: "Pré-viagem", sub: "Etapas · Fase pré-operacional" },
  operacional: { title: "Viagem", sub: "Etapas · Fase operacional" },
  pendencias: { title: "Pendências", sub: "Backlog unificado" },
  aliancas: { title: "Alianças estratégicas", sub: "Parceiros institucionais da Academy" },
  experiencia: { title: "Formulário de Experiência", sub: "Curadoria individual de cada participante" },
  sincronizacao: { title: "Sincronização", sub: "Exportar CRM para Google Sheets" },
  config: { title: "Configurações", sub: "Responsáveis e automação de e-mails" },
};

const SUBTABS: Record<string, { id: string; label: string; icon: string }[]> = {
  comercial: [
    { id: "dash", label: "Dashboard", icon: "ti-chart-bar" },
    { id: "leads", label: "Leads", icon: "ti-table" },
    { id: "pipeline", label: "Pipeline", icon: "ti-layout-columns" },
    { id: "mensagens", label: "Mensagens", icon: "ti-message" },
    { id: "pendencias", label: "Pendências", icon: "ti-alert-triangle" },
  ],
  preop: [
    { id: "dash", label: "Dashboard", icon: "ti-chart-bar" },
    { id: "pipeline", label: "Pipeline", icon: "ti-calendar-event" },
    { id: "parts", label: "Participantes", icon: "ti-users" },
    { id: "mensagens", label: "Mensagens", icon: "ti-message" },
    { id: "pendencias", label: "Pendências", icon: "ti-alert-triangle" },
  ],
  operacional: [
    { id: "dash", label: "Dashboard", icon: "ti-chart-bar" },
    { id: "prog", label: "Programação", icon: "ti-map-2" },
    { id: "pend", label: "Pendências", icon: "ti-alert-triangle" },
    { id: "msgs", label: "Mensagens", icon: "ti-message" },
  ],
  aliancas: [
    { id: "dash", label: "Visão geral", icon: "ti-handshake" },
    { id: "marketing", label: "Marketing", icon: "ti-speakerphone" },
  ],
  // "dash" é o sub padrão de switchTab — usá-lo na primeira aba mantém ela
  // destacada ao entrar em Configurações, como nas demais páginas.
  config: [
    { id: "dash", label: "Responsáveis", icon: "ti-users-plus" },
    { id: "emails", label: "Automação de E-mails", icon: "ti-mail-cog" },
    { id: "usuarios", label: "Usuários", icon: "ti-user-shield" },
  ],
};

function Index() {
  return <AuthGate>{(signOut, email) => <Shell signOut={signOut} email={email} />}</AuthGate>;
}

function Shell({ signOut, email }: { signOut: () => void; email: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>("preop");
  const [sub, setSub] = useState<string>("dash");
  const [etapasOpen, setEtapasOpen] = useState(true);
  const [openParticipantId, setOpenParticipantId] = useState<string | null>(null);
  const { data: pendencias = [] } = usePendencias();
  const pendCount = pendencias.filter((p) => p.status !== "resolvida").length;

  const switchTab = (t: Tab) => {
    setTab(t);
    setSub("dash");
    if (t === "participantes") setOpenParticipantId(null);
    if (t === "comercial" || t === "preop" || t === "operacional") setEtapasOpen(true);
  };

  const meta = PAGE_META[tab];
  const subtabs = SUBTABS[tab];

  return (
    <>
      <div className="app-shell">
        <nav className={`sidebar${collapsed ? " collapsed" : ""}`}>
          <div className="sidebar-brand" style={{ padding: "10px 16px 8px", display: "flex", justifyContent: "center" }}>
            <img
              src={menuLogo.url}
              alt="Academy China 2026"
              style={{ maxWidth: "72%", height: "auto", display: "block" }}
            />
          </div>
          <div className="sidebar-nav">
            <div className="nav-section-label">Menu</div>
            <NavItem active={tab === "dashboard"} icon="ti-layout-dashboard" label="Dashboard" onClick={() => switchTab("dashboard")} />
            <NavItem active={tab === "participantes"} icon="ti-users" label="Participantes" onClick={() => switchTab("participantes")} />
            <NavItem active={tab === "financeiro"} icon="ti-cash" label="Financeiro" onClick={() => switchTab("financeiro")} />
            <div className="nav-section-label">Etapas</div>
            <button
              className={`nav-item${etapasOpen ? " open" : ""}`}
              onClick={() => setEtapasOpen(!etapasOpen)}
            >
              <i className="ti ti-stairs nav-icon" />
              <span className="nav-label">Etapas</span>
              <i className="ti ti-chevron-down nav-arrow" />
            </button>
            <div className={`nav-sub${etapasOpen ? " open" : ""}`}>
              <NavSubItem active={tab === "comercial"} label="Comercial" onClick={() => switchTab("comercial")} />
              <NavSubItem active={tab === "preop"} label="Pré-viagem" onClick={() => switchTab("preop")} />
              <NavSubItem active={tab === "operacional"} label="Viagem" onClick={() => switchTab("operacional")} />
            </div>
            <NavItem
              active={tab === "pendencias"}
              icon="ti-alert-triangle"
              label={`Pendências${pendCount > 0 ? ` (${pendCount})` : ""}`}
              onClick={() => switchTab("pendencias")}
            />
            <NavItem
              active={tab === "aliancas"}
              icon="ti-handshake"
              label="Alianças"
              onClick={() => switchTab("aliancas")}
            />
            <NavItem
              active={tab === "experiencia"}
              icon="ti-clipboard-text"
              label="Formulário de Experiência"
              onClick={() => switchTab("experiencia")}
            />
            <NavItem
              active={tab === "sincronizacao"}
              icon="ti-refresh"
              label="Sincronização"
              onClick={() => switchTab("sincronizacao")}
            />
            <NavItem
              active={tab === "config"}
              icon="ti-settings"
              label="Configurações"
              onClick={() => switchTab("config")}
            />
          </div>
          <div className="sidebar-toggle">
            <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
              <i className="ti ti-layout-sidebar" style={{ fontSize: 16 }} />
            </button>
          </div>
        </nav>

        <div className="right-col">
          <div className="header">
            <div>
              <div className="page-title">{meta.title}</div>
              <div className="page-breadcrumb">{meta.sub}</div>
            </div>
            <div className="header-status">
              <i className="ti ti-clock" /> Pré-operacional em curso
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--text3)" }}>
              {email}
              <button className="btn-secondary" onClick={signOut}><i className="ti ti-logout" /> Sair</button>
            </div>
          </div>

          {subtabs && (
            <div className="sub-tabs">
              {subtabs.map((s) => (
                <button
                  key={s.id}
                  className={`sub-tab-btn${sub === s.id ? " active" : ""}`}
                  onClick={() => setSub(s.id)}
                >
                  <i className={`ti ${s.icon}`} style={{ fontSize: 13 }} /> {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="main-content">
            {tab === "dashboard" && <DashboardPage />}
            {tab === "participantes" && (
              <ParticipantesPage openId={openParticipantId} setOpenId={setOpenParticipantId} />
            )}
            {tab === "financeiro" && <FinanceiroPage />}
            {tab === "comercial" && <ComercialPage sub={sub} onViewParticipant={(id) => { switchTab("participantes"); setOpenParticipantId(id); }} />}
            {tab === "preop" && <PreViagemPage sub={sub} onViewParticipant={(id) => { switchTab("participantes"); setOpenParticipantId(id); }} />}
            {tab === "operacional" && <ViagemPage sub={sub} />}
            {tab === "pendencias" && <PendenciasList title="Backlog unificado — todas as fases" />}
            {tab === "aliancas" && <AliancasPage sub={sub} />}
            {tab === "experiencia" && <ExperienciaPage />}
            {tab === "sincronizacao" && <SincronizacaoPage />}
            {tab === "config" && <ConfiguracoesPage sub={sub} />}
          </div>
        </div>
      </div>
    </>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button className={`nav-item${active ? " active" : ""}`} onClick={onClick}>
      <i className={`ti ${icon} nav-icon`} />
      <span className="nav-label">{label}</span>
    </button>
  );
}

function NavSubItem({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`nav-sub-item${active ? " active" : ""}`} onClick={onClick}>
      <span className="nav-sub-dot" />
      {label}
    </button>
  );
}
