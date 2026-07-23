import { useEffect, useRef, useState } from "react";

type NumberKind = "currency" | "integer" | "decimal";

const formatters: Record<NumberKind, Intl.NumberFormat> = {
  currency: new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  integer: new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }),
  decimal: new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }),
};

function parseBrazilianNumber(input: string): number | null {
  const clean = input
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/[^\d,.-]/g, "");
  if (!clean || clean === "-") return null;

  let normalized = clean;
  if (clean.includes(",")) {
    normalized = clean.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = (clean.match(/\./g) ?? []).length;
    if (dots > 1) normalized = clean.replace(/\./g, "");
    else if (dots === 1) {
      const [whole, fraction = ""] = clean.split(".");
      normalized = fraction.length === 3 ? `${whole}${fraction}` : clean;
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function editText(value: number, kind: NumberKind) {
  if (!Number.isFinite(value)) return "";
  if (kind === "integer") return String(Math.round(value));
  return String(value).replace(".", ",");
}

export function SmartNumberInput({
  value,
  onValueChange,
  onCommit,
  kind = "decimal",
  min,
  max,
  className = "form-input",
  ariaLabel,
  disabled = false,
}: {
  value: number;
  onValueChange?: (value: number) => void;
  onCommit?: (value: number) => void;
  kind?: NumberKind;
  min?: number;
  max?: number;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatters[kind].format(value));
  const cancelOnBlur = useRef(false);

  useEffect(() => {
    if (!focused) setText(formatters[kind].format(value));
  }, [focused, kind, value]);

  const normalize = (raw: string) => {
    const parsed = parseBrazilianNumber(raw);
    if (parsed === null) return null;
    const rounded = kind === "integer" ? Math.round(parsed) : Math.round(parsed * 100) / 100;
    return Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, rounded));
  };

  const commit = () => {
    if (cancelOnBlur.current) {
      cancelOnBlur.current = false;
      setFocused(false);
      setText(formatters[kind].format(value));
      return;
    }
    const normalized = normalize(text);
    setFocused(false);
    if (normalized === null) {
      setText(formatters[kind].format(value));
      return;
    }
    setText(formatters[kind].format(normalized));
    onValueChange?.(normalized);
    onCommit?.(normalized);
  };

  return (
    <input
      className={`${className} smart-number-input`}
      type="text"
      inputMode={kind === "integer" ? "numeric" : "decimal"}
      aria-label={ariaLabel}
      autoComplete="off"
      spellCheck={false}
      disabled={disabled}
      value={text}
      onFocus={(event) => {
        const input = event.currentTarget;
        cancelOnBlur.current = false;
        setFocused(true);
        setText(editText(value, kind));
        requestAnimationFrame(() => input.select());
      }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const normalized = normalize(next);
        if (normalized !== null) onValueChange?.(normalized);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelOnBlur.current = true;
          setText(formatters[kind].format(value));
          event.currentTarget.blur();
        }
      }}
    />
  );
}
