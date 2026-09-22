import { CADASTRAL_FIELDS, FIELD_LABELS } from "./constants";
import { fold, formatCpf, formatDateBR, kinshipLabel, listPhrase, statusLabel } from "./format";
import type { EcclesiasticalOffice, LocalOffice } from "./types";

export type HistoryDraft = {
  memberId: number;
  changeType: string;
  summary: string;
  previousData: unknown;
  newData: unknown;
  actor: string;
  changedAt: Date;
};

type Scalar = {
  fullName: string;
  birthDate: string | null;
  gender: string | null;
  maritalStatus: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  baptismDate: string | null;
  conversionDate: string | null;
  memberSince: string | null;
  notes: string | null;
  status: string;
  kinshipType: string | null;
  kinshipMemberId: number | null;
  kinshipNotes: string | null;
};

type BuildArgs = {
  memberId: number;
  actor: string;
  now: Date;
  prev: Scalar | null;
  next: Scalar;
  prevPhoto: string | null;
  nextPhoto: string | null;
  prevEcc: EcclesiasticalOffice[];
  nextEcc: EcclesiasticalOffice[];
  prevLocal: LocalOffice[];
  nextLocal: LocalOffice[];
  prevKinshipName?: string | null;
  nextKinshipName?: string | null;
};

function blank(value: string | null | undefined) {
  const text = (value ?? "").trim();
  return text ? text : null;
}

function photoMarker(photo: string | null) {
  if (!photo) return null;
  if (photo.startsWith("data:")) return "[imagem enviada]";
  return photo;
}

function snapshotScalar(value: Scalar) {
  return {
    fullName: value.fullName,
    birthDate: value.birthDate,
    gender: value.gender,
    maritalStatus: value.maritalStatus,
    phone: value.phone,
    email: value.email,
    cpf: value.cpf ? formatCpf(value.cpf) : null,
    address: value.address,
    neighborhood: value.neighborhood,
    city: value.city,
    baptismDate: value.baptismDate,
    conversionDate: value.conversionDate,
    memberSince: value.memberSince,
    notes: value.notes,
    status: statusLabel(value.status),
  };
}

function kinshipSnapshot(value: Scalar, personName?: string | null) {
  return {
    tipo: value.kinshipType ? kinshipLabel(value.kinshipType) : null,
    pessoa: personName ?? null,
    observacao: blank(value.kinshipNotes),
  };
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function occKey(title: string, index: number) {
  return `${fold(title)}#${index}`;
}

function withOccurrence<T extends { title: string }>(items: T[]) {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const key = fold(item.title);
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    return { item, key: occKey(item.title, next) };
  });
}

export function buildMemberHistory(args: BuildArgs): HistoryDraft[] {
  const rows: HistoryDraft[] = [];
  const base = { memberId: args.memberId, actor: args.actor, changedAt: args.now };

  if (!args.prev) {
    rows.push({
      ...base,
      changeType: "criacao",
      summary: "Cadastro criado.",
      previousData: null,
      newData: snapshotScalar(args.next),
    });
    if (args.nextPhoto) {
      rows.push({
        ...base,
        changeType: "foto",
        summary: "Foto adicionada no cadastro.",
        previousData: { foto: null },
        newData: { foto: photoMarker(args.nextPhoto) },
      });
    }
    if (args.next.kinshipType) {
      rows.push({
        ...base,
        changeType: "parentesco",
        summary: `Parentesco registrado: ${kinshipLabel(args.next.kinshipType)}${args.nextKinshipName ? ` de ${args.nextKinshipName}` : ""}.`,
        previousData: null,
        newData: kinshipSnapshot(args.next, args.nextKinshipName),
      });
    }
    if (args.nextEcc.length) {
      rows.push({
        ...base,
        changeType: "cargo_eclesiastico",
        summary: `Cargos eclesiásticos registrados: ${listPhrase(args.nextEcc.map((office) => office.title))}.`,
        previousData: null,
        newData: args.nextEcc,
      });
    }
    if (args.nextLocal.length) {
      rows.push({
        ...base,
        changeType: "cargo_local",
        summary: `Cargos locais registrados: ${listPhrase(args.nextLocal.map((office) => office.title))}.`,
        previousData: null,
        newData: args.nextLocal,
      });
    }
    return rows;
  }

  const previous: Record<string, unknown> = {};
  const nextData: Record<string, unknown> = {};
  const labels: string[] = [];
  for (const field of CADASTRAL_FIELDS) {
    const before = field === "cpf" ? (args.prev.cpf ? formatCpf(args.prev.cpf) : null) : blank(args.prev[field] as string | null);
    const after = field === "cpf" ? (args.next.cpf ? formatCpf(args.next.cpf) : null) : blank(args.next[field] as string | null);
    if (before !== after) {
      previous[field] = before;
      nextData[field] = after;
      labels.push(FIELD_LABELS[field] ?? field);
    }
  }
  if (labels.length) {
    rows.push({
      ...base,
      changeType: "atualizacao",
      summary: `Dados cadastrais atualizados: ${listPhrase(labels.map((label) => label.toLowerCase()))}.`,
      previousData: previous,
      newData: nextData,
    });
  }

  if (args.prev.status !== args.next.status) {
    rows.push({
      ...base,
      changeType: "status",
      summary: `Status alterado de ${statusLabel(args.prev.status)} para ${statusLabel(args.next.status)}.`,
      previousData: { status: statusLabel(args.prev.status) },
      newData: { status: statusLabel(args.next.status) },
    });
  }

  if (photoMarker(args.prevPhoto) !== photoMarker(args.nextPhoto)) {
    const summary = !args.nextPhoto ? "Foto removida." : !args.prevPhoto ? "Foto adicionada." : "Foto atualizada.";
    rows.push({
      ...base,
      changeType: "foto",
      summary,
      previousData: { foto: photoMarker(args.prevPhoto) },
      newData: { foto: photoMarker(args.nextPhoto) },
    });
  }

  const prevKin = kinshipSnapshot(args.prev, args.prevKinshipName);
  const nextKin = kinshipSnapshot(args.next, args.nextKinshipName);
  if (!sameJson(prevKin, nextKin)) {
    const summary = !args.next.kinshipType
      ? "Parentesco removido."
      : `Parentesco atualizado para ${kinshipLabel(args.next.kinshipType)}${args.nextKinshipName ? ` de ${args.nextKinshipName}` : ""}.`;
    rows.push({
      ...base,
      changeType: "parentesco",
      summary,
      previousData: prevKin,
      newData: nextKin,
    });
  }

  const ecc = diffOffices(args.prevEcc, args.nextEcc, (office) => `${office.title}|${office.consecrationDate}|${blank(office.notes) ?? ""}`, (office) => `${office.title} (consagração ${formatDateBR(office.consecrationDate)})`);
  if (ecc) {
    rows.push({
      ...base,
      changeType: "cargo_eclesiastico",
      summary: ecc.summary,
      previousData: args.prevEcc,
      newData: args.nextEcc,
    });
  }

  const local = diffOffices(
    args.prevLocal,
    args.nextLocal,
    (office) => `${office.title}|${office.startDate}|${office.endDate ?? ""}|${blank(office.notes) ?? ""}`,
    (office) => `${office.title} (início ${formatDateBR(office.startDate)}${office.endDate ? `, fim ${formatDateBR(office.endDate)}` : ", em exercício"})`,
  );
  if (local) {
    rows.push({
      ...base,
      changeType: "cargo_local",
      summary: local.summary,
      previousData: args.prevLocal,
      newData: args.nextLocal,
    });
  }

  return rows;
}

function diffOffices<T extends { title: string }>(
  prev: T[],
  next: T[],
  signature: (item: T) => string,
  label: (item: T) => string,
) {
  const previous = withOccurrence(prev);
  const current = withOccurrence(next);
  const currentByKey = new Map(current.map((item) => [item.key, item.item]));
  const removed: string[] = [];
  const added: string[] = [];
  const changed: string[] = [];
  const seen = new Set<string>();

  for (const item of previous) {
    seen.add(item.key);
    const match = currentByKey.get(item.key);
    if (!match) removed.push(label(item.item));
    else if (signature(match) !== signature(item.item)) changed.push(label(match));
  }
  for (const item of current) {
    if (!seen.has(item.key)) added.push(label(item.item));
  }
  if (!removed.length && !added.length && !changed.length) return null;
  const parts = [
    added.length ? `Adicionado: ${listPhrase(added)}` : "",
    removed.length ? `Removido: ${listPhrase(removed)}` : "",
    changed.length ? `Alterado: ${listPhrase(changed)}` : "",
  ].filter(Boolean);
  return { summary: `${parts.join(". ")}.` };
}
