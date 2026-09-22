import type { MemberPayload, RolePayload, ServicePayload, SingerPayload } from "@/lib/types";
import { onlyDigits } from "@/lib/format";

export type Validation<T> =
  | { ok: true; data: T; errors: Record<string, string> }
  | { ok: false; data: null; errors: Record<string, string> };

const MAX_PHOTO_BYTES = 3.5 * 1024 * 1024; // ~3,5 MB em data URL

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function str(value: unknown, max = 500): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().slice(0, max);
}

export function nullable(value: unknown, max = 2000): string | null {
  const s = str(value, max);
  return s.length === 0 ? null : s;
}

/** Aceita "AAAA-MM-DD" e devolve normalizado ou null. */
export function dateValue(value: unknown): string | null {
  const s = str(value, 40);
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  return `${y}-${m}-${d}`;
}

function timeValue(value: unknown): string | null {
  const s = str(value, 10);
  if (!s) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(s);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h > 23 || min > 59) return null;
  return `${`${h}`.padStart(2, "0")}:${`${min}`.padStart(2, "0")}`;
}

function photoValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  const isDataUrl = v.startsWith("data:image/");
  const isLocalPath = v.startsWith("/") && !v.startsWith("//") && v.length < 300;
  if (!isDataUrl && !isLocalPath) return null;
  if (v.length > MAX_PHOTO_BYTES) return null;
  return v;
}

function isFuture(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return new Date(`${iso}T00:00:00`).getTime() > today.getTime();
}

/* ------------------------------------------------------------------ *
 * Membros
 * ------------------------------------------------------------------ */

export function validateMember(input: unknown): Validation<MemberPayload> {
  const errors: Record<string, string> = {};

  if (!isRecord(input)) {
    return { ok: false, data: null, errors: { _form: "Corpo da requisição inválido." } };
  }

  const name = str(input.name, 140);
  if (name.length < 3) errors.name = "Informe o nome completo (mínimo 3 caracteres).";
  if (name.length > 140) errors.name = "Nome muito longo.";

  const email = nullable(input.email, 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "E-mail inválido.";
  }

  const phone = nullable(input.phone, 30);
  if (phone) {
    const digits = onlyDigits(phone);
    if (digits.length < 10 || digits.length > 11) errors.phone = "Telefone deve ter DDD + número.";
  }

  const birthDate = dateValue(input.birthDate);
  if (str(input.birthDate) && !birthDate) errors.birthDate = "Data de nascimento inválida.";
  if (birthDate && isFuture(birthDate)) errors.birthDate = "A data de nascimento não pode ser futura.";

  const baptismDate = dateValue(input.baptismDate);
  if (str(input.baptismDate) && !baptismDate) errors.baptismDate = "Data de batismo inválida.";
  if (baptismDate && isFuture(baptismDate)) errors.baptismDate = "A data de batismo não pode ser futura.";

  const memberSince = dateValue(input.memberSince);
  if (str(input.memberSince) && !memberSince) errors.memberSince = "Data inválida.";
  if (memberSince && isFuture(memberSince)) errors.memberSince = "A data não pode ser futura.";

  const photo = photoValue(input.photo);
  if (typeof input.photo === "string" && input.photo.trim() && !photo) {
    errors.photo = "Foto inválida (use JPG/PNG de até 3 MB).";
  }

  const status = str(input.status, 20).toLowerCase();
  const allowedStatus = ["ativo", "inativo", "visitante", "afastado"];
  const finalStatus = allowedStatus.includes(status) ? status : "ativo";

  const rawRoles = Array.isArray(input.roles) ? input.roles : [];
  const roles: RolePayload[] = [];

  rawRoles.forEach((raw, index) => {
    if (!isRecord(raw)) {
      errors[`roles.${index}`] = "Cargo inválido.";
      return;
    }
    const kind = str(raw.kind, 20) === "eclesiastico" ? "eclesiastico" : "local";
    const title = str(raw.title, 120);
    if (title.length < 2) {
      errors[`roles.${index}.title`] = "Informe o nome do cargo.";
      return;
    }
    if (kind === "eclesiastico") {
      const consecrationDate = dateValue(raw.consecrationDate);
      if (!consecrationDate) {
        errors[`roles.${index}.consecrationDate`] = "Informe a data de consagração.";
        return;
      }
      if (isFuture(consecrationDate)) {
        errors[`roles.${index}.consecrationDate`] = "A consagração não pode ser futura.";
        return;
      }
      roles.push({
        id: typeof raw.id === "number" ? raw.id : null,
        kind,
        title,
        consecrationDate,
        startDate: null,
        endDate: null,
      });
      return;
    }

    const startDate = dateValue(raw.startDate);
    const endDate = dateValue(raw.endDate);
    if (!startDate) {
      errors[`roles.${index}.startDate`] = "Informe a data inicial do cargo.";
      return;
    }
    if (endDate && endDate < startDate) {
      errors[`roles.${index}.endDate`] = "A data final deve ser posterior à inicial.";
      return;
    }
    roles.push({
      id: typeof raw.id === "number" ? raw.id : null,
      kind,
      title,
      consecrationDate: null,
      startDate,
      endDate,
    });
  });

  if (Object.keys(errors).length > 0) return { ok: false, data: null, errors };

  const data: MemberPayload = {
    name,
    photo,
    birthDate,
    gender: nullable(input.gender, 40),
    email,
    phone,
    address: nullable(input.address, 300),
    city: nullable(input.city, 120),
    kinship: nullable(input.kinship, 80),
    familyName: nullable(input.familyName, 140),
    baptismDate,
    memberSince,
    status: finalStatus,
    notes: nullable(input.notes, 4000),
    roles,
  };

  return { ok: true, data, errors };
}

/* ------------------------------------------------------------------ *
 * Cultos
 * ------------------------------------------------------------------ */

export function validateService(input: unknown): Validation<ServicePayload> {
  const errors: Record<string, string> = {};

  if (!isRecord(input)) {
    return { ok: false, data: null, errors: { _form: "Corpo da requisição inválido." } };
  }

  const title = str(input.title, 140);
  if (title.length < 3) errors.title = "Informe o título do culto (mínimo 3 caracteres).";

  const serviceDate = dateValue(input.serviceDate);
  if (!serviceDate) errors.serviceDate = "Informe uma data válida.";

  const serviceTime = timeValue(input.serviceTime);
  if (!serviceTime) errors.serviceTime = "Informe um horário válido.";

  const leader = str(input.leader, 140);
  if (leader.length < 3) errors.leader = "Informe o dirigente do culto.";

  const preacherName = nullable(input.preacherName, 140);
  const preacherPhoto = photoValue(input.preacherPhoto);
  if (typeof input.preacherPhoto === "string" && input.preacherPhoto.trim() && !preacherPhoto) {
    errors.preacherPhoto = "Foto do pregador inválida.";
  }

  const rawSingers = Array.isArray(input.singers) ? input.singers : [];
  const singers: SingerPayload[] = [];
  rawSingers.forEach((raw, index) => {
    if (!isRecord(raw)) return;
    const singerName = str(raw.name, 140);
    if (singerName.length < 2) {
      errors[`singers.${index}.name`] = "Informe o nome do cantor(a).";
      return;
    }
    const singerPhoto = photoValue(raw.photo);
    if (typeof raw.photo === "string" && raw.photo.trim() && !singerPhoto) {
      errors[`singers.${index}.photo`] = "Foto inválida.";
      return;
    }
    singers.push({
      name: singerName,
      photo: singerPhoto,
      memberId: typeof raw.memberId === "number" ? raw.memberId : null,
    });
  });

  const rawIntercessors = Array.isArray(input.intercessors) ? input.intercessors : [];
  const intercessors = rawIntercessors
    .map((item) => str(item, 140))
    .filter((item) => item.length >= 2);

  const status = str(input.status, 20).toLowerCase();
  const allowedStatus = ["agendado", "realizado", "cancelado"];

  if (Object.keys(errors).length > 0) return { ok: false, data: null, errors };

  const data: ServicePayload = {
    title,
    kind: nullable(input.kind, 80),
    serviceDate: serviceDate as string,
    serviceTime: serviceTime as string,
    leader,
    preacherName,
    preacherPhoto,
    preacherMemberId: typeof input.preacherMemberId === "number" ? input.preacherMemberId : null,
    singers,
    intercessors,
    theme: nullable(input.theme, 200),
    scripture: nullable(input.scripture, 200),
    notes: nullable(input.notes, 4000),
    status: allowedStatus.includes(status) ? status : "agendado",
  };

  return { ok: true, data, errors };
}
