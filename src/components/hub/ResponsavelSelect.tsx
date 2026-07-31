import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateResponsavel, useResponsaveis, respAvatar, type Responsavel } from "@/lib/hub-api";

/** Avatar circular colorido a partir do nome do responsável. */
export function RespAvatar({ nome, size = 20 }: { nome: string; size?: number }) {
  const { initials, color } = respAvatar(nome);
  return (
    <span
      className="resp-avatar"
      title={nome}
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.42) }}
    >
      {initials}
    </span>
  );
}

/** Exibição somente-leitura dos responsáveis (tabela / cards do pipeline). */
export function ResponsavelTags({ responsaveis, size = 20, max = 3 }: { responsaveis?: Responsavel[] | null; size?: number; max?: number }) {
  const list = responsaveis ?? [];
  if (!list.length) return <span style={{ fontSize: 11, color: "var(--text3)" }}>—</span>;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <span className="resp-tags">
      {shown.map((r) => (
        <span key={r.id} className="resp-tag" title={r.nome}>
          <RespAvatar nome={r.nome} size={size} />
          <span className="resp-tag-name">{r.nome}</span>
        </span>
      ))}
      {rest > 0 && <span className="resp-tag resp-tag-more">+{rest}</span>}
    </span>
  );
}

/** Seletor de um único responsável (busca + criação), usado no composer de timelines. */
export function AutorSelect({ value, onChange, placeholder = "Selecione o responsável…" }: { value: string; onChange: (nome: string) => void; placeholder?: string }) {
  const { data: responsaveis = [] } = useResponsaveis();
  const create = useCreateResponsavel();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [created, setCreated] = useState<Responsavel[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = useMemo(
    () => [...new Map([...responsaveis, ...created].map((responsavel) => [responsavel.id, responsavel])).values()],
    [responsaveis, created],
  );
  const q = query.trim().toLowerCase();
  const filtered = options.filter((r) => r.nome.toLowerCase().includes(q));
  const exactMatch = options.some((r) => r.nome.toLowerCase() === q);
  const canCreate = q.length > 0 && !exactMatch;

  const select = (nome: string) => {
    onChange(nome);
    setQuery("");
    setOpen(false);
  };

  const handleCreate = async () => {
    const nome = query.trim();
    if (!nome) return;
    const novo = await create.mutateAsync(nome);
    setCreated((current) => (current.some((responsavel) => responsavel.id === novo.id) ? current : [...current, novo]));
    select(novo.nome);
  };

  return (
    <div className="resp-select resp-select-single" ref={boxRef}>
      <div className="resp-select-control" onClick={() => setOpen(true)}>
        {value ? (
          <span className="resp-chip" title={value}>
            <RespAvatar nome={value} size={16} />
            <span className="resp-chip-name">{value}</span>
          </span>
        ) : null}
        <input
          className="resp-select-input"
          value={query}
          placeholder={value ? "" : placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) { e.preventDefault(); void handleCreate(); }
          }}
        />
      </div>
      {open && (
        <div className="resp-select-menu">
          {filtered.map((r) => (
            <button
              type="button"
              key={r.id}
              className={`resp-select-option${value === r.nome ? " selected" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(r.nome)}
            >
              <RespAvatar nome={r.nome} size={20} />
              <span className="resp-select-option-name">{r.nome}</span>
              {value === r.nome && <i className="ti ti-check" style={{ marginLeft: "auto", color: "var(--teal)" }} />}
            </button>
          ))}
          {filtered.length === 0 && !canCreate && (
            <div className="resp-select-empty">Nenhum responsável cadastrado.</div>
          )}
          {canCreate && (
            <button
              type="button"
              className="resp-select-create"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void handleCreate()}
              disabled={create.isPending}
            >
              <i className="ti ti-plus" /> Novo responsável: <strong>“{query.trim()}”</strong>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Seletor dinâmico com múltipla seleção, busca e criação de novos responsáveis. */
export function ResponsavelSelect({ value, onChange, inlineMenu = false }: { value: string[]; onChange: (ids: string[]) => void; inlineMenu?: boolean }) {
  const { data: responsaveis = [] } = useResponsaveis();
  const create = useCreateResponsavel();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [created, setCreated] = useState<Responsavel[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const options = useMemo(
    () => [...new Map([...responsaveis, ...created].map((responsavel) => [responsavel.id, responsavel])).values()],
    [responsaveis, created],
  );
  const byId = useMemo(() => new Map(options.map((r) => [r.id, r])), [options]);
  const selected = value.map((id) => byId.get(id)).filter(Boolean) as Responsavel[];
  const q = query.trim().toLowerCase();
  const filtered = options.filter((r) => r.nome.toLowerCase().includes(q));
  const exactMatch = options.some((r) => r.nome.toLowerCase() === q);
  const canCreate = q.length > 0 && !exactMatch;

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const handleCreate = async () => {
    const nome = query.trim();
    if (!nome) return;
    const novo = await create.mutateAsync(nome);
    setCreated((current) => current.some((responsavel) => responsavel.id === novo.id) ? current : [...current, novo]);
    if (!value.includes(novo.id)) onChange([...value, novo.id]);
    setQuery("");
  };

  return (
    <div className="resp-select" ref={boxRef}>
      <div className="resp-select-control" onClick={() => setOpen(true)}>
        {selected.map((r) => (
          <span key={r.id} className="resp-chip" title={r.nome}>
            <RespAvatar nome={r.nome} size={16} />
            <span className="resp-chip-name">{r.nome}</span>
            <button
              type="button"
              className="resp-chip-x"
              aria-label={`Remover ${r.nome}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { e.stopPropagation(); onChange(value.filter((x) => x !== r.id)); }}
            >
              <i className="ti ti-x" />
            </button>
          </span>
        ))}
        <input
          className="resp-select-input"
          value={query}
          placeholder={selected.length ? "" : "Selecione ou pesquise…"}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canCreate) { e.preventDefault(); void handleCreate(); }
            if (e.key === "Backspace" && !query && selected.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
      {open && (
        <div className={`resp-select-menu${inlineMenu ? " resp-select-menu-inline" : ""}`}>
          {filtered.map((r) => {
            const on = value.includes(r.id);
            return (
              <button
                type="button"
                key={r.id}
                className={`resp-select-option${on ? " selected" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(r.id)}
              >
                <RespAvatar nome={r.nome} size={20} />
                <span className="resp-select-option-name">{r.nome}</span>
                {on && <i className="ti ti-check" style={{ marginLeft: "auto", color: "var(--teal)" }} />}
              </button>
            );
          })}
          {filtered.length === 0 && !canCreate && (
            <div className="resp-select-empty">Nenhum responsável cadastrado.</div>
          )}
          {canCreate && (
            <button
              type="button"
              className="resp-select-create"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void handleCreate()}
              disabled={create.isPending}
            >
              <i className="ti ti-plus" /> Novo responsável: <strong>“{query.trim()}”</strong>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
