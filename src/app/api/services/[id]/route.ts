import { bootstrap } from "@/server/bootstrap";
import { dbErrorMessage, fail, mutationError, ok, readJson } from "@/server/http";
import { deleteService, getService, saveService } from "@/server/services";

export const dynamic = "force-dynamic";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await bootstrap();
    const { id: raw } = await ctx.params;
    const id = parseId(raw);
    if (!id) return fail("Culto inválido.");
    const service = await getService(id);
    if (!service) return fail("Culto não encontrado.", 404);
    return ok({ service });
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await bootstrap();
    const { id: raw } = await ctx.params;
    const id = parseId(raw);
    if (!id) return fail("Culto inválido.");
    const body = await readJson(req);
    if (!body) return fail("Envie os dados do culto em JSON.");
    const result = await saveService(body, id);
    if ("error" in result) return mutationError(result);
    return ok(result);
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await bootstrap();
    const { id: raw } = await ctx.params;
    const id = parseId(raw);
    if (!id) return fail("Culto inválido.");
    const result = await deleteService(id);
    if ("error" in result) return mutationError(result);
    return ok(result);
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
