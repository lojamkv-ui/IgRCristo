import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { deleteConnection } from "@/lib/canva";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await deleteConnection();
    await db.insert(activityLog).values({
      entity: "canva",
      entityId: null,
      action: "disconnect",
      description: "Conta do Canva desconectada.",
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[api/canva/disconnect]", error);
    return Response.json({ ok: false, error: "Falha ao desconectar." }, { status: 500 });
  }
}
