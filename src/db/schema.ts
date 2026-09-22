import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * Tipos compartilhados usados nas colunas JSONB
 * ------------------------------------------------------------------ */

/** Uma alteração individual registrada no histórico do membro. */
export type HistoryChange = {
  /** Rótulo legível do campo, ex.: "Telefone" */
  field: string;
  /** Chave técnica do campo, ex.: "phone" */
  key: string;
  before: string | null;
  after: string | null;
};

/** Cantor vinculado a um culto (pode ter foto). */
export type Singer = {
  name: string;
  photo: string | null;
  memberId?: number | null;
};

/* ------------------------------------------------------------------ *
 * Membros
 * ------------------------------------------------------------------ */

export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Foto em data URL (base64) já redimensionada no cliente. */
    photo: text("photo"),
    birthDate: date("birth_date"),
    gender: text("gender"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    /** Parentesco (ex.: Filho(a), Cônjuge, Irmão(ã), Pai, Mãe). */
    kinship: text("kinship"),
    /** Família / responsável pelo vínculo de parentesco. */
    familyName: text("family_name"),
    baptismDate: date("baptism_date"),
    memberSince: date("member_since"),
    status: text("status").notNull().default("ativo"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("members_name_idx").on(table.name)],
);

/* ------------------------------------------------------------------ *
 * Cargos (eclesiásticos e locais) — um membro pode ter vários
 * ------------------------------------------------------------------ */

export const memberRoles = pgTable(
  "member_roles",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    /** "eclesiastico" | "local" */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    /** Exclusivo de cargo eclesiástico. */
    consecrationDate: date("consecration_date"),
    /** Exclusivos de cargo local. */
    startDate: date("start_date"),
    endDate: date("end_date"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("member_roles_member_idx").on(table.memberId)],
);

/* ------------------------------------------------------------------ *
 * Histórico de alterações do cadastro (auditoria completa)
 * ------------------------------------------------------------------ */

export const memberHistory = pgTable(
  "member_history",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    /** criado | atualizado | foto | cargo_adicionado | cargo_atualizado | cargo_removido | restaurado */
    type: text("type").notNull(),
    description: text("description").notNull(),
    changes: jsonb("changes").$type<HistoryChange[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("member_history_member_idx").on(table.memberId)],
);

/* ------------------------------------------------------------------ *
 * Agenda de cultos
 * ------------------------------------------------------------------ */

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull().default("Culto"),
    /** Santa Ceia, Doutrina, Vigília, Escola Bíblica... */
    kind: text("kind"),
    serviceDate: date("service_date").notNull(),
    serviceTime: time("service_time").notNull().default("19:00"),
    /** Dirigente do culto. */
    leader: text("leader").notNull(),
    /** Pregador. */
    preacherName: text("preacher_name"),
    preacherPhoto: text("preacher_photo"),
    preacherMemberId: integer("preacher_member_id"),
    singers: jsonb("singers").$type<Singer[]>().notNull().default([]),
    intercessors: jsonb("intercessors").$type<string[]>().notNull().default([]),
    theme: text("theme"),
    scripture: text("scripture"),
    notes: text("notes"),
    /** agendado | realizado | cancelado */
    status: text("status").notNull().default("agendado"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("services_date_idx").on(table.serviceDate)],
);

/* ------------------------------------------------------------------ *
 * Configurações / dados institucionais da igreja
 * ------------------------------------------------------------------ */

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  churchName: text("church_name").notNull(),
  email: text("email"),
  cnpj: text("cnpj"),
  address: text("address"),
  cep: text("cep"),
  city: text("city"),
  president: text("president"),
  phone: text("phone"),
  website: text("website"),
  instagram: text("instagram"),
  logo: text("logo"),
  /** Paleta base do flyer gerado. */
  flyerPalette: text("flyer_palette").notNull().default("royal"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ *
 * Log global de auditoria (cultos e configurações)
 * ------------------------------------------------------------------ */

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  action: text("action").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Member = typeof members.$inferSelect;
export type MemberInsert = typeof members.$inferInsert;
export type MemberRole = typeof memberRoles.$inferSelect;
export type MemberRoleInsert = typeof memberRoles.$inferInsert;
export type HistoryEntry = typeof memberHistory.$inferSelect;
export type Service = typeof services.$inferSelect;
export type ServiceInsert = typeof services.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type ActivityEntry = typeof activityLog.$inferSelect;

/* ------------------------------------------------------------------ *
 * Integração Canva (Connect API) — conexão OAuth e designs gerados
 * ------------------------------------------------------------------ */

export const canvaConnections = pgTable("canva_connections", {
  id: serial("id").primaryKey(),
  canvaUserId: text("canva_user_id"),
  displayName: text("display_name"),
  teamId: text("team_id"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  /** Instante de expiração do access token. */
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  scopes: text("scopes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const canvaDesigns = pgTable(
  "canva_designs",
  {
    id: serial("id").primaryKey(),
    serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
    designId: text("design_id").notNull(),
    title: text("title"),
    editUrl: text("edit_url"),
    viewUrl: text("view_url"),
    thumbnailUrl: text("thumbnail_url"),
    /** upload (arte enviada) | autofill (brand template preenchido) | template (modelo aberto) */
    source: text("source").notNull(),
    templateId: text("template_id"),
    templateTitle: text("template_title"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("canva_designs_service_idx").on(table.serviceId)],
);

export type CanvaConnection = typeof canvaConnections.$inferSelect;
export type CanvaDesign = typeof canvaDesigns.$inferSelect;
