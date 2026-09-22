import { getMemberHistory } from "@/lib/repo";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Histórico completo do cadastro, com filtro por tipo de atualização.
 * GET /api/members/:id/history?type=atualizado
 */
export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ ok: false, error: "ID inválido." }, { status: 400 });
  }

  try {
    const type = new URL(request.url).searchParams.get("type") ?? undefined;
    const data = await getMemberHistory(id, type);
    return Response.json({ ok: true, data, total: data.length });
  } catch (error) {
    console.error("[api/members/[id]/history GET]", error);
    return Response.json({ ok: false, error: "Falha ao carregar o histórico." }, { status: 500 });
  }
}
