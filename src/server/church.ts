import { eq } from "drizzle-orm";
import { db } from "@/db";
import { churchProfile } from "@/db/schema";
import { CHURCH_DEFAULTS } from "@/lib/constants";
import type { ChurchProfile } from "@/lib/types";
import { validateChurch } from "@/lib/validators";

export function toChurch(row: {
  name: string;
  shortName: string;
  pastor: string;
  email: string;
  phone: string;
  cnpj: string;
  addressLine: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  addressFull: string;
  updatedAt: Date;
}): ChurchProfile {
  return {
    name: row.name,
    shortName: row.shortName,
    pastor: row.pastor,
    email: row.email,
    phone: row.phone,
    cnpj: row.cnpj,
    addressLine: row.addressLine,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    cep: row.cep,
    addressFull: row.addressFull,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getChurch() {
  const [row] = await db.select().from(churchProfile).where(eq(churchProfile.id, 1));
  if (!row) return { ...CHURCH_DEFAULTS };
  return toChurch(row);
}

export async function updateChurch(body: unknown) {
  const parsed = validateChurch(body);
  if (!parsed.ok) return { error: parsed.error, fields: parsed.fields, status: 400 as const };
  const now = new Date();
  const [row] = await db
    .insert(churchProfile)
    .values({ id: 1, ...parsed.value, demoSeeded: false, updatedAt: now })
    .onConflictDoUpdate({
      target: churchProfile.id,
      set: { ...parsed.value, updatedAt: now },
    })
    .returning();
  if (!row) return { error: "Não foi possível salvar os dados da igreja.", status: 500 as const };
  return { church: toChurch(row) };
}
