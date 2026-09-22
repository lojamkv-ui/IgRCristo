import { db } from "@/db";
import { settings as settingsTable, type Settings } from "@/db/schema";

/** Dados institucionais padrão (Igreja Renascendo em Cristo — Sede). */
export const DEFAULT_CHURCH = {
  churchName: "Igreja Renascendo em Cristo — Sede",
  email: "sede.renascendoemcristo@gmail.com",
  cnpj: "58.563.268/0001-11",
  address: "R Nicanor Albernaz, QD. 02 LT. 01 - Setor Cristina",
  city: "Trindade - GO",
  cep: "75.383-579",
  president: "Pr. Presidente Wellington Felicio Vieira",
  phone: "(62) 99154-2563",
  website: "",
  instagram: "",
  logo: null as string | null,
  flyerPalette: "royal",
};

/** Endereço em linha única, pronto para rodapé de flyer e documentos. */
export function fullAddress(s: Pick<Settings, "address" | "city" | "cep">): string {
  const parts = [s.address, s.city, s.cep ? `CEP: ${s.cep}` : ""].filter(Boolean);
  return parts.join(" - ");
}

/** Retorna (e cria, se necessário) a linha única de configurações. */
export async function getSettings(): Promise<Settings> {
  const existing = await db.select().from(settingsTable).limit(1);
  if (existing.length > 0) return existing[0];

  const inserted = await db
    .insert(settingsTable)
    .values({
      churchName: DEFAULT_CHURCH.churchName,
      email: DEFAULT_CHURCH.email,
      cnpj: DEFAULT_CHURCH.cnpj,
      address: DEFAULT_CHURCH.address,
      city: DEFAULT_CHURCH.city,
      cep: DEFAULT_CHURCH.cep,
      president: DEFAULT_CHURCH.president,
      phone: DEFAULT_CHURCH.phone,
      website: DEFAULT_CHURCH.website,
      instagram: DEFAULT_CHURCH.instagram,
      logo: DEFAULT_CHURCH.logo,
      flyerPalette: DEFAULT_CHURCH.flyerPalette,
    })
    .returning();

  return inserted[0];
}
