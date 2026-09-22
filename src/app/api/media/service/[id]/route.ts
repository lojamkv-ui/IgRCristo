import { bootstrap } from "@/server/bootstrap";
import { photoResponse } from "@/server/http";
import { getServicePhoto } from "@/server/services";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await bootstrap();
    const { id: raw } = await ctx.params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 400 });
    const url = new URL(req.url);
    if (url.searchParams.get("slot") === "preacher") return photoResponse(await getServicePhoto(id, "preacher"), req);
    const participant = Number(url.searchParams.get("participant"));
    if (!Number.isInteger(participant) || participant <= 0) return new Response(null, { status: 404 });
    return photoResponse(await getServicePhoto(id, participant), req);
  } catch (error) {
    console.error(error);
    return new Response(null, { status: 500 });
  }
}
