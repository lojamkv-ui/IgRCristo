import { CanvaError, listBrandTemplates, listDesigns } from "@/lib/canva";

export const dynamic = "force-dynamic";

export type CanvaTemplateItem = {
  id: string;
  kind: "brand_template" | "design";
  title: string;
  thumbnail: string | null;
  openUrl: string | null;
  updatedAt: number | null;
};

/**
 * Modelos disponíveis na biblioteca do usuário no Canva:
 * brand templates (Enterprise, com autofill) + designs próprios.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || undefined;
  try {
    const [templates, designs] = await Promise.all([listBrandTemplates(query), listDesigns(query)]);

    const items: CanvaTemplateItem[] = [
      ...(templates.items ?? []).map<CanvaTemplateItem>((item) => ({
        id: item.id,
        kind: "brand_template",
        title: item.title ?? "Brand template",
        thumbnail: item.thumbnail?.url ?? null,
        openUrl: item.view_url ?? null,
        updatedAt: item.updated_at ?? null,
      })),
      ...(designs.items ?? []).map<CanvaTemplateItem>((item) => ({
        id: item.id,
        kind: "design",
        title: item.title ?? "Design sem título",
        thumbnail: item.thumbnail?.url ?? null,
        openUrl: item.urls?.edit_url ?? item.url ?? null,
        updatedAt: item.updated_at ?? null,
      })),
    ];

    return Response.json({
      ok: true,
      data: items,
      brandTemplatesUnavailable: "unavailable" in templates ? templates.unavailable : null,
    });
  } catch (error) {
    const status = error instanceof CanvaError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Falha ao listar modelos do Canva.";
    return Response.json({ ok: false, error: message, code: error instanceof CanvaError ? error.code : undefined }, { status: status === 401 ? 401 : 502 });
  }
}
