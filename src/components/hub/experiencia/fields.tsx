import type { ReactNode } from "react";

function FieldWrap({ numero, label, required, note, children }: { numero: string; label: string; required?: boolean; note?: string; children: ReactNode }) {
  return (
    <div className="exp-field">
      <div className="exp-field-label">
        <span className="exp-field-num">{numero}</span>
        <span>
          {label}
          {required && <span className="exp-field-required">*</span>}
        </span>
      </div>
      {children}
      {note && <div className="exp-field-note">{note}</div>}
    </div>
  );
}

export function ShortTextField({ numero, label, required, value, onChange, placeholder, type = "text" }: {
  numero: string; label: string; required?: boolean; value: string; onChange: (v: string) => void; placeholder?: string; type?: "text" | "email" | "tel";
}) {
  return (
    <FieldWrap numero={numero} label={label} required={required}>
      <input
        className="form-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldWrap>
  );
}

export function LongTextField({ numero, label, required, value, onChange, placeholder, note, prefix }: {
  numero: string; label: string; required?: boolean; value: string; onChange: (v: string) => void; placeholder?: string; note?: string; prefix?: string;
}) {
  return (
    <FieldWrap numero={numero} label={label} required={required} note={note}>
      {prefix && <div style={{ fontSize: 12.5, color: "var(--text3)", marginBottom: 6 }}>{prefix}</div>}
      <textarea
        className="form-textarea"
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldWrap>
  );
}

