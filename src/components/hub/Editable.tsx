import { useState } from "react";

/** Campo inline editável (clique para editar). Compartilhado entre os detalhamentos
 * de Participante e de Lead para manter o mesmo comportamento visual. */
export function EditableField({ value, onSave, placeholder = "clique para editar" }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (editing) {
    return (
      <input className="editable-input" autoFocus value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== value) onSave(v); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setV(value); setEditing(false); } }}
      />
    );
  }
  return <span className={`editable-cell${!value ? " empty" : ""}`} onClick={() => { setV(value); setEditing(true); }}>{value || placeholder}</span>;
}

export function EditableMultiline({ value, onSave, placeholder = "Clique para adicionar…" }: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (editing) {
    return (
      <>
        <textarea className="form-textarea" value={v} onChange={(e) => setV(e.target.value)} style={{ minHeight: 120 }} />
        <div className="msg-edit-row">
          <button className="btn-secondary" onClick={() => { setV(value); setEditing(false); }}>Cancelar</button>
          <button className="btn-primary" onClick={() => { onSave(v); setEditing(false); }}>Salvar</button>
        </div>
      </>
    );
  }
  return (
    <div onClick={() => { setV(value); setEditing(true); }} style={{ fontSize: 12, color: value ? "var(--text)" : "var(--text3)", lineHeight: 1.6, cursor: "text", minHeight: 40, whiteSpace: "pre-wrap" }}>
      {value || placeholder}
    </div>
  );
}
