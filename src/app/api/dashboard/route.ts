import { bootstrap } from "@/server/bootstrap";
import { getDashboard } from "@/server/dashboard";
import { dbErrorMessage, fail, ok } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await bootstrap();
    return ok(await getDashboard());
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
