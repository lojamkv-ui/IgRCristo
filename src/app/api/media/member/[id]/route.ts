import { bootstrap } from "@/server/bootstrap";
import { photoResponse } from "@/server/http";
import { getMemberPhoto } from "@/server/members";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await bootstrap();
    const { id: raw } = await ctx.params;
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return new Response(null, { status: 400 });
    return photoResponse(await getMemberPhoto(id), req);
  } catch (error) {
    console.error(error);
    return new Response(null, { status: 500 });
  }
}
