import { KINSHIP_TYPES, STATUSES } from "./constants";

export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function saoPauloToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function saoPauloHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
  );
}

export function greeting(date = new Date()) {
  const hour = saoPauloHour(date);
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nextWeekday(iso: string, weekday: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const delta = (weekday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function weekdayIndex(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export function weekdayName(iso: string) {
  return WEEKDAYS[weekdayIndex(iso)] ?? "";
}

export function weekdayShort(iso: string) {
  return WEEKDAYS_SHORT[weekdayIndex(iso)] ?? "";
}

export function monthName(iso: string) {
  return MONTHS[Number(iso.slice(5, 7)) - 1] ?? "";
}

export function monthShort(iso: string) {
  return MONTHS_SHORT[Number(iso.slice(5, 7)) - 1] ?? "";
}

export function formatDateBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatLongDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${Number(day)} de ${monthName(iso)} de ${year}`;
}

export function formatMonthYear(iso: string) {
  return `${monthName(iso)} de ${iso.slice(0, 4)}`;
}

export function formatTime(time: string) {
  const [hour, minute] = time.split(":");
  if (!hour || minute == null) return time;
  return `${hour}h${minute}`;
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function relativeTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "—";
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return formatDateTime(date);
}

export function daysUntil(iso: string, today = saoPauloToday()) {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${iso}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

export function whenLabel(iso: string, today = saoPauloToday()) {
  const delta = daysUntil(iso, today);
  if (delta === 0) return "Hoje";
  if (delta === 1) return "Amanhã";
  if (delta === -1) return "Ontem";
  if (delta > 1 && delta < 7) return `Em ${delta} dias`;
  if (delta < 0 && delta > -7) return `Há ${Math.abs(delta)} dias`;
  return formatLongDate(iso);
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 10) return value.trim();
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length < 3) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCpf(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)].filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]}.${parts[1]}`;
  if (parts.length === 3) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`;
}

export function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) return value.trim();
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function statusLabel(status: string) {
  return STATUSES.find((item) => item.id === status)?.label ?? status;
}

export function kinshipLabel(type: string | null | undefined) {
  if (!type) return "";
  return KINSHIP_TYPES.find((item) => item.id === type)?.label ?? type;
}

export function changeTypeLabel(type: string) {
  const labels: Record<string, string> = {
    criacao: "Criação",
    atualizacao: "Atualização cadastral",
    foto: "Foto",
    parentesco: "Parentesco",
    cargo_eclesiastico: "Cargo eclesiástico",
    cargo_local: "Cargo local",
    status: "Status",
  };
  return labels[type] ?? type;
}

export function initials(name: string) {
  const ignore = new Set(["de", "da", "do", "das", "dos", "e"]);
  const parts = name
    .replace(/^(pr\.?|pra\.?|ev\.?|pb\.?|dc\.?|miss\.?|irmã|irma|irmão|irmao)\s+/i, "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part && !ignore.has(fold(part)));
  if (!parts.length) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export function suggestedRoleName(fullName: string, titles: string[]) {
  const folded = titles.map((title) => fold(title));
  const has = (part: string) => folded.some((title) => title.includes(fold(part)));
  if (has("pastora")) return `Pra. ${fullName}`;
  if (has("pastor") || has("bispo")) return `Pr. ${fullName}`;
  if (has("evangelista")) return `Ev. ${fullName}`;
  if (has("presbitero")) return `Pb. ${fullName}`;
  if (has("diaconisa")) return `Dc. ${fullName}`;
  if (has("diacono")) return `Dc. ${fullName}`;
  if (has("mission")) return `Miss. ${fullName}`;
  return fullName;
}

export function mergeTitles(presets: string[], extra: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const title of [...presets, ...extra]) {
    const key = fold(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(title.trim());
  }
  return merged;
}

export function slugify(value: string) {
  return fold(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "culto";
}

export function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}`;
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function ageTurning(birthDate: string, today = saoPauloToday()) {
  return Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
}

export function listPhrase(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function formatMaybe(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDateBR(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return Object.entries(item as Record<string, unknown>)
            .filter(([, entry]) => entry != null && entry !== "")
            .map(([key, entry]) => `${key}: ${formatMaybe(entry)}`)
            .join(" · ");
        }
        return formatMaybe(item);
      })
      .join("\n");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
}

export function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "true");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}
