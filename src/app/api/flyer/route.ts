import { bootstrap } from "@/server/bootstrap";
import { composeFlyer } from "@/server/flyer";
import { dbErrorMessage, fail, mutationError, ok, readJson } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await bootstrap();
    const body = await readJson(req);
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const serviceId = Number(record?.serviceId);
    if (!Number.isInteger(serviceId) || serviceId <= 0) return fail("Informe o culto para gerar o flyer.");
    const variant = Number(record?.variant ?? 0);
    const format = record?.format === "story" ? "story" : "feed";
    const tone = typeof record?.tone === "string" ? record.tone : null;
    const customPrompt = typeof record?.customPrompt === "string" ? record.customPrompt : null;
    const result = await composeFlyer(serviceId, Number.isFinite(variant) ? variant : 0, format, tone, customPrompt);
    if ("error" in result) return mutationError(result);
    return ok(result);
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
