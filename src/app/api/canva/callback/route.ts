import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { exchangeCode, getProfile, publicOrigin, redirectUrlFor, saveConnection } from "@/lib/canva";

export const dynamic = "force-dynamic";

function redirectWith(origin: string, path: string, params: Record<string, string>) {
  const target = new URL(path, origin);
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
  const response = NextResponse.redirect(target);
  ["canva_verifier", "canva_state", "canva_return"].forEach((name) => response.cookies.delete(name));
  return response;
}

/** Recebe o código de autorização do Canva e troca por tokens. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair.length === 2)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  ) as Record<string, string>;

  const returnTo = cookies.canva_return?.startsWith("/") ? cookies.canva_return : "/configuracoes";
  const error = url.searchParams.get("error");
  if (error) {
    return redirectWith(origin, returnTo, {
      canva: "erro",
      motivo: url.searchParams.get("error_description") ?? error,
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !cookies.canva_verifier || state !== cookies.canva_state) {
    return redirectWith(origin, returnTo, { canva: "erro", motivo: "Estado inválido. Tente conectar novamente." });
  }

  try {
    const tokens = await exchangeCode(code, cookies.canva_verifier, redirectUrlFor(request));
    await saveConnection(tokens);
    const { profile, user } = await getProfile();
    await saveConnection(tokens, {
      canvaUserId: user.user_id ?? null,
      displayName: profile.display_name ?? null,
      teamId: user.team_id ?? null,
    });
    await db.insert(activityLog).values({
      entity: "canva",
      entityId: null,
      action: "connect",
      description: `Conta do Canva conectada${profile.display_name ? ` (${profile.display_name})` : ""}.`,
    });
    return redirectWith(origin, returnTo, { canva: "conectado" });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Falha ao conectar.";
    return redirectWith(origin, returnTo, { canva: "erro", motivo: message });
  }
}
