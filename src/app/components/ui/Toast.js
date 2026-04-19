"use client";

export default function Toast({ id, title, description, variant, onDismiss }) {
  return (
    <div
      className={`toast-item ${variant === "error" ? "is-error" : ""} ${
        variant === "success" ? "is-success" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="toast-item__content">
        <div className="toast-item__title">{title}</div>
        {description ? (
          <div className="toast-item__description">{description}</div>
        ) : null}
      </div>
      <button
        type="button"
        className="toast-item__close"
        aria-label="Tutup toast"
        onClick={() => onDismiss(id)}
      >
        ×
      </button>
    </div>
  );
}
