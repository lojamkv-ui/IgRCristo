import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activityLog,
  memberHistory,
  memberRoles,
  members,
  services,
  settings as settingsTable,
  type HistoryChange,
  type MemberInsert,
  type MemberRoleInsert,
  type HistoryEntry,
  type ServiceInsert,
  type Singer,
} from "@/db/schema";
import { getSettings } from "@/lib/church";

export const dynamic = "force-dynamic";

const VERSION = 1;

/* ------------------------------- helpers ------------------------------- */

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function arrayOf<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toMemberRow(raw: Record<string, unknown>): MemberInsert | null {
  const id = num(raw.id);
  const name = textOrNull(raw.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    photo: textOrNull(raw.photo),
    birthDate: textOrNull(raw.birthDate),
    gender: textOrNull(raw.gender),
    email: textOrNull(raw.email),
    phone: textOrNull(raw.phone),
    address: textOrNull(raw.address),
    city: textOrNull(raw.city),
    kinship: textOrNull(raw.kinship),
    familyName: textOrNull(raw.familyName),
    baptismDate: textOrNull(raw.baptismDate),
    memberSince: textOrNull(raw.memberSince),
    status: textOrNull(raw.status) ?? "ativo",
    notes: textOrNull(raw.notes),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

function toRoleRow(raw: Record<string, unknown>): MemberRoleInsert | null {
  const id = num(raw.id);
  const memberId = num(raw.memberId);
  const title = textOrNull(raw.title);
  const kind = raw.kind === "eclesiastico" ? "eclesiastico" : "local";
  if (!id || !memberId || !title) return null;
  return {
    id,
    memberId,
    kind,
    title,
    consecrationDate: kind === "eclesiastico" ? textOrNull(raw.consecrationDate) : null,
    startDate: kind === "local" ? textOrNull(raw.startDate) : null,
    endDate: kind === "local" ? textOrNull(raw.endDate) : null,
    active: raw.active === undefined ? true : Boolean(raw.active),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

function toHistoryRow(raw: Record<string, unknown>): typeof memberHistory.$inferInsert | null {
  const id = num(raw.id);
  const memberId = num(raw.memberId);
  const type = textOrNull(raw.type);
  const description = textOrNull(raw.description);
  if (!id || !memberId || !type || !description) return null;
  const changes = arrayOf<HistoryChange>(raw.changes).filter(
    (change) => change && typeof change === "object" && "field" in change,
  );
  return { id, memberId, type, description, changes, createdAt: toDate(raw.createdAt) };
}

function toServiceRow(raw: Record<string, unknown>): ServiceInsert | null {
  const id = num(raw.id);
  const serviceDate = textOrNull(raw.serviceDate);
  const leader = textOrNull(raw.leader);
  if (!id || !serviceDate || !leader) return null;

  const singers = arrayOf<Singer>(raw.singers)
    .filter((singer) => singer && typeof singer === "object")
    .map((singer) => ({
      name: String(singer.name ?? "").slice(0, 140),
      photo: typeof singer.photo === "string" ? singer.photo : null,
      memberId: num(singer.memberId) ?? null,
    }))
    .filter((singer) => singer.name.length > 0);

  const intercessors = arrayOf<unknown>(raw.intercessors)
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 1);

  return {
    id,
    title: textOrNull(raw.title) ?? "Culto",
    kind: textOrNull(raw.kind),
    serviceDate,
    serviceTime: /^\d{2}:\d{2}/.test(String(raw.serviceTime ?? ""))
      ? String(raw.serviceTime).slice(0, 5)
      : "19:00",
    leader,
    preacherName: textOrNull(raw.preacherName),
    preacherPhoto: textOrNull(raw.preacherPhoto),
    preacherMemberId: num(raw.preacherMemberId) ?? null,
    singers,
    intercessors,
    theme: textOrNull(raw.theme),
    scripture: textOrNull(raw.scripture),
    notes: textOrNull(raw.notes),
    status: textOrNull(raw.status) ?? "agendado",
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}

async function resetSequences() {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('members','id'), coalesce((select max(id) from members), 1))`,
  );
  await db.execute(
    sql`select setval(pg_get_serial_sequence('member_roles','id'), coalesce((select max(id) from member_roles), 1))`,
  );
  await db.execute(
    sql`select setval(pg_get_serial_sequence('member_history','id'), coalesce((select max(id) from member_history), 1))`,
  );
  await db.execute(
    sql`select setval(pg_get_serial_sequence('services','id'), coalesce((select max(id) from services), 1))`,
  );
}

/* -------------------------------- rotas -------------------------------- */

/** Exporta tudo (membros + cargos + histórico + agenda + igreja) em JSON. */
export async function GET() {
  try {
    const [church, allMembers, allRoles, history, allServices, logs] = await Promise.all([
      getSettings(),
      db.select().from(members),
      db.select().from(memberRoles),
      db.select().from(memberHistory),
      db.select().from(services),
      db.select().from(activityLog).limit(500),
    ]);

    const membersWithRelations = allMembers.map((member) => ({
      ...member,
      roles: allRoles.filter((role) => role.memberId === member.id),
      history: history.filter((entry) => entry.memberId === member.id),
    }));

    return Response.json({
      ok: true,
      data: {
        version: VERSION,
        exportedAt: new Date().toISOString(),
        app: "Gestão de Membros e Agenda — Igreja Renascendo em Cristo",
        church,
        members: membersWithRelations,
        services: allServices,
        activityLog: logs,
      },
      counts: {
        members: allMembers.length,
        roles: allRoles.length,
        history: history.length,
        services: allServices.length,
      },
    });
  } catch (error) {
    console.error("[api/backup GET]", error);
    return Response.json({ ok: false, error: "Falha ao exportar o backup." }, { status: 500 });
  }
}

/** Importa um backup. mode = "replace" (limpa tudo) ou "merge" (apenas insere novos). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      mode?: string;
      payload?: Record<string, unknown>;
    } | null;

    const mode = body?.mode === "merge" ? "merge" : "replace";
    const payload = body?.payload;

    if (!payload || typeof payload !== "object" || !Array.isArray(payload.members)) {
      return Response.json(
        { ok: false, error: "Estrutura de backup inválida." },
        { status: 400 },
      );
    }

    const rawMembers = arrayOf<Record<string, unknown>>(payload.members);
    const rawServices = arrayOf<Record<string, unknown>>(payload.services);

    const memberRows = rawMembers.map(toMemberRow).filter((row): row is MemberInsert => row !== null);
    const roleRows = rawMembers
      .flatMap((member) => arrayOf<Record<string, unknown>>(member.roles).map(toRoleRow))
      .filter((row): row is MemberRoleInsert => row !== null);
    const historyRows = rawMembers
      .flatMap((member) => arrayOf<Record<string, unknown>>(member.history).map(toHistoryRow))
      .filter((row): row is HistoryEntry => row !== null);
    const serviceRows = rawServices
      .map(toServiceRow)
      .filter((row): row is ServiceInsert => row !== null);

    if (memberRows.length === 0 && serviceRows.length === 0) {
      return Response.json(
        { ok: false, error: "Nenhum registro válido encontrado no arquivo." },
        { status: 400 },
      );
    }

    if (mode === "replace") {
      await db.delete(services);
      await db.delete(memberHistory);
      await db.delete(memberRoles);
      await db.delete(members);
    }

    if (memberRows.length > 0) await db.insert(members).values(memberRows).onConflictDoNothing();
    if (roleRows.length > 0) await db.insert(memberRoles).values(roleRows).onConflictDoNothing();
    if (historyRows.length > 0) {
      await db.insert(memberHistory).values(historyRows).onConflictDoNothing();
    }
    if (serviceRows.length > 0) await db.insert(services).values(serviceRows).onConflictDoNothing();

    if (payload.church && typeof payload.church === "object") {
      const churchRaw = payload.church as Record<string, unknown>;
      const current = await getSettings();
      await db
        .update(settingsTable)
        .set({
          churchName: textOrNull(churchRaw.churchName) ?? current.churchName,
          email: textOrNull(churchRaw.email),
          cnpj: textOrNull(churchRaw.cnpj),
          address: textOrNull(churchRaw.address),
          city: textOrNull(churchRaw.city),
          cep: textOrNull(churchRaw.cep),
          president: textOrNull(churchRaw.president),
          phone: textOrNull(churchRaw.phone),
          website: textOrNull(churchRaw.website),
          instagram: textOrNull(churchRaw.instagram),
          updatedAt: new Date(),
        })
        .where(sql`${settingsTable.id} = ${current.id}`);
    }

    await resetSequences();

    await db.insert(activityLog).values({
      entity: "backup",
      entityId: null,
      action: mode,
      description: `Backup importado (${mode}): ${memberRows.length} membro(s), ${roleRows.length} cargo(s) e ${serviceRows.length} culto(s).`,
    });

    return Response.json({
      ok: true,
      data: {
        mode,
        imported: {
          members: memberRows.length,
          roles: roleRows.length,
          history: historyRows.length,
          services: serviceRows.length,
        },
      },
    });
  } catch (error) {
    console.error("[api/backup POST]", error);
    return Response.json({ ok: false, error: "Falha ao importar o backup." }, { status: 500 });
  }
}
