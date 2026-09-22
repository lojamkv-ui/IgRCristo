import { bootstrap } from "@/server/bootstrap";
import { actorFrom, dbErrorMessage, fail, mutationError, ok, readJson } from "@/server/http";
import { deleteMember, getMember, updateMember } from "@/server/members";

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
    if (!id) return fail("Membro inválido.");
    const member = await getMember(id);
    if (!member) return fail("Membro não encontrado.", 404);
    return ok({ member });
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
    if (!id) return fail("Membro inválido.");
    const body = await readJson(req);
    if (!body) return fail("Envie os dados do cadastro em JSON.");
    const result = await updateMember(id, body, actorFrom(req));
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
    if (!id) return fail("Membro inválido.");
    const result = await deleteMember(id);
    if ("error" in result) return mutationError(result);
    return ok(result);
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
