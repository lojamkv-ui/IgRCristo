/* Utilitários puros de formatação — usados no cliente e no servidor. */

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Converte "AAAA-MM-DD" em Date local (evita deslocamento de fuso). */
export function parseISODate(iso?: string | null): Date | null {
  if (!iso) return null;
  const value = String(iso).slice(0, 10);
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toISODate(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDateBR(iso?: string | null): string {
  const date = parseISODate(iso);
  if (!date) return "—";
  return `${`${date.getDate()}`.padStart(2, "0")}/${`${date.getMonth() + 1}`.padStart(2, "0")}/${date.getFullYear()}`;
}

export function formatLongDate(iso?: string | null): string {
  const date = parseISODate(iso);
  if (!date) return "—";
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatShortLongDate(iso?: string | null): string {
  const date = parseISODate(iso);
  if (!date) return "—";
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export function formatWeekday(iso?: string | null): string {
  const date = parseISODate(iso);
  if (!date) return "";
  const wd = WEEKDAYS[date.getDay()];
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

export function formatTimeBR(time?: string | null): string {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

/** Formata um timestamp (ISO ou Date) para o fuso local do navegador. */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value?: string | Date | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const suffix = diffMs >= 0 ? "atrás" : "";
  const prefix = diffMs < 0 ? "em " : "";
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `${prefix}${minutes} min${suffix ? " " + suffix : ""}`;
  if (hours < 24) return `${prefix}${hours} h${suffix ? " " + suffix : ""}`;
  if (days < 30) return `${prefix}${days} dia${days === 1 ? "" : "s"}${suffix ? " " + suffix : ""}`;
  return formatDateTime(date);
}

/** Diferença em dias entre hoje e uma data ISO (positivo = futuro). */
export function daysUntil(iso?: string | null): number | null {
  const date = parseISODate(iso);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function whenLabel(iso?: string | null): string {
  const days = daysUntil(iso);
  if (days === null) return "";
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days === -1) return "Ontem";
  if (days > 1) return `Em ${days} dias`;
  return `Há ${Math.abs(days)} dias`;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function titleCase(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Remove tudo que não for dígito. */
export function onlyDigits(value?: string | null): string {
  return String(value ?? "").replace(/\D+/g, "");
}

export function maskPhone(value?: string | null): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskCNPJ(value?: string | null): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function maskCEP(value?: string | null): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function ageFrom(birth?: string | null): number | null {
  const date = parseISODate(birth);
  if (!date) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const m = today.getMonth() - date.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Normaliza texto para comparações sem acento/caixa. */
export function normalize(value?: string | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(value?: string | null): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function truncate(value: string, max = 60): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
