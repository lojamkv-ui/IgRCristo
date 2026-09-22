import { saoPauloToday } from "@/lib/format";
import { bootstrap } from "@/server/bootstrap";
import { dbErrorMessage, fail, mutationError, ok, readJson } from "@/server/http";
import { listServices, saveService } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await bootstrap();
    const services = await listServices();
    return ok({ services, today: saoPauloToday() });
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}

export async function POST(req: Request) {
  try {
    await bootstrap();
    const body = await readJson(req);
    if (!body) return fail("Envie os dados do culto em JSON.");
    const result = await saveService(body);
    if ("error" in result) return mutationError(result);
    return ok({ id: result.id }, 201);
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
