import { useParticipantResponse } from "@/lib/hub-api";
import { SECTIONS, type SectionKey } from "@/lib/experiencia-form.types";

function humanizeKey(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

function isEmptyValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function ValueDisplay({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <span className="resp-tags">
        {value.map((v, i) => (
          <span key={i} className="badge badge-neutral">{String(v)}</span>
        ))}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

function SectionValues({ section, data }: { section: SectionKey; data: unknown }) {
  if (section === "indicacoes") {
    const list = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    const withContent = list.filter((item) => Object.values(item ?? {}).some((v) => !isEmptyValue(v)));
    if (!withContent.length) return <div className="tl-empty" style={{ padding: 10 }}>Nenhuma indicação registrada.</div>;
    return (
      <>
        {withContent.map((item, idx) => (
          <div key={idx} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: idx < withContent.length - 1 ? ".5px solid var(--border)" : "none" }}>
            {Object.entries(item).filter(([, v]) => !isEmptyValue(v)).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}>
                <span style={{ color: "var(--text3)" }}>{humanizeKey(k)}</span>
                <ValueDisplay value={v} />
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }

  const entries = Object.entries((data ?? {}) as Record<string, unknown>).filter(([, v]) => !isEmptyValue(v));
  if (!entries.length) return <div className="tl-empty" style={{ padding: 10 }}>Aguardando resposta.</div>;
  return (
    <>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 12, borderBottom: ".5px solid var(--border)" }}>
          <span style={{ color: "var(--text3)", flexShrink: 0, maxWidth: "55%" }}>{humanizeKey(k)}</span>
          <ValueDisplay value={v} />
        </div>
      ))}
    </>
  );
}

export function ParticipantResponsesPanel({ participantId }: { participantId: string }) {
  const { data: response, isLoading } = useParticipantResponse(participantId);

  if (isLoading) return null;

  if (!response) {
    return (
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header"><i className="ti ti-clipboard-text" /> Respostas do formulário de experiência</div>
        <div className="panel-body">
          <span className="badge badge-neutral">Aguardando resposta</span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span><i className="ti ti-clipboard-text" /> Respostas do formulário de experiência</span>
        <span className={`badge ${response.status === "concluido" ? "badge-ok" : "badge-warn"}`}>
          {response.status === "concluido" ? "Concluído" : response.status === "em_andamento" ? "Em andamento" : "Não iniciado"}
        </span>
      </div>
      <div className="panel-body">
        {SECTIONS.map((s) => (
          <div key={s.key} style={{ marginBottom: 18 }}>
            <div className="section-label" style={{ marginTop: 0, marginBottom: 6 }}>{s.numero} · {s.titulo}</div>
            <SectionValues section={s.key} data={(response as any)[s.key]} />
          </div>
        ))}
      </div>
    </div>
  );
}
