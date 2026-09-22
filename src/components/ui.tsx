"use client";

import type { ReactNode } from "react";
import { initials } from "@/lib/format";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`field ${className ?? ""} ${error ? "has-error" : ""}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required ? <span className="req"> *</span> : null}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Avatar({ name, src, size = 48 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.34) };
  if (src) return <img className="avatar" src={src} alt="" width={size} height={size} style={style} />;
  return (
    <span className="avatar avatar-fallback" style={style} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge status-${status}`}>{label}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <img src="/brand/emblem.png" alt="" width="72" height="72" />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty error-state" role="alert">
      <h2>Não foi possível carregar</h2>
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Tentar de novo
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton" />
      ))}
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
