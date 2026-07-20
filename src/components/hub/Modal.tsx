import { type ReactNode, useEffect, useId } from "react";

export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = "default",
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: string;
  tone?: "default" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      window.addEventListener("keydown", onKey);
      document.body.classList.add("modal-open");
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [open, onClose]);

  return (
    <div
      className={`modal-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal modal-${size} modal-tone-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <span className="modal-accent" />
        <div className="modal-header">
          {icon && <span className="modal-icon"><i className={`ti ${icon}`} /></span>}
          <div className="modal-heading">
            <div className="modal-title" id={titleId}>{title}</div>
            {description && <div className="modal-description">{description}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            <i className="ti ti-x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  icon = "ti-alert-triangle",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  icon?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description="Revise o impacto antes de continuar." icon={icon} tone="danger" size="sm">
      <div className="confirm-message">{message}</div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn-danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          <i className={`ti ${icon}`} />
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
