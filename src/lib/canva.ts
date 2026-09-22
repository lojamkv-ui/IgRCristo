/**
 * Cliente servidor da Canva Connect API.
 * Docs: https://www.canva.dev/docs/connect/
 *
 * Variáveis de ambiente:
 *  - CANVA_CLIENT_ID      (obrigatória)
 *  - CANVA_CLIENT_SECRET  (obrigatória)
 *  - CANVA_REDIRECT_URL   (opcional — por padrão `${origem}/api/canva/callback`)
 */

import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { canvaConnections, type CanvaConnection } from "@/db/schema";

export const CANVA_API = "https://api.canva.com/rest/v1";
export const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";

/** Escopos solicitados. Devem estar habilitados no app do Developer Portal. */
export const CANVA_SCOPES = [
  "profile:read",
  "asset:read",
  "asset:write",
  "design:meta:read",
  "design:content:read",
  "design:content:write",
  "brandtemplate:meta:read",
  "brandtemplate:content:read",
];

export class CanvaError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "CanvaError";
    this.status = status;
    this.code = code;
  }
}

/* ------------------------------------------------------------------ *
 * Configuração
 * ------------------------------------------------------------------ */

export function canvaConfig() {
  const clientId = process.env.CANVA_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.CANVA_CLIENT_SECRET?.trim() ?? "";
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
}

/** Origem pública da aplicação, respeitando proxies (x-forwarded-*). */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    url.host;
  return `${proto}://${host}`;
}

export function redirectUrlFor(request: Request): string {
  const fixed = process.env.CANVA_REDIRECT_URL?.trim();
  if (fixed) return fixed;
  return `${publicOrigin(request)}/api/canva/callback`;
}

/* ------------------------------------------------------------------ *
 * OAuth 2.0 + PKCE
 * ------------------------------------------------------------------ */

export function createPkce() {
  const verifier = crypto.randomBytes(64).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(32).toString("base64url");
  return { verifier, challenge, state };
}

export function buildAuthorizeUrl(params: { challenge: string; state: string; redirectUri: string }) {
  const { clientId } = canvaConfig();
  const url = new URL(CANVA_AUTH_URL);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("scope", CANVA_SCOPES.join(" "));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("state", params.state);
  url.searchParams.set("redirect_uri", params.redirectUri);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const { clientId, clientSecret } = canvaConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${CANVA_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await response.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token || !json.refresh_token) {
    throw new CanvaError(
      json.error_description ?? json.error ?? `Falha ao obter token (${response.status}).`,
      response.status,
      json.error,
    );
  }
  return json as TokenResponse;
}

export async function exchangeCode(code: string, verifier: string, redirectUri: string) {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  );
}

async function refreshTokens(refreshToken: string) {
  return tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }));
}

/* ------------------------------------------------------------------ *
 * Persistência da conexão (sistema mono-usuário → uma linha)
 * ------------------------------------------------------------------ */

export async function getConnection(): Promise<CanvaConnection | null> {
  const rows = await db.select().from(canvaConnections).orderBy(desc(canvaConnections.id)).limit(1);
  return rows[0] ?? null;
}

export async function saveConnection(
  tokens: TokenResponse,
  profile?: { canvaUserId?: string | null; displayName?: string | null; teamId?: string | null },
) {
  const expiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in - 60) * 1000);
  const existing = await getConnection();
  const values = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    scopes: tokens.scope ?? CANVA_SCOPES.join(" "),
    updatedAt: new Date(),
    ...(profile?.canvaUserId !== undefined ? { canvaUserId: profile.canvaUserId } : {}),
    ...(profile?.displayName !== undefined ? { displayName: profile.displayName } : {}),
    ...(profile?.teamId !== undefined ? { teamId: profile.teamId } : {}),
  };
  if (existing) {
    const [updated] = await db
      .update(canvaConnections)
      .set(values)
      .where(eq(canvaConnections.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(canvaConnections).values(values).returning();
  return created;
}

export async function deleteConnection() {
  const existing = await getConnection();
  if (!existing) return;
  // Revogação "best effort": mesmo se falhar, removemos localmente.
  try {
    const { clientId, clientSecret } = canvaConfig();
    await fetch(`${CANVA_API}/oauth/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: existing.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
  } catch {
    // ignorar
  }
  await db.delete(canvaConnections).where(eq(canvaConnections.id, existing.id));
}

/** Devolve um access token válido, renovando com o refresh token se necessário. */
export async function getAccessToken(): Promise<string> {
  const connection = await getConnection();
  if (!connection) throw new CanvaError("Canva não conectado. Conecte sua conta em Configurações.", 401, "not_connected");

  if (connection.expiresAt.getTime() - Date.now() > 30_000) return connection.accessToken;

  try {
    const refreshed = await refreshTokens(connection.refreshToken);
    const saved = await saveConnection(refreshed);
    return saved.accessToken;
  } catch (error) {
    // Refresh token inválido/expirado: exige reconexão.
    await db.delete(canvaConnections).where(eq(canvaConnections.id, connection.id));
    throw new CanvaError(
      `Sessão do Canva expirou. Conecte novamente. (${error instanceof Error ? error.message : "erro"})`,
      401,
      "reconnect",
    );
  }
}

/* ------------------------------------------------------------------ *
 * Chamadas à API
 * ------------------------------------------------------------------ */

type JsonRecord = Record<string, unknown>;

async function canvaFetch<T = JsonRecord>(
  path: string,
  init: RequestInit & { rawBody?: boolean } = {},
): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!init.rawBody && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${CANVA_API}${path}`, { ...init, headers });
  const text = await response.text();
  let json: JsonRecord = {};
  try {
    json = text ? (JSON.parse(text) as JsonRecord) : {};
  } catch {
    json = {};
  }
  if (!response.ok) {
    const code = typeof json.code === "string" ? json.code : undefined;
    const message =
      (typeof json.message === "string" && json.message) ||
      `Canva respondeu ${response.status} em ${path}.`;
    throw new CanvaError(message, response.status, code);
  }
  return json as T;
}

export type CanvaProfile = { display_name?: string };
export type CanvaUser = { user_id?: string; team_id?: string };

export async function getProfile(): Promise<{ profile: CanvaProfile; user: CanvaUser }> {
  const [profile, user] = await Promise.all([
    canvaFetch<{ profile?: CanvaProfile }>("/users/me/profile").catch(() => ({ profile: {} })),
    canvaFetch<{ team_user?: CanvaUser }>("/users/me").catch(() => ({ team_user: {} })),
  ]);
  return { profile: profile.profile ?? {}, user: user.team_user ?? {} };
}

export type CanvaThumbnail = { width: number; height: number; url: string };
export type CanvaDesignSummary = {
  id: string;
  title?: string;
  url?: string;
  thumbnail?: CanvaThumbnail;
  urls?: { edit_url?: string; view_url?: string };
  page_count?: number;
  updated_at?: number;
};
export type CanvaBrandTemplate = {
  id: string;
  title?: string;
  view_url?: string;
  create_url?: string;
  thumbnail?: CanvaThumbnail;
  updated_at?: number;
};

export async function listDesigns(query?: string, continuation?: string) {
  const params = new URLSearchParams({ limit: "30", sort_by: "modified_descending" });
  if (query) params.set("query", query);
  if (continuation) params.set("continuation", continuation);
  return canvaFetch<{ items?: CanvaDesignSummary[]; continuation?: string }>(`/designs?${params}`);
}

/** Brand templates exigem Canva Enterprise — em outros planos devolvemos lista vazia. */
export async function listBrandTemplates(query?: string) {
  const params = new URLSearchParams({ limit: "30", dataset: "any" });
  if (query) params.set("query", query);
  try {
    return await canvaFetch<{ items?: CanvaBrandTemplate[]; continuation?: string }>(`/brand-templates?${params}`);
  } catch (error) {
    if (error instanceof CanvaError && [402, 403, 404].includes(error.status)) {
      return { items: [], continuation: undefined, unavailable: error.message };
    }
    throw error;
  }
}

export type DatasetField = { type: "text" | "image" | "chart" };
export type Dataset = Record<string, DatasetField>;

export async function getBrandTemplateDataset(templateId: string): Promise<Dataset> {
  const json = await canvaFetch<{ dataset?: Dataset }>(`/brand-templates/${encodeURIComponent(templateId)}/dataset`);
  return json.dataset ?? {};
}

export async function getDesign(designId: string): Promise<CanvaDesignSummary> {
  const json = await canvaFetch<{ design?: CanvaDesignSummary }>(`/designs/${encodeURIComponent(designId)}`);
  if (!json.design) throw new CanvaError("Design não encontrado no Canva.", 404);
  return json.design;
}

/* ------------------------------ jobs assíncronos ------------------------------ */

type Job<TResult> = { id: string; status: "in_progress" | "success" | "failed"; result?: TResult; error?: { code?: string; message?: string } };

async function pollJob<TResult>(path: string, first: Job<TResult>, timeoutMs = 90_000): Promise<TResult> {
  let job = first;
  const started = Date.now();
  while (job.status === "in_progress") {
    if (Date.now() - started > timeoutMs) throw new CanvaError("O Canva demorou demais para concluir a operação.", 504, "timeout");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const json = await canvaFetch<{ job: Job<TResult> }>(`${path}/${job.id}`);
    job = json.job;
  }
  if (job.status === "failed" || !job.result) {
    throw new CanvaError(job.error?.message ?? "Operação falhou no Canva.", 502, job.error?.code);
  }
  return job.result;
}

/** Envia uma imagem (data URL ou bytes) para a biblioteca do usuário e devolve o asset_id. */
export async function uploadImageAsset(input: { name: string; dataUrl?: string; bytes?: Buffer; mime?: string }) {
  let bytes = input.bytes ?? null;
  if (!bytes && input.dataUrl) {
    const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(input.dataUrl);
    if (!match) throw new CanvaError("Imagem inválida para envio ao Canva.", 400);
    bytes = Buffer.from(match[2], "base64");
  }
  if (!bytes) throw new CanvaError("Nenhuma imagem para enviar.", 400);

  const first = await canvaFetch<{ job: Job<{ asset: { id: string; name?: string; thumbnail?: CanvaThumbnail } }> }>(
    "/asset-uploads",
    {
      method: "POST",
      rawBody: true,
      headers: {
        "Content-Type": "application/octet-stream",
        "Asset-Upload-Metadata": JSON.stringify({
          name_base64: Buffer.from(input.name.slice(0, 50)).toString("base64"),
        }),
      },
      body: new Uint8Array(bytes),
    },
  );
  const result = await pollJob("/asset-uploads", first.job);
  return result.asset;
}

/** Cria um design editável contendo o asset informado. */
export async function createDesignFromAsset(input: {
  assetId: string;
  title: string;
  width: number;
  height: number;
}): Promise<CanvaDesignSummary> {
  const json = await canvaFetch<{ design?: CanvaDesignSummary }>("/designs", {
    method: "POST",
    body: JSON.stringify({
      design_type: { type: "custom", width: input.width, height: input.height },
      asset_id: input.assetId,
      title: input.title.slice(0, 255),
    }),
  });
  if (!json.design) throw new CanvaError("O Canva não devolveu o design criado.", 502);
  return json.design;
}

export type AutofillValue = { type: "text"; text: string } | { type: "image"; asset_id: string };

/** Preenche um brand template com os dados e devolve o design criado. */
export async function autofillBrandTemplate(input: {
  templateId: string;
  title: string;
  data: Record<string, AutofillValue>;
}): Promise<CanvaDesignSummary> {
  const first = await canvaFetch<{ job: Job<{ type: string; design: CanvaDesignSummary }> }>("/autofills", {
    method: "POST",
    body: JSON.stringify({
      type: "create_from_brand_template",
      brand_template_id: input.templateId,
      title: input.title.slice(0, 255),
      data: input.data,
    }),
  });
  const result = await pollJob("/autofills", first.job, 120_000);
  return result.design;
}

/** Exporta um design como PNG e devolve as URLs temporárias. */
export async function exportDesignPng(designId: string): Promise<string[]> {
  const first = await canvaFetch<{ job: Job<{ urls: string[] }> }>("/exports", {
    method: "POST",
    body: JSON.stringify({ design_id: designId, format: { type: "png" } }),
  });
  const result = await pollJob("/exports", first.job, 120_000);
  return result.urls ?? [];
}
