import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    photo: text("photo"),
    birthDate: date("birth_date"),
    gender: text("gender"),
    maritalStatus: text("marital_status"),
    phone: text("phone"),
    email: text("email"),
    cpf: text("cpf"),
    address: text("address"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    baptismDate: date("baptism_date"),
    conversionDate: date("conversion_date"),
    memberSince: date("member_since"),
    status: text("status").notNull().default("ativo"),
    kinshipType: text("kinship_type"),
    kinshipMemberId: integer("kinship_member_id"),
    kinshipNotes: text("kinship_notes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.kinshipMemberId],
      foreignColumns: [table.id],
      name: "members_kinship_member_fk",
    }).onDelete("set null"),
    index("members_name_idx").on(table.fullName),
    index("members_status_idx").on(table.status),
    index("members_kinship_type_idx").on(table.kinshipType),
  ],
);

export const ecclesiasticalOffices = pgTable(
  "ecclesiastical_offices",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    consecrationDate: date("consecration_date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ecc_member_idx").on(table.memberId),
    index("ecc_title_idx").on(table.title),
  ],
);

export const localOffices = pgTable(
  "local_offices",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("local_member_idx").on(table.memberId),
    index("local_title_idx").on(table.title),
  ],
);

export const memberHistory = pgTable(
  "member_history",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    changeType: text("change_type").notNull(),
    summary: text("summary").notNull(),
    previousData: jsonb("previous_data"),
    newData: jsonb("new_data"),
    actor: text("actor").notNull().default("Secretaria"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("history_member_idx").on(table.memberId),
    index("history_type_idx").on(table.changeType),
    index("history_changed_idx").on(table.changedAt),
  ],
);

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    serviceDate: date("service_date").notNull(),
    serviceTime: text("service_time").notNull(),
    title: text("title").notNull(),
    theme: text("theme"),
    leaderId: integer("leader_id").references(() => members.id, { onDelete: "set null" }),
    leaderName: text("leader_name").notNull(),
    preacherId: integer("preacher_id").references(() => members.id, { onDelete: "set null" }),
    preacherName: text("preacher_name").notNull(),
    preacherPhoto: text("preacher_photo"),
    showPreacherPhoto: boolean("show_preacher_photo").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("services_date_idx").on(table.serviceDate)],
);

export const serviceParticipants = pgTable(
  "service_participants",
  {
    id: serial("id").primaryKey(),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    photo: text("photo"),
    showPhoto: boolean("show_photo").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("participants_service_idx").on(table.serviceId)],
);

export const churchProfile = pgTable("church_profile", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  pastor: text("pastor").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  cnpj: text("cnpj").notNull(),
  addressLine: text("address_line").notNull(),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  cep: text("cep").notNull(),
  addressFull: text("address_full").notNull(),
  demoSeeded: boolean("demo_seeded").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MemberRow = typeof members.$inferSelect;
export type EcclesiasticalOfficeRow = typeof ecclesiasticalOffices.$inferSelect;
export type LocalOfficeRow = typeof localOffices.$inferSelect;
export type HistoryRow = typeof memberHistory.$inferSelect;
export type ServiceRow = typeof services.$inferSelect;
export type ParticipantRow = typeof serviceParticipants.$inferSelect;
export type ChurchRow = typeof churchProfile.$inferSelect;
