import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { DashboardPage } from "@/components/hub/pages/Dashboard";
import { ParticipantesPage } from "@/components/hub/pages/Participantes";
import { FinanceiroPage } from "@/components/hub/pages/Financeiro";
import { ComercialPage } from "@/components/hub/pages/Comercial";
import { PreViagemPage } from "@/components/hub/pages/PreViagem";
import { ViagemPage } from "@/components/hub/pages/Viagem";
import { PendenciasList } from "@/components/hub/PendenciasList";
import { usePendencias } from "@/lib/hub-api";

import hubCss from "../../styles-hub.css?url";

const SESSION_KEY = "academy_hub_auth";
const SENHA = "Matter@2026";

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (value === SENHA) {
      localStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setValue("");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        background: "var(--surface)",
        border: ".5px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "40px 48px",
        width: 360,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>
            <i className="ti ti-map-2" style={{ color: "var(--accent)" }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Academy China 2026</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>Matter Academy · Plataforma Operacional</div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Senha de acesso</label>
          <input
            className="form-input"
            type="password"
            placeholder="Digite a senha"
            value={value}
            autoFocus
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            style={error ? { borderColor: "var(--accent)" } : undefined}
          />
          {error && (
            <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 6 }}>
              <i className="ti ti-alert-circle" /> Senha incorreta. Tente novamente.
            </div>
          )}
        </div>

        <button className="btn-primary" onClick={submit} style={{ width: "100%", justifyContent: "center" }}>
          Entrar
        </button>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY) === "1") setUnlocked(true);
  }, []);

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  return <>{children}</>;
}

export const Route = createFileRoute("/admin/")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: hubCss },
      { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css" },
    ],
  }),
  component: Index,
});

type Tab = "dashboard" | "participantes" | "financeiro" | "comercial" | "preop" | "operacional" | "pendencias";

const PAGE_META: Record<Tab, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Visão geral da operação" },
  participantes: { title: "Participantes", sub: "Dados e perfis dos confirmados" },
  financeiro: { title: "Financeiro", sub: "Receita, custos e margens" },
  comercial: { title: "Comercial", sub: "Etapas · Funil comercial" },
  preop: { title: "Pré-viagem", sub: "Etapas · Fase pré-operacional" },
  operacional: { title: "Viagem", sub: "Etapas · Fase operacional" },
  pendencias: { title: "Pendências", sub: "Backlog unificado" },
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
};

function Index() {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
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
    <AuthGate>
      <div className="app-shell">
        <nav className={`sidebar${collapsed ? " collapsed" : ""}`}>
          <div className="sidebar-brand" style={{ padding: "10px 16px 8px", display: "flex", justifyContent: "center" }}>
            <img
              src="/assets-academy/academy-china-logo.png"
              alt="Academy China 2026"
              style={{ maxWidth: "68%", height: "auto", display: "block" }}
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
          </div>
        </div>
      </div>
    </AuthGate>
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
