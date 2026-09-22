import { NextResponse } from "next/server";
import { buildAuthorizeUrl, canvaConfig, createPkce, publicOrigin, redirectUrlFor } from "@/lib/canva";

export const dynamic = "force-dynamic";

/** Inicia o fluxo OAuth (PKCE) redirecionando o usuário ao Canva. */
export async function GET(request: Request) {
  const { configured } = canvaConfig();
  const url = new URL(request.url);
  if (!configured) {
    return NextResponse.redirect(new URL("/configuracoes?canva=nao-configurado", publicOrigin(request)));
  }

  const returnTo = url.searchParams.get("returnTo") ?? "/configuracoes";
  const { verifier, challenge, state } = createPkce();
  const redirectUri = redirectUrlFor(request);
  const authorizeUrl = buildAuthorizeUrl({ challenge, state, redirectUri });

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: publicOrigin(request).startsWith("https"),
    path: "/",
    maxAge: 600,
  };
  response.cookies.set("canva_verifier", verifier, cookieOptions);
  response.cookies.set("canva_state", state, cookieOptions);
  response.cookies.set("canva_return", returnTo.startsWith("/") ? returnTo : "/configuracoes", cookieOptions);
  return response;
}
