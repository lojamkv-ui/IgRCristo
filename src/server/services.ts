import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { members, serviceParticipants, services, type ParticipantRow, type ServiceRow } from "@/db/schema";
import type { ServiceItem, ServicePayload } from "@/lib/types";
import { validateService } from "@/lib/validators";
import { memberPhotoUrl, servicePhotoUrl } from "./http";

async function memberPhotoMap(ids: number[]) {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  if (!unique.length) return new Map<number, { photo: string | null; updatedAt: Date }>();
  const rows = await db.select({ id: members.id, photo: members.photo, updatedAt: members.updatedAt }).from(members).where(inArray(members.id, unique));
  return new Map(rows.map((row) => [row.id, { photo: row.photo, updatedAt: row.updatedAt }]));
}

function resolveMemberPhoto(map: Map<number, { photo: string | null; updatedAt: Date }>, id: number | null) {
  if (!id) return null;
  const row = map.get(id);
  if (!row) return null;
  return memberPhotoUrl(id, row.photo, row.updatedAt);
}

export function mapService(
  row: ServiceRow,
  participants: ParticipantRow[],
  photos: Map<number, { photo: string | null; updatedAt: Date }>,
): ServiceItem {
  const singers = participants.filter((person) => person.role === "singer");
  const intercessors = participants.filter((person) => person.role === "intercessor");
  const preacherPhotoUrl = !row.showPreacherPhoto
    ? null
    : row.preacherPhoto
      ? servicePhotoUrl(row.id, "preacher", row.preacherPhoto, row.updatedAt)
      : resolveMemberPhoto(photos, row.preacherId);
  return {
    id: row.id,
    serviceDate: row.serviceDate,
    serviceTime: row.serviceTime,
    title: row.title,
    theme: row.theme,
    leaderId: row.leaderId,
    leaderName: row.leaderName,
    leaderPhotoUrl: resolveMemberPhoto(photos, row.leaderId),
    preacherId: row.preacherId,
    preacherName: row.preacherName,
    preacherPhotoUrl,
    showPreacherPhoto: row.showPreacherPhoto,
    notes: row.notes,
    singers: singers.map((person) => ({
      id: person.id,
      memberId: person.memberId,
      name: person.name,
      photoUrl: !person.showPhoto
        ? null
        : person.photo
          ? servicePhotoUrl(row.id, person.id, person.photo, row.updatedAt)
          : resolveMemberPhoto(photos, person.memberId),
    })),
    intercessors: intercessors.map((person) => ({
      id: person.id,
      memberId: person.memberId,
      name: person.name,
      photoUrl: resolveMemberPhoto(photos, person.memberId),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function hydrate(rows: ServiceRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const participants = await db
    .select()
    .from(serviceParticipants)
    .where(inArray(serviceParticipants.serviceId, ids))
    .orderBy(asc(serviceParticipants.sortOrder), asc(serviceParticipants.id));
  const memberIds = [
    ...rows.flatMap((row) => [row.leaderId, row.preacherId]),
    ...participants.map((person) => person.memberId),
  ].filter((id): id is number => Boolean(id));
  const photos = await memberPhotoMap(memberIds);
  return rows.map((row) => mapService(row, participants.filter((person) => person.serviceId === row.id), photos));
}

export async function listServices() {
  const rows = await db.select().from(services).orderBy(desc(services.serviceDate), desc(services.serviceTime), desc(services.id));
  return hydrate(rows);
}

export async function getService(id: number) {
  const [row] = await db.select().from(services).where(eq(services.id, id));
  if (!row) return null;
  const [item] = await hydrate([row]);
  return item ?? null;
}

async function validMemberIds(ids: number[]) {
  const unique = [...new Set(ids.filter((id) => id > 0))];
  if (!unique.length) return new Set<number>();
  const rows = await db.select({ id: members.id }).from(members).where(inArray(members.id, unique));
  return new Set(rows.map((row) => row.id));
}

function keepId(id: number | null, known: Set<number>) {
  return id && known.has(id) ? id : null;
}

export async function saveService(body: unknown, id?: number) {
  const parsed = validateService(body);
  if (!parsed.ok) return { error: parsed.error, fields: parsed.fields, status: 400 as const };
  const value: ServicePayload = parsed.value;
  const known = await validMemberIds([
    value.leaderId ?? 0,
    value.preacherId ?? 0,
    ...value.singers.map((person) => person.memberId ?? 0),
    ...value.intercessors.map((person) => person.memberId ?? 0),
  ]);

  const savedId = await db.transaction(async (tx) => {
    const now = new Date();
    let preacherPhoto: string | null = null;
    let existingParticipants: ParticipantRow[] = [];
    if (id) {
      const [existing] = await tx.select().from(services).where(eq(services.id, id));
      if (!existing) return null;
      if (value.baseUpdatedAt && existing.updatedAt.toISOString() !== value.baseUpdatedAt) return "conflict" as const;
      existingParticipants = await tx.select().from(serviceParticipants).where(eq(serviceParticipants.serviceId, id));
      preacherPhoto = value.preacherPhotoAction === "replace"
        ? value.preacherPhoto ?? null
        : value.preacherPhotoAction === "keep"
          ? existing.preacherPhoto
          : null;
      await tx
        .update(services)
        .set({
          serviceDate: value.serviceDate,
          serviceTime: value.serviceTime,
          title: value.title,
          theme: value.theme,
          leaderId: keepId(value.leaderId, known),
          leaderName: value.leaderName,
          preacherId: keepId(value.preacherId, known),
          preacherName: value.preacherName,
          preacherPhoto,
          showPreacherPhoto: value.showPreacherPhoto,
          notes: value.notes,
          updatedAt: now,
        })
        .where(eq(services.id, id));
      await tx.delete(serviceParticipants).where(eq(serviceParticipants.serviceId, id));
    } else {
      preacherPhoto = value.preacherPhotoAction === "replace" ? value.preacherPhoto ?? null : null;
      const [created] = await tx
        .insert(services)
        .values({
          serviceDate: value.serviceDate,
          serviceTime: value.serviceTime,
          title: value.title,
          theme: value.theme,
          leaderId: keepId(value.leaderId, known),
          leaderName: value.leaderName,
          preacherId: keepId(value.preacherId, known),
          preacherName: value.preacherName,
          preacherPhoto,
          showPreacherPhoto: value.showPreacherPhoto,
          notes: value.notes,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: services.id });
      if (!created) throw new Error("Falha ao criar culto.");
      id = created.id;
    }

    const participantRows = [
      ...value.singers.map((person, index) => {
        const previous = person.id ? existingParticipants.find((item) => item.id === person.id) : undefined;
        const photo = person.photoAction === "replace" ? person.photo ?? null : person.photoAction === "keep" ? previous?.photo ?? null : null;
        return {
          serviceId: id as number,
          role: "singer",
          memberId: keepId(person.memberId, known),
          name: person.name,
          photo,
          showPhoto: person.showPhoto,
          sortOrder: index,
        };
      }),
      ...value.intercessors.map((person, index) => ({
        serviceId: id as number,
        role: "intercessor",
        memberId: keepId(person.memberId, known),
        name: person.name,
        photo: null,
        showPhoto: false,
        sortOrder: index,
      })),
    ];
    if (participantRows.length) await tx.insert(serviceParticipants).values(participantRows);
    return id as number;
  });

  if (savedId === "conflict") return { error: "Este culto foi atualizado em outra tela. Recarregue antes de salvar.", status: 409 as const };
  if (!savedId) return { error: "Culto não encontrado.", status: 404 as const };
  return { id: savedId };
}

export async function deleteService(id: number) {
  const [existing] = await db.select({ id: services.id }).from(services).where(eq(services.id, id));
  if (!existing) return { error: "Culto não encontrado.", status: 404 as const };
  await db.delete(services).where(eq(services.id, id));
  return { ok: true };
}

export async function getServicePhoto(serviceId: number, slot: "preacher" | number) {
  if (slot === "preacher") {
    const [service] = await db.select({ photo: services.preacherPhoto }).from(services).where(eq(services.id, serviceId));
    return service?.photo ?? null;
  }
  const [participant] = await db
    .select({ photo: serviceParticipants.photo })
    .from(serviceParticipants)
    .where(eq(serviceParticipants.id, slot));
  return participant?.photo ?? null;
}
