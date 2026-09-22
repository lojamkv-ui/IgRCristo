import { ensureSeed } from "@/lib/seed";
import { listServices } from "@/lib/repo";
import { createService } from "@/lib/service-writes";
import { validateService } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeed();
    const params = new URL(request.url).searchParams;
    const limitRaw = Number(params.get("limit"));

    const data = await listServices({
      q: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      upcoming: params.get("upcoming") === "1",
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
    });

    return Response.json({ ok: true, data, total: data.length });
  } catch (error) {
    console.error("[api/services GET]", error);
    return Response.json({ ok: false, error: "Falha ao carregar a agenda." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const result = validateService(body);
    if (!result.ok) return Response.json({ ok: false, errors: result.errors }, { status: 400 });

    const service = await createService(result.data);
    return Response.json({ ok: true, data: service }, { status: 201 });
  } catch (error) {
    console.error("[api/services POST]", error);
    return Response.json({ ok: false, error: "Falha ao agendar o culto." }, { status: 500 });
  }
}
