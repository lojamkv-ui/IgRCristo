import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { canvaDesigns } from "@/db/schema";
import { CANVA_SCOPES, canvaConfig, getConnection, redirectUrlFor } from "@/lib/canva";

export const dynamic = "force-dynamic";

/** Estado da integração: configurada? conectada? quem é o usuário? */
export async function GET(request: Request) {
  const { configured } = canvaConfig();
  const url = new URL(request.url);
  const serviceId = Number(url.searchParams.get("serviceId"));

  const connection = configured ? await getConnection() : null;
  const designs =
    Number.isInteger(serviceId) && serviceId > 0
      ? await db
          .select()
          .from(canvaDesigns)
          .where(eq(canvaDesigns.serviceId, serviceId))
          .orderBy(desc(canvaDesigns.createdAt))
          .limit(10)
      : [];

  return Response.json({
    ok: true,
    data: {
      configured,
      connected: Boolean(connection),
      user: connection
        ? { displayName: connection.displayName, canvaUserId: connection.canvaUserId, since: connection.createdAt }
        : null,
      redirectUrl: redirectUrlFor(request),
      scopes: CANVA_SCOPES,
      designs,
    },
  });
}
