import { bootstrap } from "@/server/bootstrap";
import { getChurch, updateChurch } from "@/server/church";
import { dbErrorMessage, fail, mutationError, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await bootstrap();
    return ok({ church: await getChurch() });
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}

export async function PUT(req: Request) {
  try {
    await bootstrap();
    const body = await readJson(req);
    if (!body) return fail("Envie os dados da igreja em JSON.");
    const result = await updateChurch(body);
    if ("error" in result) return mutationError(result);
    return ok(result);
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
