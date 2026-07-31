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

export function DateField({ numero, label, required, value, onChange, min, alert }: {
  numero: string; label: string; required?: boolean; value: string; onChange: (v: string) => void; min?: string; alert?: string;
}) {
  return (
    <FieldWrap numero={numero} label={label} required={required}>
      <input className="form-input" type="date" value={value} min={min} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 220 }} />
      {alert && (
        <div className="exp-alert">
          <i className="ti ti-alert-triangle" /> {alert}
        </div>
      )}
    </FieldWrap>
  );
}

export function SingleChoiceField({ numero, label, required, value, onChange, options, outro, outroValue, onOutroChange }: {
  numero: string; label: string; required?: boolean; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
  outro?: boolean; outroValue?: string; onOutroChange?: (v: string) => void;
}) {
  const showOutro = outro && value === "outro";
  return (
    <FieldWrap numero={numero} label={label} required={required}>
      <div className="exp-choices">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`exp-choice-btn${value === opt.value ? " selected" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {showOutro && (
        <input
          className="form-input"
          style={{ marginTop: 8 }}
          placeholder="Qual?"
          value={outroValue ?? ""}
          onChange={(e) => onOutroChange?.(e.target.value)}
        />
      )}
    </FieldWrap>
  );
}

export function MultiChoiceField({ numero, label, required, value, onChange, options, max, outro, outroValue, onOutroChange }: {
  numero: string; label: string; required?: boolean; value: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[];
  max?: number; outro?: boolean; outroValue?: string; onOutroChange?: (v: string) => void;
}) {
  const limitReached = !!max && value.length >= max;
  const toggle = (v: string) => {
    if (value.includes(v)) { onChange(value.filter((x) => x !== v)); return; }
    if (limitReached) return;
    onChange([...value, v]);
  };
  const showOutro = outro && value.includes("outro");
  return (
    <FieldWrap numero={numero} label={label} required={required} note={max ? `Selecione até ${max} opções.` : undefined}>
      <div className="exp-choices">
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              className={`exp-choice-btn${selected ? " selected" : ""}`}
              disabled={!selected && limitReached}
              onClick={() => toggle(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {showOutro && (
        <input
          className="form-input"
          style={{ marginTop: 8 }}
          placeholder="Qual?"
          value={outroValue ?? ""}
          onChange={(e) => onOutroChange?.(e.target.value)}
        />
      )}
    </FieldWrap>
  );
}
