import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  ecclesiasticalOffices,
  localOffices,
  memberHistory,
  members,
  type MemberRow,
} from "@/db/schema";
import { buildMemberHistory } from "@/lib/history";
import { fold, formatCpf, mergeTitles, saoPauloToday, suggestedRoleName } from "@/lib/format";
import { ECCLESIASTICAL_TITLES, LOCAL_TITLES } from "@/lib/constants";
import type { MemberDetail, MemberListItem, MemberOption, MemberPayload } from "@/lib/types";
import { validateMember } from "@/lib/validators";
import { memberPhotoUrl } from "./http";

const ACCENTS = "áàâãäéèêëíìîïóòôõöúùûüç";
const PLAIN = "aaaaaeeeeiiiiooooouuuuc";

function unaccent(column: unknown) {
  return sql`translate(lower(${column}), ${ACCENTS}, ${PLAIN})`;
}

export type MemberFilters = {
  q?: string;
  ecclesiastical?: string;
  local?: string;
  localActive?: boolean;
  kinship?: string;
  status?: string;
  sort?: string;
};

function scalarFrom(row: MemberRow) {
  return {
    fullName: row.fullName,
    birthDate: row.birthDate,
    gender: row.gender,
    maritalStatus: row.maritalStatus,
    phone: row.phone,
    email: row.email,
    cpf: row.cpf,
    address: row.address,
    neighborhood: row.neighborhood,
    city: row.city,
    baptismDate: row.baptismDate,
    conversionDate: row.conversionDate,
    memberSince: row.memberSince,
    notes: row.notes,
    status: row.status,
    kinshipType: row.kinshipType,
    kinshipMemberId: row.kinshipMemberId,
    kinshipNotes: row.kinshipNotes,
  };
}

async function loadOffices(ids: number[]) {
  if (!ids.length) return { ecc: [], local: [] };
  const [ecc, local] = await Promise.all([
    db.select().from(ecclesiasticalOffices).where(inArray(ecclesiasticalOffices.memberId, ids)).orderBy(asc(ecclesiasticalOffices.consecrationDate)),
    db.select().from(localOffices).where(inArray(localOffices.memberId, ids)).orderBy(desc(localOffices.startDate)),
  ]);
  return { ecc, local };
}

export async function listMembers(filters: MemberFilters = {}): Promise<MemberListItem[]> {
  const today = saoPauloToday();
  const conditions = [];
  const query = filters.q?.trim();
  if (query) {
    conditions.push(sql`${unaccent(members.fullName)} like ${`%${fold(query).replace(/[\\%_]/g, "")}%`}`);
  }
  if (filters.status) conditions.push(eq(members.status, filters.status));
  if (filters.kinship === "__none__") conditions.push(sql`${members.kinshipType} is null`);
  else if (filters.kinship) conditions.push(eq(members.kinshipType, filters.kinship));
  if (filters.ecclesiastical) {
    conditions.push(sql`exists (
      select 1 from ecclesiastical_offices eo
      where eo.member_id = ${members.id}
      and translate(lower(eo.title), ${ACCENTS}, ${PLAIN}) = ${fold(filters.ecclesiastical)}
    )`);
  }
  if (filters.local) {
    conditions.push(sql`exists (
      select 1 from local_offices lo
      where lo.member_id = ${members.id}
      and translate(lower(lo.title), ${ACCENTS}, ${PLAIN}) = ${fold(filters.local)}
      and (${filters.localActive === false} or lo.end_date is null or lo.end_date >= ${today})
    )`);
  }

  const kin = alias(members, "kin");
  const rows = await db
    .select({
      member: members,
      kinshipName: kin.fullName,
    })
    .from(members)
    .leftJoin(kin, eq(members.kinshipMemberId, kin.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(1000);

  const ids = rows.map((row) => row.member.id);
  const { ecc, local } = await loadOffices(ids);
  const items = rows.map((row) => mapListItem(row.member, row.kinshipName, ecc.filter((office) => office.memberId === row.member.id), local.filter((office) => office.memberId === row.member.id), today));

  if (filters.sort === "recent") items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  else if (filters.sort === "birthday") {
    items.sort((a, b) => {
      if (!a.birthDate && !b.birthDate) return a.fullName.localeCompare(b.fullName, "pt-BR");
      if (!a.birthDate) return 1;
      if (!b.birthDate) return -1;
      return a.birthDate.slice(5).localeCompare(b.birthDate.slice(5)) || a.fullName.localeCompare(b.fullName, "pt-BR");
    });
  } else items.sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  return items;
}

function mapListItem(
  row: MemberRow,
  kinshipName: string | null,
  ecc: { title: string; consecrationDate: string; notes: string | null }[],
  local: { title: string; startDate: string; endDate: string | null; notes: string | null }[],
  today: string,
): MemberListItem {
  return {
    id: row.id,
    fullName: row.fullName,
    photoUrl: memberPhotoUrl(row.id, row.photo, row.updatedAt),
    status: row.status,
    phone: row.phone,
    email: row.email,
    city: row.city,
    neighborhood: row.neighborhood,
    birthDate: row.birthDate,
    kinshipType: row.kinshipType,
    kinshipMemberId: row.kinshipMemberId,
    kinshipMemberName: kinshipName,
    kinshipNotes: row.kinshipNotes,
    ecclesiastical: ecc.map((office) => ({ title: office.title, consecrationDate: office.consecrationDate, notes: office.notes })),
    local: local.map((office) => ({
      title: office.title,
      startDate: office.startDate,
      endDate: office.endDate,
      notes: office.notes,
      active: !office.endDate || office.endDate >= today,
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getMember(id: number): Promise<MemberDetail | null> {
  const [row] = await db.select().from(members).where(eq(members.id, id));
  if (!row) return null;
  const today = saoPauloToday();
  let kinshipName: string | null = null;
  if (row.kinshipMemberId) {
    const [kin] = await db.select({ fullName: members.fullName }).from(members).where(eq(members.id, row.kinshipMemberId));
    kinshipName = kin?.fullName ?? null;
  }
  const { ecc, local } = await loadOffices([id]);
  const history = await db.select().from(memberHistory).where(eq(memberHistory.memberId, id)).orderBy(desc(memberHistory.changedAt), desc(memberHistory.id));
  return {
    ...mapListItem(row, kinshipName, ecc, local, today),
    gender: row.gender,
    maritalStatus: row.maritalStatus,
    cpf: formatCpf(row.cpf) || null,
    address: row.address,
    baptismDate: row.baptismDate,
    conversionDate: row.conversionDate,
    memberSince: row.memberSince,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    history: history.map((entry) => ({
      id: entry.id,
      changeType: entry.changeType,
      summary: entry.summary,
      previousData: entry.previousData,
      newData: entry.newData,
      actor: entry.actor,
      changedAt: entry.changedAt.toISOString(),
    })),
  };
}

export async function listMemberOptions(): Promise<MemberOption[]> {
  const rows = await db.select().from(members);
  const ids = rows.map((row) => row.id);
  const { ecc, local } = await loadOffices(ids);
  return rows
    .map((row) => {
      const titles = ecc.filter((office) => office.memberId === row.id).map((office) => office.title);
      return {
        id: row.id,
        fullName: row.fullName,
        suggestedName: suggestedRoleName(row.fullName, titles),
        photoUrl: memberPhotoUrl(row.id, row.photo, row.updatedAt),
        status: row.status,
        ecclesiastical: titles,
        local: local.filter((office) => office.memberId === row.id).map((office) => office.title),
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
}

export async function listKnownTitles() {
  const [ecc, local] = await Promise.all([
    db.selectDistinct({ title: ecclesiasticalOffices.title }).from(ecclesiasticalOffices),
    db.selectDistinct({ title: localOffices.title }).from(localOffices),
  ]);
  return {
    ecclesiasticalTitles: mergeTitles(ECCLESIASTICAL_TITLES, ecc.map((row) => row.title)),
    localTitles: mergeTitles(LOCAL_TITLES, local.map((row) => row.title)),
  };
}

async function assertKinship(id: number | null, selfId?: number) {
  if (!id) return true;
  if (selfId && id === selfId) return false;
  const [row] = await db.select({ id: members.id }).from(members).where(eq(members.id, id));
  return Boolean(row);
}

async function assertUniqueCpf(cpf: string | null, selfId?: number) {
  if (!cpf) return true;
  const rows = await db.select({ id: members.id }).from(members).where(eq(members.cpf, cpf));
  return rows.every((row) => row.id === selfId);
}

export async function createMember(body: unknown, actor: string) {
  const parsed = validateMember(body);
  if (!parsed.ok) return { error: parsed.error, fields: parsed.fields, status: 400 as const };
  const value = parsed.value;
  if (!(await assertKinship(value.kinshipMemberId))) {
    return { error: "O membro indicado no parentesco não foi encontrado.", fields: { kinshipMemberId: "Selecione um membro válido." }, status: 400 as const };
  }
  if (!(await assertUniqueCpf(value.cpf))) {
    return { error: "Já existe um cadastro com este CPF.", fields: { cpf: "Este CPF já está cadastrado." }, status: 409 as const };
  }
  const now = new Date();
  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(members)
      .values({
        fullName: value.fullName,
        photo: value.photoAction === "replace" ? value.photo ?? null : null,
        birthDate: value.birthDate,
        gender: value.gender,
        maritalStatus: value.maritalStatus,
        phone: value.phone,
        email: value.email,
        cpf: value.cpf,
        address: value.address,
        neighborhood: value.neighborhood,
        city: value.city,
        baptismDate: value.baptismDate,
        conversionDate: value.conversionDate,
        memberSince: value.memberSince,
        status: value.status,
        kinshipType: value.kinshipType,
        kinshipMemberId: value.kinshipMemberId,
        kinshipNotes: value.kinshipNotes,
        notes: value.notes,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: members.id });
    if (!created) throw new Error("Falha ao criar membro.");
    if (value.ecclesiasticalOffices.length) {
      await tx.insert(ecclesiasticalOffices).values(value.ecclesiasticalOffices.map((office) => ({ ...office, memberId: created.id })));
    }
    if (value.localOffices.length) {
      await tx.insert(localOffices).values(value.localOffices.map((office) => ({
        memberId: created.id,
        title: office.title,
        startDate: office.startDate,
        endDate: office.endDate,
        notes: office.notes,
      })));
    }
    let kinshipName: string | null = null;
    if (value.kinshipMemberId) {
      const [kin] = await tx.select({ fullName: members.fullName }).from(members).where(eq(members.id, value.kinshipMemberId));
      kinshipName = kin?.fullName ?? null;
    }
    const history = buildMemberHistory({
      memberId: created.id,
      actor,
      now,
      prev: null,
      next: value,
      prevPhoto: null,
      nextPhoto: value.photoAction === "replace" ? value.photo ?? null : null,
      prevEcc: [],
      nextEcc: value.ecclesiasticalOffices,
      prevLocal: [],
      nextLocal: value.localOffices,
      nextKinshipName: kinshipName,
    });
    if (history.length) await tx.insert(memberHistory).values(history);
    return created.id;
  });
  return { id };
}

export async function updateMember(id: number, body: unknown, actor: string) {
  const parsed = validateMember(body, { selfId: id });
  if (!parsed.ok) return { error: parsed.error, fields: parsed.fields, status: 400 as const };
  const value = parsed.value;
  if (!(await assertKinship(value.kinshipMemberId, id))) {
    return { error: "O membro indicado no parentesco não foi encontrado.", fields: { kinshipMemberId: "Selecione um membro válido." }, status: 400 as const };
  }
  if (!(await assertUniqueCpf(value.cpf, id))) {
    return { error: "Já existe um cadastro com este CPF.", fields: { cpf: "Este CPF já está cadastrado." }, status: 409 as const };
  }

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(members).where(eq(members.id, id));
    if (!existing) return { missing: true as const };
    if (value.baseUpdatedAt && existing.updatedAt.toISOString() !== value.baseUpdatedAt) {
      return { conflict: true as const };
    }
    const prevEcc = await tx.select().from(ecclesiasticalOffices).where(eq(ecclesiasticalOffices.memberId, id));
    const prevLocal = await tx.select().from(localOffices).where(eq(localOffices.memberId, id));
    const nextPhoto = value.photoAction === "replace" ? value.photo ?? null : value.photoAction === "remove" ? null : existing.photo;
    let prevKinshipName: string | null = null;
    let nextKinshipName: string | null = null;
    if (existing.kinshipMemberId) {
      const [kin] = await tx.select({ fullName: members.fullName }).from(members).where(eq(members.id, existing.kinshipMemberId));
      prevKinshipName = kin?.fullName ?? null;
    }
    if (value.kinshipMemberId) {
      const [kin] = await tx.select({ fullName: members.fullName }).from(members).where(eq(members.id, value.kinshipMemberId));
      nextKinshipName = kin?.fullName ?? null;
    }
    const now = new Date();
    const history = buildMemberHistory({
      memberId: id,
      actor,
      now,
      prev: scalarFrom(existing),
      next: value,
      prevPhoto: existing.photo,
      nextPhoto,
      prevEcc: prevEcc.map((office) => ({ title: office.title, consecrationDate: office.consecrationDate, notes: office.notes })),
      nextEcc: value.ecclesiasticalOffices,
      prevLocal: prevLocal.map((office) => ({ title: office.title, startDate: office.startDate, endDate: office.endDate, notes: office.notes })),
      nextLocal: value.localOffices,
      prevKinshipName,
      nextKinshipName,
    });
    if (!history.length && nextPhoto === existing.photo) return { unchanged: true as const, id };
    await tx
      .update(members)
      .set({
        fullName: value.fullName,
        photo: nextPhoto,
        birthDate: value.birthDate,
        gender: value.gender,
        maritalStatus: value.maritalStatus,
        phone: value.phone,
        email: value.email,
        cpf: value.cpf,
        address: value.address,
        neighborhood: value.neighborhood,
        city: value.city,
        baptismDate: value.baptismDate,
        conversionDate: value.conversionDate,
        memberSince: value.memberSince,
        status: value.status,
        kinshipType: value.kinshipType,
        kinshipMemberId: value.kinshipMemberId,
        kinshipNotes: value.kinshipNotes,
        notes: value.notes,
        updatedAt: now,
      })
      .where(eq(members.id, id));
    await tx.delete(ecclesiasticalOffices).where(eq(ecclesiasticalOffices.memberId, id));
    await tx.delete(localOffices).where(eq(localOffices.memberId, id));
    if (value.ecclesiasticalOffices.length) {
      await tx.insert(ecclesiasticalOffices).values(value.ecclesiasticalOffices.map((office) => ({ ...office, memberId: id })));
    }
    if (value.localOffices.length) {
      await tx.insert(localOffices).values(value.localOffices.map((office) => ({
        memberId: id,
        title: office.title,
        startDate: office.startDate,
        endDate: office.endDate,
        notes: office.notes,
      })));
    }
    if (history.length) await tx.insert(memberHistory).values(history);
    return { id };
  });
  if ("missing" in result) return { error: "Membro não encontrado.", status: 404 as const };
  if ("conflict" in result) return { error: "Este cadastro foi atualizado em outra tela. Recarregue antes de salvar.", status: 409 as const };
  return result;
}

export async function deleteMember(id: number) {
  const [existing] = await db.select({ id: members.id, fullName: members.fullName }).from(members).where(eq(members.id, id));
  if (!existing) return { error: "Membro não encontrado.", status: 404 as const };
  await db.delete(members).where(eq(members.id, id));
  return { ok: true, fullName: existing.fullName };
}

export async function getMemberPhoto(id: number) {
  const [row] = await db.select({ photo: members.photo }).from(members).where(eq(members.id, id));
  return row?.photo ?? null;
}
