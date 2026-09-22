import { listMembers } from "@/server/members";
import { bootstrap } from "@/server/bootstrap";
import { actorFrom, dbErrorMessage, fail, mutationError, ok, readJson } from "@/server/http";
import { createMember } from "@/server/members";
import { saoPauloToday } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await bootstrap();
    const url = new URL(req.url);
    const members = await listMembers({
      q: url.searchParams.get("q") ?? "",
      ecclesiastical: url.searchParams.get("ecclesiastical") ?? "",
      local: url.searchParams.get("local") ?? "",
      localActive: url.searchParams.get("localActive") !== "0",
      kinship: url.searchParams.get("kinship") ?? "",
      status: url.searchParams.get("status") ?? "",
      sort: url.searchParams.get("sort") ?? "name",
    });
    return ok({ members, total: members.length, today: saoPauloToday() });
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}

export async function POST(req: Request) {
  try {
    await bootstrap();
    const body = await readJson(req);
    if (!body) return fail("Envie os dados do cadastro em JSON.");
    const result = await createMember(body, actorFrom(req));
    if ("error" in result) return mutationError(result);
    return ok({ id: result.id }, 201);
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
