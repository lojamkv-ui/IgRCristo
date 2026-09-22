import { CanvaError, getBrandTemplateDataset } from "@/lib/canva";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** Campos preenchíveis (dataset) de um brand template. */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const dataset = await getBrandTemplateDataset(id);
    return Response.json({ ok: true, data: dataset });
  } catch (error) {
    const status = error instanceof CanvaError ? error.status : 500;
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Falha ao carregar o modelo." },
      { status: status === 401 ? 401 : 502 },
    );
  }
}
