import { db } from "@/db";
import { activityLog, canvaDesigns } from "@/db/schema";
import {
  autofillBrandTemplate,
  CanvaError,
  createDesignFromAsset,
  getBrandTemplateDataset,
  getDesign,
  uploadImageAsset,
  type AutofillValue,
  type CanvaDesignSummary,
  type Dataset,
} from "@/lib/canva";
import { fullAddress, getSettings } from "@/lib/church";
import { simulateFlyerCopy } from "@/lib/flyer-prompt";
import { formatDateBR, formatLongDate, formatTimeBR, normalize, slugify } from "@/lib/format";
import { getService } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Body = {
  serviceId?: unknown;
  mode?: "upload" | "autofill" | "open";
  /** PNG gerado pelo Canvas (data URL) — usado em upload e como fallback de imagem. */
  imageDataUrl?: unknown;
  width?: unknown;
  height?: unknown;
  templateId?: unknown;
  templateTitle?: unknown;
  templateKind?: unknown;
  /** Mapeamento manual campo → chave de valor (opcional; sobrescreve o automático). */
  mapping?: Record<string, string>;
  /** Também enviar fotos (pregador/cantores) para a biblioteca ao abrir um design comum. */
  uploadPhotos?: unknown;
};

/* ------------------------------------------------------------------ *
 * Valores disponíveis para preencher templates
 * ------------------------------------------------------------------ */

type ValueKey =
  | "titulo"
  | "tema"
  | "tipo"
  | "data"
  | "data_extenso"
  | "hora"
  | "data_hora"
  | "dirigente"
  | "pregador"
  | "cantores"
  | "intercessores"
  | "versiculo"
  | "referencia"
  | "chamada"
  | "igreja"
  | "presidente"
  | "endereco"
  | "contato"
  | "email"
  | "cnpj"
  | "foto_pregador"
  | "foto_cantor"
  | "logo"
  | "arte";

const TEXT_ALIASES: Array<[ValueKey, string[]]> = [
  ["data_hora", ["datahora", "data_hora", "quando", "datetime"]],
  ["data_extenso", ["dataextenso", "data_extenso", "diasemana", "longdate"]],
  ["data", ["data", "date", "dia"]],
  ["hora", ["hora", "horario", "time", "hour"]],
  ["titulo", ["titulo", "title", "headline", "nome", "evento", "culto", "chamada_principal"]],
  ["tema", ["tema", "theme", "subtitulo", "subtitle", "assunto"]],
  ["tipo", ["tipo", "categoria", "kind", "type"]],
  ["dirigente", ["dirigente", "lider", "leader", "condutor"]],
  ["pregador", ["pregador", "preletor", "palestrante", "preacher", "speaker", "ministrante", "pastor"]],
  ["cantores", ["cantores", "cantor", "louvor", "ministerio", "worship", "singers", "musica", "banda"]],
  ["intercessores", ["intercessores", "intercessor", "oracao", "prayer"]],
  ["versiculo", ["versiculo", "verse", "texto", "biblia", "palavra"]],
  ["referencia", ["referencia", "reference", "passagem", "livro"]],
  ["chamada", ["chamada", "cta", "convite", "calltoaction"]],
  ["igreja", ["igreja", "church", "nome_igreja", "organizacao"]],
  ["presidente", ["presidente", "responsavel", "president"]],
  ["endereco", ["endereco", "address", "local", "localizacao", "onde"]],
  ["contato", ["contato", "telefone", "whatsapp", "phone", "fone"]],
  ["email", ["email", "e_mail", "mail"]],
  ["cnpj", ["cnpj", "documento"]],
];

const IMAGE_ALIASES: Array<[ValueKey, string[]]> = [
  ["logo", ["logo", "logotipo", "marca", "brand"]],
  ["foto_cantor", ["cantor", "cantora", "louvor", "singer", "worship"]],
  ["foto_pregador", ["pregador", "preletor", "preacher", "speaker", "pastor", "foto", "photo", "imagem", "image", "retrato"]],
  ["arte", ["arte", "flyer", "fundo", "background", "capa"]],
];

function guessKey(fieldName: string, type: "text" | "image"): ValueKey | null {
  const name = normalize(fieldName).replace(/[^a-z0-9]+/g, "_");
  const table = type === "image" ? IMAGE_ALIASES : TEXT_ALIASES;
  for (const [key, aliases] of table) {
    if (aliases.some((alias) => name === alias || name.includes(alias))) return key;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Rota
 * ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  const serviceId = Number(body?.serviceId);
  const mode = body?.mode ?? "upload";

  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    return Response.json({ ok: false, error: "serviceId inválido." }, { status: 400 });
  }

  try {
    const [service, church] = await Promise.all([getService(serviceId), getSettings()]);
    if (!service) return Response.json({ ok: false, error: "Culto não encontrado." }, { status: 404 });

    const copy = simulateFlyerCopy(service, church);
    const baseTitle = `Flyer · ${service.title} · ${formatDateBR(service.serviceDate)}`;
    const imageDataUrl = typeof body?.imageDataUrl === "string" ? body.imageDataUrl : null;

    const textValues: Record<ValueKey, string> = {
      titulo: service.title,
      tema: service.theme ?? copy.headline,
      tipo: service.kind ?? "Culto",
      data: formatDateBR(service.serviceDate),
      data_extenso: formatLongDate(service.serviceDate),
      hora: formatTimeBR(service.serviceTime),
      data_hora: `${formatDateBR(service.serviceDate)} · ${formatTimeBR(service.serviceTime)}`,
      dirigente: service.leader,
      pregador: service.preacherName ?? "A confirmar",
      cantores: (service.singers ?? []).map((singer) => singer.name).join(", "),
      intercessores: (service.intercessors ?? []).join(", "),
      versiculo: copy.verse,
      referencia: copy.verseReference,
      chamada: copy.callToAction,
      igreja: church.churchName,
      presidente: church.president ?? "",
      endereco: fullAddress(church),
      contato: church.phone ?? "",
      email: church.email ?? "",
      cnpj: church.cnpj ?? "",
      foto_pregador: "",
      foto_cantor: "",
      logo: "",
      arte: "",
    };

    const imageSources: Partial<Record<ValueKey, string | null>> = {
      foto_pregador: service.preacherPhoto,
      foto_cantor: (service.singers ?? []).find((singer) => singer.photo)?.photo ?? null,
      logo: church.logo,
      arte: imageDataUrl,
    };

    const uploadedAssets = new Map<string, string>();
    const assetPrefix = slugify(service.title);
    async function assetFor(key: ValueKey, label: string): Promise<string | null> {
      const source = imageSources[key];
      if (!source) return null;
      if (uploadedAssets.has(key)) return uploadedAssets.get(key) ?? null;
      const dataUrl = source.startsWith("data:") ? source : await localFileToDataUrl(source, request);
      if (!dataUrl) return null;
      const asset = await uploadImageAsset({ name: `${label} · ${assetPrefix}`, dataUrl });
      uploadedAssets.set(key, asset.id);
      return asset.id;
    }

    let design: CanvaDesignSummary;
    let source: "upload" | "autofill" | "template" = "upload";
    const filledFields: Array<{ field: string; key: string }> = [];
    const skippedFields: string[] = [];
    const templateId = typeof body?.templateId === "string" ? body.templateId : null;
    const templateTitle = typeof body?.templateTitle === "string" ? body.templateTitle : null;

    if (mode === "upload") {
      /* ---- Arte gerada → design editável no Canva ---- */
      if (!imageDataUrl) return Response.json({ ok: false, error: "Imagem do flyer ausente." }, { status: 400 });
      const width = Number(body?.width) || 1080;
      const height = Number(body?.height) || 1920;
      const asset = await uploadImageAsset({ name: baseTitle, dataUrl: imageDataUrl });
      design = await createDesignFromAsset({ assetId: asset.id, title: baseTitle, width, height });
    } else if (mode === "autofill") {
      /* ---- Brand template preenchido com os dados do culto ---- */
      if (!templateId) return Response.json({ ok: false, error: "Modelo não informado." }, { status: 400 });
      const dataset: Dataset = await getBrandTemplateDataset(templateId);
      const data: Record<string, AutofillValue> = {};
      const manual = body?.mapping ?? {};

      for (const [field, def] of Object.entries(dataset)) {
        const chosen = (manual[field] as ValueKey | undefined) ?? guessKey(field, def.type === "image" ? "image" : "text");
        if (def.type === "text") {
          const key = chosen && chosen in textValues ? chosen : null;
          const value = key ? textValues[key] : "";
          if (value) {
            data[field] = { type: "text", text: value };
            filledFields.push({ field, key: key as string });
          } else {
            skippedFields.push(field);
          }
        } else if (def.type === "image") {
          const key = (chosen ?? "foto_pregador") as ValueKey;
          const assetId = (await assetFor(key, field)) ?? (await assetFor("arte", field));
          if (assetId) {
            data[field] = { type: "image", asset_id: assetId };
            filledFields.push({ field, key });
          } else {
            skippedFields.push(field);
          }
        } else {
          skippedFields.push(field);
        }
      }

      if (Object.keys(data).length === 0) {
        return Response.json(
          { ok: false, error: "Este modelo não tem campos de texto/imagem preenchíveis reconhecidos.", dataset },
          { status: 422 },
        );
      }

      design = await autofillBrandTemplate({ templateId, title: baseTitle, data });
      source = "autofill";
    } else {
      /* ---- Design comum: abre no Canva com os assets já na biblioteca ---- */
      if (!templateId) return Response.json({ ok: false, error: "Modelo não informado." }, { status: 400 });
      if (body?.uploadPhotos !== false) {
        await Promise.all([
          assetFor("foto_pregador", "Pregador"),
          assetFor("foto_cantor", "Louvor"),
          imageDataUrl ? assetFor("arte", "Flyer gerado") : Promise.resolve(null),
        ]);
      }
      design = await getDesign(templateId);
      source = "template";
    }

    const [saved] = await db
      .insert(canvaDesigns)
      .values({
        serviceId,
        designId: design.id,
        title: design.title ?? baseTitle,
        editUrl: design.urls?.edit_url ?? design.url ?? null,
        viewUrl: design.urls?.view_url ?? null,
        thumbnailUrl: design.thumbnail?.url ?? null,
        source,
        templateId,
        templateTitle,
      })
      .returning();

    await db.insert(activityLog).values({
      entity: "service",
      entityId: serviceId,
      action: "canva",
      description:
        source === "upload"
          ? `Flyer de "${service.title}" enviado ao Canva como design editável.`
          : source === "autofill"
            ? `Flyer de "${service.title}" criado no Canva a partir do modelo "${templateTitle ?? templateId}".`
            : `Modelo "${templateTitle ?? templateId}" aberto no Canva para "${service.title}".`,
    });

    return Response.json({
      ok: true,
      data: {
        record: saved,
        design: {
          id: design.id,
          title: design.title ?? baseTitle,
          editUrl: design.urls?.edit_url ?? design.url ?? null,
          viewUrl: design.urls?.view_url ?? null,
          thumbnail: design.thumbnail?.url ?? null,
        },
        source,
        filledFields,
        skippedFields,
        uploadedAssets: Array.from(uploadedAssets.entries()).map(([key, id]) => ({ key, id })),
      },
    });
  } catch (error) {
    console.error("[api/canva/designs]", error);
    const status = error instanceof CanvaError ? error.status : 500;
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Falha ao criar o design no Canva.",
        code: error instanceof CanvaError ? error.code : undefined,
      },
      { status: status === 401 ? 401 : status >= 400 && status < 500 ? status : 502 },
    );
  }
}

/** Converte um arquivo público do próprio app (ex.: /people/pastor.jpg) em data URL. */
async function localFileToDataUrl(path: string, request: Request): Promise<string | null> {
  if (!path.startsWith("/")) return null;
  try {
    const url = new URL(path, new URL(request.url).origin);
    const response = await fetch(url);
    if (!response.ok) return null;
    const mime = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
