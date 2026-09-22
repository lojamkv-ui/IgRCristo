import type { HistoryChange, Member, MemberRole } from "@/db/schema";
import { ROLE_LABEL } from "@/lib/types";
import { formatDateBR, maskPhone } from "@/lib/format";

/** Campos do membro que entram no comparativo de alterações. */
const TRACKED_FIELDS: Array<{
  key: keyof Member;
  label: string;
  format?: (value: string | null) => string;
}> = [
  { key: "name", label: ROLE_LABEL.name },
  { key: "photo", label: ROLE_LABEL.photo, format: (v) => (v ? "imagem enviada" : "sem imagem") },
  { key: "birthDate", label: ROLE_LABEL.birthDate, format: formatDateBR },
  { key: "gender", label: ROLE_LABEL.gender },
  { key: "email", label: ROLE_LABEL.email },
  { key: "phone", label: ROLE_LABEL.phone, format: (v) => (v ? maskPhone(v) : "") },
  { key: "address", label: ROLE_LABEL.address },
  { key: "city", label: ROLE_LABEL.city },
  { key: "kinship", label: ROLE_LABEL.kinship },
  { key: "familyName", label: ROLE_LABEL.familyName },
  { key: "baptismDate", label: ROLE_LABEL.baptismDate, format: formatDateBR },
  { key: "memberSince", label: ROLE_LABEL.memberSince, format: formatDateBR },
  { key: "status", label: ROLE_LABEL.status },
  { key: "notes", label: ROLE_LABEL.notes },
];

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length === 0 ? null : str;
}

/**
 * Compara o registro anterior com o novo e devolve a lista de alterações.
 * É a base do histórico auditável do cadastro de membros.
 */
export function diffMember(previous: Member, next: Partial<Member>): HistoryChange[] {
  const changes: HistoryChange[] = [];

  for (const field of TRACKED_FIELDS) {
    const before = normalizeValue(previous[field.key]);
    const incoming = next[field.key];
    if (incoming === undefined) continue;
    const after = normalizeValue(incoming);
    if (before === after) continue;

    const formatter = field.format ?? ((v: string | null) => v ?? "—");
    changes.push({
      key: String(field.key),
      field: field.label,
      before: before ? formatter(before) : null,
      after: after ? formatter(after) : null,
    });
  }

  return changes;
}

export function describeRole(role: MemberRole | { kind: string; title: string; consecrationDate?: string | null; startDate?: string | null; endDate?: string | null }): string {
  if (role.kind === "eclesiastico") {
    const date = formatDateBR(role.consecrationDate ?? null);
    return `${role.title} · consagrado em ${date}`;
  }
  const start = formatDateBR(role.startDate ?? null);
  const end = role.endDate ? formatDateBR(role.endDate) : "atual";
  return `${role.title} · ${start} → ${end}`;
}

/** Constrói as alterações de cargos entre duas listas. */
export function diffRoles(
  previous: MemberRole[],
  next: Array<Partial<MemberRole> & { id?: number | null }>,
): { added: HistoryChange[]; updated: HistoryChange[]; removed: HistoryChange[] } {
  const added: HistoryChange[] = [];
  const updated: HistoryChange[] = [];
  const removed: HistoryChange[] = [];

  const nextIds = new Set(next.map((r) => r.id).filter((id): id is number => typeof id === "number"));

  for (const role of next) {
    const label = role.kind === "eclesiastico" ? "Cargo eclesiástico" : "Cargo local";
    if (typeof role.id === "number") {
      const before = previous.find((p) => p.id === role.id);
      if (!before) continue;
      const changed: string[] = [];
      if ((before.title ?? "") !== (role.title ?? "")) changed.push("nome do cargo");
      if ((before.consecrationDate ?? null) !== (role.consecrationDate ?? null))
        changed.push("data de consagração");
      if ((before.startDate ?? null) !== (role.startDate ?? null)) changed.push("data inicial");
      if ((before.endDate ?? null) !== (role.endDate ?? null)) changed.push("data final");
      if (changed.length > 0) {
        updated.push({
          key: `role:${role.id}`,
          field: label,
          before: describeRole(before),
          after: describeRole({
            kind: role.kind ?? before.kind,
            title: role.title ?? before.title,
            consecrationDate: role.consecrationDate ?? before.consecrationDate,
            startDate: role.startDate ?? before.startDate,
            endDate: role.endDate ?? before.endDate,
          }),
        });
      }
    } else if ((role.title ?? "").trim().length > 0) {
      added.push({
        key: `role:new:${Math.random().toString(36).slice(2, 8)}`,
        field: label,
        before: null,
        after: describeRole({
          kind: role.kind ?? "local",
          title: role.title ?? "",
          consecrationDate: role.consecrationDate ?? null,
          startDate: role.startDate ?? null,
          endDate: role.endDate ?? null,
        }),
      });
    }
  }

  for (const before of previous) {
    if (!nextIds.has(before.id)) {
      removed.push({
        key: `role:${before.id}`,
        field: before.kind === "eclesiastico" ? "Cargo eclesiástico" : "Cargo local",
        before: describeRole(before),
        after: null,
      });
    }
  }

  return { added, updated, removed };
}

export const HISTORY_TYPE_LABEL: Record<string, string> = {
  criado: "Cadastro criado",
  atualizado: "Dados atualizados",
  foto: "Alteração de foto",
  cargo_adicionado: "Cargo adicionado",
  cargo_atualizado: "Cargo atualizado",
  cargo_removido: "Cargo removido",
  restaurado: "Restauração / importação",
};
