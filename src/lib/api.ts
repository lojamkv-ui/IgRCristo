import type { ActivityEntry, Service } from "@/db/schema";
import type { FlyerCopy } from "@/lib/flyer-prompt";
import type {
  HistoryDTO,
  MemberFilters,
  MemberPayload,
  MemberWithRoles,
  ServicePayload,
  SettingsDTO,
} from "@/lib/types";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string>;
  code?: string;

  constructor(message: string, status = 500, errors: Record<string, string> = {}, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

type Json = Record<string, unknown>;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Sem conexão com o servidor. Verifique sua internet e tente novamente.", 0);
  }

  const text = await response.text();
  let payload: Json | null = null;
  try {
    payload = text ? (JSON.parse(text) as Json) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new ApiError(
      (payload?.error as string) ?? `Erro ${response.status} ao processar a requisição.`,
      response.status,
      (payload?.errors as Record<string, string>) ?? {},
      typeof payload?.code === "string" ? payload.code : undefined,
    );
  }

  return payload as unknown as T;
}

function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/* ------------------------------- respostas ------------------------------ */

export type Facets = {
  ecclesiastical: string[];
  local: string[];
  kinship: string[];
};

export type MemberListResponse = { ok: true; data: MemberWithRoles[]; total: number; facets: Facets };
export type MemberDetailResponse = {
  ok: true;
  data: MemberWithRoles;
  history: HistoryDTO[];
  participations: Service[];
};
export type HistoryResponse = { ok: true; data: HistoryDTO[]; total: number };
export type ServiceListResponse = { ok: true; data: Service[]; total: number };
export type SettingsResponse = { ok: true; data: SettingsDTO; defaults: SettingsDTO };

export type FlyerResponse = {
  ok: true;
  source: "openai" | "simulado";
  model: string;
  notice: string | null;
  prompt: string;
  imagePrompt: string;
  copy: FlyerCopy;
  service: {
    id: number;
    title: string;
    kind: string | null;
    dateISO: string;
    dateBR: string;
    dateLong: string;
    time: string;
    leader: string;
    preacherName: string | null;
    preacherPhoto: string | null;
    singers: Array<{ name: string; photo: string | null; memberId?: number | null }>;
    intercessors: string[];
    theme: string | null;
    scripture: string | null;
    notes: string | null;
  };
  church: {
    name: string;
    president: string | null;
    addressFull: string;
    address: string | null;
    city: string | null;
    cep: string | null;
    phone: string | null;
    email: string | null;
    cnpj: string | null;
    website: string | null;
    instagram: string | null;
    logo: string | null;
    flyerPalette: string;
  };
};

export type CanvaStatus = {
  configured: boolean;
  connected: boolean;
  user: { displayName: string | null; canvaUserId: string | null; since: string } | null;
  redirectUrl: string;
  scopes: string[];
  designs: Array<{
    id: number;
    serviceId: number | null;
    designId: string;
    title: string | null;
    editUrl: string | null;
    viewUrl: string | null;
    thumbnailUrl: string | null;
    source: string;
    templateId: string | null;
    templateTitle: string | null;
    createdAt: string;
  }>;
};

export type CanvaTemplateItem = {
  id: string;
  kind: "brand_template" | "design";
  title: string;
  thumbnail: string | null;
  openUrl: string | null;
  updatedAt: number | null;
};

export type CanvaDesignResult = {
  record: CanvaStatus["designs"][number];
  design: { id: string; title: string; editUrl: string | null; viewUrl: string | null; thumbnail: string | null };
  source: "upload" | "autofill" | "template";
  filledFields: Array<{ field: string; key: string }>;
  skippedFields: string[];
  uploadedAssets: Array<{ key: string; id: string }>;
};

export type BackupResponse = {
  ok: true;
  data: {
    version: number;
    exportedAt: string;
    app: string;
    church: SettingsDTO;
    members: Array<MemberWithRoles & { history: HistoryDTO[] }>;
    services: Service[];
    activityLog: ActivityEntry[];
  };
  counts: { members: number; roles: number; history: number; services: number };
};

/* --------------------------------- api ---------------------------------- */

export const api = {
  members: {
    list: (filters: MemberFilters = {}) =>
      request<MemberListResponse>(`/api/members${toQuery(filters as Record<string, string>)}`),
    get: (id: number) => request<MemberDetailResponse>(`/api/members/${id}`),
    create: (payload: MemberPayload) =>
      request<{ ok: true; data: MemberWithRoles }>("/api/members", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: MemberPayload) =>
      request<{ ok: true; data: MemberWithRoles }>(`/api/members/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<{ ok: true; data: { id: number; name: string } }>(`/api/members/${id}`, {
        method: "DELETE",
      }),
    history: (id: number, type?: string) =>
      request<HistoryResponse>(`/api/members/${id}/history${toQuery({ type })}`),
  },

  services: {
    list: (query: Record<string, string | number | boolean | undefined> = {}) =>
      request<ServiceListResponse>(`/api/services${toQuery(query)}`),
    get: (id: number) => request<{ ok: true; data: Service }>(`/api/services/${id}`),
    create: (payload: ServicePayload) =>
      request<{ ok: true; data: Service }>("/api/services", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: ServicePayload) =>
      request<{ ok: true; data: Service; changes: unknown[] }>(`/api/services/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<{ ok: true; data: { id: number; title: string } }>(`/api/services/${id}`, {
        method: "DELETE",
      }),
  },

  settings: {
    get: () => request<SettingsResponse>("/api/settings"),
    update: (payload: Record<string, unknown>) =>
      request<{ ok: true; data: SettingsDTO }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },

  flyer: {
    generate: (serviceId: number) =>
      request<FlyerResponse>("/api/flyer", {
        method: "POST",
        body: JSON.stringify({ serviceId }),
      }),
  },

  canva: {
    status: (serviceId?: number) =>
      request<{ ok: true; data: CanvaStatus }>(`/api/canva/status${toQuery({ serviceId })}`),
    disconnect: () => request<{ ok: true }>("/api/canva/disconnect", { method: "POST" }),
    templates: (q?: string) =>
      request<{ ok: true; data: CanvaTemplateItem[]; brandTemplatesUnavailable: string | null }>(
        `/api/canva/templates${toQuery({ q })}`,
      ),
    dataset: (templateId: string) =>
      request<{ ok: true; data: Record<string, { type: "text" | "image" | "chart" }> }>(
        `/api/canva/templates/${encodeURIComponent(templateId)}`,
      ),
    createDesign: (payload: Record<string, unknown>) =>
      request<{ ok: true; data: CanvaDesignResult }>("/api/canva/designs", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  backup: {
    export: () => request<BackupResponse>("/api/backup"),
    import: (mode: "replace" | "merge", payload: unknown) =>
      request<{ ok: true; data: { mode: string; imported: Record<string, number> } }>("/api/backup", {
        method: "POST",
        body: JSON.stringify({ mode, payload }),
      }),
  },
};

/** Mensagem amigável para qualquer erro vindo da API. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocorreu um erro inesperado.";
}
