export function ok(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(error: string, status = 400, fields?: Record<string, string>) {
  return Response.json({ error, fields }, { status, headers: { "Cache-Control": "no-store" } });
}

export function mutationError(result: { error?: string; status?: number; fields?: Record<string, string> }) {
  return fail(result.error ?? "Não foi possível concluir a operação.", result.status ?? 400, result.fields);
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function actorFrom(req: Request) {
  const raw = req.headers.get("x-actor") || "Secretaria";
  const clean = raw.replace(/[\u0000\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return clean || "Secretaria";
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error) return errorCode(error.cause);
  return undefined;
}

export function dbErrorMessage(error: unknown) {
  const code = errorCode(error);
  if (code === "42P01" || code === "42703") return "O banco ainda não está com as tabelas deste sistema. Atualize o schema e tente de novo.";
  return "Não foi possível acessar o banco de dados agora.";
}

export function photoResponse(photo: string | null, req: Request) {
  if (!photo) return new Response(null, { status: 404 });
  if (photo.startsWith("data:")) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(photo);
    if (!match) return new Response(null, { status: 415 });
    const mime = match[1];
    if (!mime || !["image/jpeg", "image/png", "image/webp"].includes(mime)) return new Response(null, { status: 415 });
    const bytes = Buffer.from((match[2] ?? "").replace(/\s/g, ""), "base64");
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": mime, "Cache-Control": "private, max-age=60" },
    });
  }
  if (photo.startsWith("/") && !photo.startsWith("//") && !photo.includes("..")) {
    return Response.redirect(new URL(photo, req.url), 302);
  }
  return new Response(null, { status: 404 });
}

export function memberPhotoUrl(id: number, photo: string | null, version?: Date | string | null) {
  if (!photo) return null;
  if (photo.startsWith("/") || photo.startsWith("http")) return photo;
  const stamp = version instanceof Date ? version.toISOString() : version || "";
  return `/api/media/member/${id}${stamp ? `?v=${encodeURIComponent(stamp)}` : ""}`;
}

export function servicePhotoUrl(
  serviceId: number,
  slot: "preacher" | number,
  photo: string | null,
  version?: Date | string | null,
) {
  if (!photo) return null;
  if (photo.startsWith("/") || photo.startsWith("http")) return photo;
  const stamp = version instanceof Date ? version.toISOString() : version || "";
  const query = new URLSearchParams();
  if (slot === "preacher") query.set("slot", "preacher");
  else query.set("participant", String(slot));
  if (stamp) query.set("v", stamp);
  return `/api/media/service/${serviceId}?${query.toString()}`;
}
