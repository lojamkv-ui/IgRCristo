import { getService } from "@/lib/repo";
import { deleteService, updateService } from "@/lib/service-writes";
import { validateService } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const id = parseId((await context.params).id);
  if (!id) return Response.json({ ok: false, error: "ID inválido." }, { status: 400 });

  try {
    const data = await getService(id);
    if (!data) return Response.json({ ok: false, error: "Culto não encontrado." }, { status: 404 });
    return Response.json({ ok: true, data });
  } catch (error) {
    console.error("[api/services/[id] GET]", error);
    return Response.json({ ok: false, error: "Falha ao carregar o culto." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const id = parseId((await context.params).id);
  if (!id) return Response.json({ ok: false, error: "ID inválido." }, { status: 400 });

  try {
    const body = await request.json().catch(() => null);
    const result = validateService(body);
    if (!result.ok) return Response.json({ ok: false, errors: result.errors }, { status: 400 });

    const updated = await updateService(id, result.data);
    if (!updated) return Response.json({ ok: false, error: "Culto não encontrado." }, { status: 404 });

    return Response.json({ ok: true, data: updated.service, changes: updated.changes });
  } catch (error) {
    console.error("[api/services/[id] PUT]", error);
    return Response.json({ ok: false, error: "Falha ao atualizar o culto." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const id = parseId((await context.params).id);
  if (!id) return Response.json({ ok: false, error: "ID inválido." }, { status: 400 });

  try {
    const result = await deleteService(id);
    if (!result.deleted) {
      return Response.json({ ok: false, error: "Culto não encontrado." }, { status: 404 });
    }
    return Response.json({ ok: true, data: { id, title: result.title ?? "" } });
  } catch (error) {
    console.error("[api/services/[id] DELETE]", error);
    return Response.json({ ok: false, error: "Falha ao excluir o culto." }, { status: 500 });
  }
}


