"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { initials } from "@/lib/format";

/* ------------------------------- Button ------------------------------- */

type ButtonVariant = "primary" | "gold" | "outline" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
  full?: boolean;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  gold: "btn-gold",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export function Button({
  variant = "outline",
  size = "md",
  loading = false,
  icon,
  full = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn ${VARIANT_CLASS[variant]} ${size === "sm" ? "btn-sm" : ""} ${full ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={size === "sm" ? 14 : 16} /> : icon}
      {children}
    </button>
  );
}

/* ------------------------------- Spinner ------------------------------ */

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin-slow ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- Card -------------------------------- */

export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5 ${className}`}
    >
      {icon ? (
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="section-title truncate">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* -------------------------------- Field ------------------------------- */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = "",
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-[11px] font-medium text-ink-400">opcional</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-snug text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={`input ${invalid ? "input-error" : ""} ${className}`} aria-invalid={invalid || undefined} {...props} />;
}

export function TextArea({
  invalid,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={`input resize-y ${invalid ? "input-error" : ""} ${className}`}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <select
        className={`input appearance-none pr-9 ${invalid ? "input-error" : ""} ${className}`}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* -------------------------------- Badge ------------------------------- */

type Tone = "neutral" | "brand" | "gold" | "success" | "warning" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-surface-alt text-ink-600 border-line",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
  gold: "bg-[#fdf6e6] text-[#8a6412] border-[#f0e0b6]",
  success: "bg-success-soft text-success border-[#bfe6d5]",
  warning: "bg-warning-soft text-warning border-[#f0dcae]",
  danger: "bg-danger-soft text-danger border-[#f4cdcf]",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`chip border ${TONE_CLASS[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

const MEMBER_STATUS_TONE: Record<string, Tone> = {
  ativo: "success",
  inativo: "neutral",
  visitante: "brand",
  afastado: "warning",
};

const SERVICE_STATUS_TONE: Record<string, Tone> = {
  agendado: "brand",
  realizado: "success",
  cancelado: "danger",
};

export function StatusBadge({ kind, value }: { kind: "member" | "service"; value: string }) {
  const map = kind === "member" ? MEMBER_STATUS_TONE : SERVICE_STATUS_TONE;
  const label = value.charAt(0).toUpperCase() + value.slice(1);
  return <Badge tone={map[value] ?? "neutral"}>{label}</Badge>;
}

/* ------------------------------- Avatar ------------------------------- */

const AVATAR_SIZES: Record<string, string> = {
  xs: "h-8 w-8 text-[11px]",
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-lg",
  xl: "h-28 w-28 text-2xl",
};

/** Foto com fallback elegante para monograma quando não há imagem (ou ela falha). */
export function Avatar({
  src,
  name,
  size = "md",
  rounded = "full",
  className = "",
  ring = true,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  rounded?: "full" | "xl";
  className?: string;
  ring?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;
  const shape = rounded === "full" ? "rounded-full" : "rounded-2xl";

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden ${shape} ${AVATAR_SIZES[size]} ${
        showImage
          ? ring
            ? "ring-2 ring-white shadow-[0_0_0_1px_rgba(27,25,41,0.08)]"
            : ""
          : "bg-gradient-to-br from-brand-500 to-brand-700 text-white"
      } ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={`Foto de ${name}`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-display font-bold tracking-wide" aria-hidden="true">
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/* ---------------------------- Empty & loading -------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}>
      {icon ? (
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="font-display text-base font-bold text-ink-900">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-8 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ Segmented ------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex w-full gap-1 rounded-xl border border-line bg-surface-alt p-1 sm:w-auto ${className}`}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition sm:flex-none ${
              active
                ? "bg-white text-brand-700 shadow-sm"
                : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------ Page header ---------------------------- */

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-950 sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
