import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLog,
  memberHistory,
  memberRoles,
  members,
  type HistoryChange,
  type Member,
  type MemberRole,
} from "@/db/schema";
import { describeRole, diffMember, diffRoles } from "@/lib/history";
import type { MemberPayload, MemberWithRoles } from "@/lib/types";

type HistoryType =
  | "criado"
  | "atualizado"
  | "foto"
  | "cargo_adicionado"
  | "cargo_atualizado"
  | "cargo_removido"
  | "restaurado";

function roleValues(payload: MemberPayload, memberId: number) {
  return payload.roles.map((role) => ({
    memberId,
    kind: role.kind,
    title: role.title.trim(),
    consecrationDate: role.kind === "eclesiastico" ? (role.consecrationDate ?? null) : null,
    startDate: role.kind === "local" ? (role.startDate ?? null) : null,
    endDate: role.kind === "local" ? (role.endDate ?? null) : null,
    active: role.kind === "local" ? !role.endDate : true,
  }));
}

function memberFields(payload: MemberPayload) {
  return {
    name: payload.name.trim(),
    photo: payload.photo ?? null,
    birthDate: payload.birthDate ?? null,
    gender: payload.gender ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    address: payload.address ?? null,
    city: payload.city ?? null,
    kinship: payload.kinship ?? null,
    familyName: payload.familyName ?? null,
    baptismDate: payload.baptismDate ?? null,
    memberSince: payload.memberSince ?? null,
    status: payload.status ?? "ativo",
    notes: payload.notes ?? null,
  };
}

async function logHistory(
  memberId: number,
  type: HistoryType,
  description: string,
  changes: HistoryChange[] = [],
) {
  await db.insert(memberHistory).values({ memberId, type, description, changes });
}

/** Cria o membro, seus cargos e o primeiro registro de histórico. */
export async function createMember(payload: MemberPayload): Promise<MemberWithRoles> {
  const [member] = await db
    .insert(members)
    .values({ ...memberFields(payload), createdAt: new Date(), updatedAt: new Date() })
    .returning();

  const values = roleValues(payload, member.id);
  if (values.length > 0) await db.insert(memberRoles).values(values);

  await logHistory(
    member.id,
    "criado",
    `Cadastro criado com ${values.length} cargo(s) vinculado(s).`,
    [
      {
        key: "member",
        field: "Cadastro",
        before: null,
        after: member.name,
      },
    ],
  );

  if (values.length > 0) {
    await logHistory(
      member.id,
      "cargo_adicionado",
      "Cargos registrados na criação do cadastro.",
      values.map((role) => ({
        key: `role:new:${role.title}`,
        field: role.kind === "eclesiastico" ? "Cargo eclesiástico" : "Cargo local",
        before: null,
        after: describeRole(role),
      })),
    );
  }

  return withRoles(member);
}

async function withRoles(member: Member): Promise<MemberWithRoles> {
  const roles = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, member.id))
    .orderBy(memberRoles.kind, memberRoles.title);
  return { ...member, roles };
}

/**
 * Atualiza o membro e registra, de forma granular, tudo o que mudou:
 * dados pessoais, foto, cargos adicionados, alterados e removidos.
 */
export async function updateMember(
  id: number,
  payload: MemberPayload,
): Promise<MemberWithRoles | null> {
  const previousRows = await db.select().from(members).where(eq(members.id, id)).limit(1);
  const previous = previousRows[0] as Member | undefined;
  if (!previous) return null;

  const previousRoles = await db.select().from(memberRoles).where(eq(memberRoles.memberId, id));

  const fields = memberFields(payload);
  const changes = diffMember(previous, fields);

  const [updated] = await db
    .update(members)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(members.id, id))
    .returning();

  // ---- sincronização de cargos ----
  const keptIds = payload.roles
    .map((role) => role.id)
    .filter((value): value is number => typeof value === "number");
  const removedRoles = previousRoles.filter((role) => !keptIds.includes(role.id));

  for (const role of payload.roles) {
    const base = {
      kind: role.kind,
      title: role.title.trim(),
      consecrationDate: role.kind === "eclesiastico" ? (role.consecrationDate ?? null) : null,
      startDate: role.kind === "local" ? (role.startDate ?? null) : null,
      endDate: role.kind === "local" ? (role.endDate ?? null) : null,
      active: role.kind === "local" ? !role.endDate : true,
      updatedAt: new Date(),
    };
    if (typeof role.id === "number") {
      await db.update(memberRoles).set(base).where(eq(memberRoles.id, role.id));
    } else {
      await db.insert(memberRoles).values({ ...base, memberId: id });
    }
  }

  if (removedRoles.length > 0) {
    await db
      .delete(memberRoles)
      .where(inArray(memberRoles.id, removedRoles.map((role) => role.id)));
  }

  // ---- histórico ----
  const roleDiff = diffRoles(previousRoles, payload.roles as Array<Partial<MemberRole>>);
  const photoChange = changes.find((change) => change.key === "photo");
  const dataChanges = changes.filter((change) => change.key !== "photo");

  if (photoChange) {
    await logHistory(id, "foto", "Foto do cadastro alterada.", [photoChange]);
  }
  if (dataChanges.length > 0) {
    await logHistory(
      id,
      "atualizado",
      `${dataChanges.length} campo(s) atualizado(s) no cadastro.`,
      dataChanges,
    );
  }
  if (roleDiff.added.length > 0) {
    await logHistory(id, "cargo_adicionado", "Novo(s) cargo(s) vinculado(s).", roleDiff.added);
  }
  if (roleDiff.updated.length > 0) {
    await logHistory(id, "cargo_atualizado", "Cargo(s) atualizado(s).", roleDiff.updated);
  }
  if (roleDiff.removed.length > 0) {
    await logHistory(id, "cargo_removido", "Cargo(s) removido(s) do cadastro.", roleDiff.removed);
  }

  await db.insert(activityLog).values({
    entity: "member",
    entityId: id,
    action: "update",
    description: `Cadastro de ${updated.name} atualizado (${changes.length + roleDiff.added.length + roleDiff.updated.length + roleDiff.removed.length} alteração/alterações).`,
  });

  return withRoles(updated);
}

/** Remove o membro (cargos e histórico são removidos em cascata) e registra o evento. */
export async function deleteMember(id: number): Promise<{ deleted: boolean; name?: string }> {
  const rows = await db.select().from(members).where(eq(members.id, id)).limit(1);
  const member = rows[0] as Member | undefined;
  if (!member) return { deleted: false };

  await db.insert(activityLog).values({
    entity: "member",
    entityId: id,
    action: "delete",
    description: `Cadastro de ${member.name} excluído (com cargos e histórico).`,
  });

  await db.delete(members).where(eq(members.id, id));
  return { deleted: true, name: member.name };
}
