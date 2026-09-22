import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, settings as settingsTable } from "@/db/schema";
import { DEFAULT_CHURCH, getSettings } from "@/lib/church";
import { maskCEP, maskCNPJ, maskPhone, onlyDigits } from "@/lib/format";
import { nullable, str } from "@/lib/validation";
import { DEFAULT_THEME_ID, isThemeId } from "@/lib/flyer-themes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getSettings();
    return Response.json({ ok: true, data, defaults: DEFAULT_CHURCH });
  } catch (error) {
    console.error("[api/settings GET]", error);
    return Response.json({ ok: false, error: "Falha ao carregar as configurações." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return Response.json({ ok: false, errors: { _form: "Corpo inválido." } }, { status: 400 });
    }

    const errors: Record<string, string> = {};
    const record = body as Record<string, unknown>;

    const churchName = str(record.churchName, 160);
    if (churchName.length < 3) errors.churchName = "Informe o nome da igreja.";

    const email = nullable(record.email, 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "E-mail inválido.";

    const cnpj = nullable(record.cnpj, 30);
    if (cnpj) {
      const digits = onlyDigits(cnpj);
      if (digits.length !== 14) errors.cnpj = "CNPJ deve conter 14 dígitos.";
    }

    const phone = nullable(record.phone, 30);
    if (phone) {
      const digits = onlyDigits(phone);
      if (digits.length < 10 || digits.length > 11) errors.phone = "Telefone inválido.";
    }

    const cep = nullable(record.cep, 12);
    if (cep && onlyDigits(cep).length !== 8) errors.cep = "CEP deve conter 8 dígitos.";

    const logo =
      typeof record.logo === "string" && record.logo.trim().length > 0
        ? record.logo.trim().startsWith("data:image/") || record.logo.trim().startsWith("/")
          ? record.logo.trim()
          : null
        : null;
    if (typeof record.logo === "string" && record.logo.trim() && !logo) {
      errors.logo = "Logo inválida.";
    }

    const palette = str(record.flyerPalette, 20).toLowerCase();

    if (Object.keys(errors).length > 0) {
      return Response.json({ ok: false, errors }, { status: 400 });
    }

    const values = {
      churchName,
      email,
      cnpj: cnpj ? maskCNPJ(cnpj) : null,
      address: nullable(record.address, 300),
      city: nullable(record.city, 120),
      cep: cep ? maskCEP(cep) : null,
      president: nullable(record.president, 160),
      phone: phone ? maskPhone(phone) : null,
      website: nullable(record.website, 160),
      instagram: nullable(record.instagram, 120),
      logo,
      flyerPalette: isThemeId(palette) ? palette : DEFAULT_THEME_ID,
      updatedAt: new Date(),
    };

    const current = await getSettings();
    const [updated] = await db
      .update(settingsTable)
      .set(values)
      .where(eq(settingsTable.id, current.id))
      .returning();

    await db.insert(activityLog).values({
      entity: "settings",
      entityId: updated.id,
      action: "update",
      description: "Dados institucionais da igreja atualizados.",
    });

    return Response.json({ ok: true, data: updated });
  } catch (error) {
    console.error("[api/settings PUT]", error);
    return Response.json({ ok: false, error: "Falha ao salvar as configurações." }, { status: 500 });
  }
}
