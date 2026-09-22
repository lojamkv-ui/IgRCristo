import { and, asc, desc, eq, gte, inArray, lte, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  memberHistory,
  memberRoles,
  members,
  services,
  type HistoryEntry,
  type Member,
  type MemberRole,
  type Service,
} from "@/db/schema";
import { normalize } from "@/lib/format";
import type { MemberFilters, MemberWithRoles } from "@/lib/types";

const ACCENTS_FROM = "áàâãäéèêëíìîïóòôõöúùûüçñ";
const ACCENTS_TO = "aaaaaeeeeiiiiooooouuuucn";

/** Comparação sem acento e sem diferença de caixa, feita no próprio banco. */
function insensitive(column: SQL | AnyColumn, term: string): SQL {
  const pattern = `%${normalize(term).replace(/[%_\\]/g, "")}%`;
  return sql`translate(lower(${column}), ${ACCENTS_FROM}, ${ACCENTS_TO}) like ${pattern}`;
}

/* ------------------------------------------------------------------ *
 * Membros
 * ------------------------------------------------------------------ */

export async function listMembers(filters: MemberFilters = {}): Promise<MemberWithRoles[]> {
  const conditions: SQL[] = [];
  const { q, ecclesiastical, local, kinship, status, sort } = filters;

  if (q && q.trim().length > 0) {
    const term = q.trim();
    conditions.push(
      or(
        insensitive(members.name, term),
        insensitive(members.email, term),
        insensitive(members.phone, term),
        insensitive(members.familyName, term),
        insensitive(members.city, term),
        insensitive(members.notes, term),
        sql`exists (select 1 from ${memberRoles} as r where r.member_id = ${members.id} and ${insensitive(
          sql`r.title`,
          term,
        )})`,
      ) as SQL,
    );
  }

  if (kinship && kinship.trim().length > 0) {
    conditions.push(insensitive(members.kinship, kinship.trim()));
  }

  if (status && status !== "todos") {
    conditions.push(eq(members.status, status));
  }

  if (ecclesiastical && ecclesiastical.trim().length > 0) {
    conditions.push(
      sql`exists (select 1 from ${memberRoles} as r where r.member_id = ${members.id} and r.kind = 'eclesiastico' and ${insensitive(
        sql`r.title`,
        ecclesiastical.trim(),
      )})`,
    );
  }

  if (local && local.trim().length > 0) {
    conditions.push(
      sql`exists (select 1 from ${memberRoles} as r where r.member_id = ${members.id} and r.kind = 'local' and ${insensitive(
        sql`r.title`,
        local.trim(),
      )})`,
    );
  }

  const orderBy =
    sort === "recent"
      ? desc(members.updatedAt)
      : sort === "created"
        ? desc(members.createdAt)
        : asc(members.name);

  const rows = await db
    .select()
    .from(members)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy);

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const roles = await db
    .select()
    .from(memberRoles)
    .where(inArray(memberRoles.memberId, ids))
    .orderBy(memberRoles.kind, asc(memberRoles.title));

  const rolesByMember = new Map<number, MemberRole[]>();
  for (const role of roles) {
    const list = rolesByMember.get(role.memberId) ?? [];
    list.push(role);
    rolesByMember.set(role.memberId, list);
  }

  return rows.map((row) => ({ ...row, roles: rolesByMember.get(row.id) ?? [] }));
}

export async function getMember(id: number): Promise<MemberWithRoles | null> {
  const rows = await db.select().from(members).where(eq(members.id, id)).limit(1);
  const member = rows[0] as Member | undefined;
  if (!member) return null;
  const roles = await db
    .select()
    .from(memberRoles)
    .where(eq(memberRoles.memberId, id))
    .orderBy(memberRoles.kind, desc(memberRoles.consecrationDate), asc(memberRoles.title));
  return { ...member, roles };
}

/** Valores reais já cadastrados, usados para popular os filtros avançados. */
export async function getMemberFacets() {
  const [ecclesiastical, local, kinship] = await Promise.all([
    db
      .selectDistinct({ title: memberRoles.title })
      .from(memberRoles)
      .where(sql`${memberRoles.kind} = 'eclesiastico'`)
      .orderBy(sql`${memberRoles.title} asc`),
    db
      .selectDistinct({ title: memberRoles.title })
      .from(memberRoles)
      .where(sql`${memberRoles.kind} = 'local'`)
      .orderBy(sql`${memberRoles.title} asc`),
    db
      .selectDistinct({ kinship: members.kinship })
      .from(members)
      .where(sql`${members.kinship} is not null and ${members.kinship} <> ''`)
      .orderBy(sql`${members.kinship} asc`),
  ]);

  return {
    ecclesiastical: ecclesiastical.map((row) => row.title).filter(Boolean),
    local: local.map((row) => row.title).filter(Boolean),
    kinship: kinship.map((row) => row.kinship).filter((value): value is string => Boolean(value)),
  };
}

export async function getMemberHistory(id: number, type?: string): Promise<HistoryEntry[]> {
  const conditions: SQL[] = [eq(memberHistory.memberId, id)];
  if (type && type !== "todos") conditions.push(eq(memberHistory.type, type));
  return db
    .select()
    .from(memberHistory)
    .where(and(...conditions))
    .orderBy(desc(memberHistory.createdAt), desc(memberHistory.id));
}

/* ------------------------------------------------------------------ *
 * Cultos
 * ------------------------------------------------------------------ */

export type ServiceQuery = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  upcoming?: boolean;
  limit?: number;
};

export async function listServices(query: ServiceQuery = {}): Promise<Service[]> {
  const conditions: SQL[] = [];

  if (query.q && query.q.trim().length > 0) {
    const term = query.q.trim();
    conditions.push(
      or(
        insensitive(services.title, term),
        insensitive(services.leader, term),
        insensitive(services.preacherName, term),
        insensitive(services.kind, term),
        insensitive(services.theme, term),
      ) as SQL,
    );
  }

  if (query.status && query.status !== "todos") {
    conditions.push(eq(services.status, query.status));
  }
  if (query.from) conditions.push(gte(services.serviceDate, query.from));
  if (query.to) conditions.push(lte(services.serviceDate, query.to));
  if (query.upcoming) {
    conditions.push(sql`${services.serviceDate} >= current_date`);
  }

  const rows = await db
    .select()
    .from(services)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(services.serviceDate), asc(services.serviceTime));

  return typeof query.limit === "number" ? rows.slice(0, query.limit) : rows;
}

export async function getService(id: number): Promise<Service | null> {
  const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return (rows[0] as Service | undefined) ?? null;
}

/* ------------------------------------------------------------------ *
 * Estatísticas do painel
 * ------------------------------------------------------------------ */

export async function getStats() {
  const [memberRows, roleRows, serviceRows, historyRows] = await Promise.all([
    db.select().from(members),
    db.select().from(memberRoles),
    db.select().from(services),
    db.select({ total: sql<number>`count(*)::int` }).from(memberHistory),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = serviceRows
    .filter((s) => s.serviceDate >= today && s.status !== "cancelado")
    .sort((a, b) => (a.serviceDate + a.serviceTime).localeCompare(b.serviceDate + b.serviceTime));

  return {
    totalMembers: memberRows.length,
    activeMembers: memberRows.filter((m) => m.status === "ativo").length,
    visitors: memberRows.filter((m) => m.status === "visitante").length,
    totalRoles: roleRows.length,
    ecclesiasticalRoles: roleRows.filter((r) => r.kind === "eclesiastico").length,
    localRoles: roleRows.filter((r) => r.kind === "local").length,
    totalServices: serviceRows.length,
    upcomingServices: upcoming.length,
    nextService: upcoming[0] ?? null,
    historyEntries: historyRows[0]?.total ?? 0,
  };
}
