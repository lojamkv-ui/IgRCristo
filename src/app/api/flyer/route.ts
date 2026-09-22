import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { fullAddress, getSettings } from "@/lib/church";
import {
  buildFlyerPrompt,
  buildImagePrompt,
  parseFlyerCopy,
  simulateFlyerCopy,
  type FlyerCopy,
} from "@/lib/flyer-prompt";
import { getService } from "@/lib/repo";
import { formatDateBR, formatLongDate, formatTimeBR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type GenerationResult = {
  copy: FlyerCopy;
  source: "openai" | "simulado";
  model: string;
  notice?: string;
};

function stripFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

/**
 * Chama a API do ChatGPT quando OPENAI_API_KEY está configurada.
 * Em qualquer falha (sem chave, rede, timeout, JSON inválido) degrada
 * graciosamente para o gerador local determinístico.
 */
async function generateCopy(prompt: string, fallback: FlyerCopy): Promise<GenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return {
      copy: fallback,
      source: "simulado",
      model: "gerador-local",
      notice:
        "OPENAI_API_KEY não configurada: o texto do flyer foi gerado localmente. O prompt abaixo pode ser colado no ChatGPT para refinar o conteúdo.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você é diretor de arte e redator publicitário de igrejas evangélicas brasileiras. Responde sempre com JSON válido.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI respondeu ${response.status}: ${detail.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da OpenAI.");

    const parsed: unknown = JSON.parse(stripFences(content));
    return { copy: parseFlyerCopy(parsed, fallback), source: "openai", model };
  } catch (error) {
    const message = error instanceof Error ? error.message : "erro desconhecido";
    return {
      copy: fallback,
      source: "simulado",
      model: "gerador-local",
      notice: `Não foi possível falar com a API do ChatGPT (${message}). Conteúdo gerado localmente.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST /api/flyer  { serviceId: number }
 * Monta o prompt detalhado do culto, chama o ChatGPT (ou simula) e devolve
 * tudo o que a interface precisa para renderizar/exportar o flyer.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { serviceId?: unknown } | null;
    const serviceId = Number(body?.serviceId);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return Response.json({ ok: false, error: "serviceId inválido." }, { status: 400 });
    }

    const [service, church] = await Promise.all([getService(serviceId), getSettings()]);
    if (!service) {
      return Response.json({ ok: false, error: "Culto não encontrado." }, { status: 404 });
    }

    const prompt = buildFlyerPrompt(service, church);
    const imagePrompt = buildImagePrompt(service, church);
    const fallback = simulateFlyerCopy(service, church);
    const generation = await generateCopy(prompt, fallback);

    await db.insert(activityLog).values({
      entity: "service",
      entityId: service.id,
      action: "flyer",
      description: `Flyer gerado para "${service.title}" (${formatDateBR(service.serviceDate)}) via ${generation.source}.`,
    });

    return Response.json({
      ok: true,
      source: generation.source,
      model: generation.model,
      notice: generation.notice ?? null,
      prompt,
      imagePrompt,
      copy: generation.copy,
      service: {
        id: service.id,
        title: service.title,
        kind: service.kind,
        dateISO: service.serviceDate,
        dateBR: formatDateBR(service.serviceDate),
        dateLong: formatLongDate(service.serviceDate),
        time: formatTimeBR(service.serviceTime),
        leader: service.leader,
        preacherName: service.preacherName,
        preacherPhoto: service.preacherPhoto,
        singers: service.singers ?? [],
        intercessors: service.intercessors ?? [],
        theme: service.theme,
        scripture: service.scripture,
        notes: service.notes,
      },
      church: {
        name: church.churchName,
        president: church.president,
        addressFull: fullAddress(church),
        address: church.address,
        city: church.city,
        cep: church.cep,
        phone: church.phone,
        email: church.email,
        cnpj: church.cnpj,
        website: church.website,
        instagram: church.instagram,
        logo: church.logo,
        flyerPalette: church.flyerPalette,
      },
    });
  } catch (error) {
    console.error("[api/flyer POST]", error);
    return Response.json({ ok: false, error: "Falha ao gerar o flyer." }, { status: 500 });
  }
}
