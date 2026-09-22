import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, services, type Service } from "@/db/schema";
import { formatDateBR, formatTimeBR } from "@/lib/format";
import { SERVICE_LABEL, type ServicePayload } from "@/lib/types";

type HistoryChange = { field: string; key: string; before: string | null; after: string | null };

function serviceFields(payload: ServicePayload) {
  return {
    title: payload.title.trim(),
    kind: payload.kind ?? null,
    serviceDate: payload.serviceDate,
    serviceTime: payload.serviceTime,
    leader: payload.leader.trim(),
    preacherName: payload.preacherName ?? null,
    preacherPhoto: payload.preacherPhoto ?? null,
    preacherMemberId: payload.preacherMemberId ?? null,
    singers: payload.singers ?? [],
    intercessors: payload.intercessors ?? [],
    theme: payload.theme ?? null,
    scripture: payload.scripture ?? null,
    notes: payload.notes ?? null,
    status: payload.status ?? "agendado",
  };
}

const COMPARED_KEYS = [
  "title",
  "kind",
  "serviceDate",
  "serviceTime",
  "leader",
  "preacherName",
  "theme",
  "scripture",
  "notes",
  "status",
] as const;

function formatValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (key === "serviceDate") return formatDateBR(String(value));
  if (key === "serviceTime") return formatTimeBR(String(value));
  return String(value);
}

function diffService(previous: Service, next: ReturnType<typeof serviceFields>): HistoryChange[] {
  const changes: HistoryChange[] = [];

  for (const key of COMPARED_KEYS) {
    const before = formatValue(key, previous[key]);
    const after = formatValue(key, next[key]);
    if (before !== after) {
      changes.push({ key, field: SERVICE_LABEL[key] ?? key, before, after });
    }
  }

  const beforeSingers = (previous.singers ?? []).map((s) => s.name).join(", ");
  const afterSingers = next.singers.map((s) => s.name).join(", ");
  if (beforeSingers !== afterSingers) {
    changes.push({
      key: "singers",
      field: SERVICE_LABEL.singers,
      before: beforeSingers || null,
      after: afterSingers || null,
    });
  }

  const beforePhotos = (previous.singers ?? []).filter((s) => s.photo).length;
  const afterPhotos = next.singers.filter((s) => s.photo).length;
  if (beforePhotos !== afterPhotos) {
    changes.push({
      key: "singerPhotos",
      field: "Fotos dos cantores",
      before: String(beforePhotos),
      after: String(afterPhotos),
    });
  }

  const beforeIntercessors = (previous.intercessors ?? []).join(", ");
  const afterIntercessors = next.intercessors.join(", ");
  if (beforeIntercessors !== afterIntercessors) {
    changes.push({
      key: "intercessors",
      field: SERVICE_LABEL.intercessors,
      before: beforeIntercessors || null,
      after: afterIntercessors || null,
    });
  }

  const beforePhoto = previous.preacherPhoto ? "com foto" : "sem foto";
  const afterPhoto = next.preacherPhoto ? "com foto" : "sem foto";
  if (beforePhoto !== afterPhoto) {
    changes.push({
      key: "preacherPhoto",
      field: "Foto do pregador",
      before: beforePhoto,
      after: afterPhoto,
    });
  }

  return changes;
}

export async function createService(payload: ServicePayload): Promise<Service> {
  const [created] = await db
    .insert(services)
    .values({ ...serviceFields(payload), createdAt: new Date(), updatedAt: new Date() })
    .returning();

  await db.insert(activityLog).values({
    entity: "service",
    entityId: created.id,
    action: "create",
    description: `Culto "${created.title}" agendado para ${formatDateBR(created.serviceDate)} às ${formatTimeBR(created.serviceTime)}.`,
  });

  return created;
}

export async function updateService(
  id: number,
  payload: ServicePayload,
): Promise<{ service: Service; changes: HistoryChange[] } | null> {
  const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
  const previous = rows[0] as Service | undefined;
  if (!previous) return null;

  const fields = serviceFields(payload);
  const changes = diffService(previous, fields);

  const [updated] = await db
    .update(services)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(services.id, id))
    .returning();

  if (changes.length > 0) {
    await db.insert(activityLog).values({
      entity: "service",
      entityId: id,
      action: "update",
      description: `Culto "${updated.title}" atualizado: ${changes
        .map((change) => change.field)
        .join(", ")}.`,
    });
  }

  return { service: updated, changes };
}

export async function deleteService(id: number): Promise<{ deleted: boolean; title?: string }> {
  const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
  const service = rows[0] as Service | undefined;
  if (!service) return { deleted: false };

  await db.insert(activityLog).values({
    entity: "service",
    entityId: id,
    action: "delete",
    description: `Culto "${service.title}" (${formatDateBR(service.serviceDate)}) excluído da agenda.`,
  });

  await db.delete(services).where(eq(services.id, id));
  return { deleted: true, title: service.title };
}
