import { buildFlyerPrompt, getFlyerTone, parseFlyerCopy, simulateFlyerCopy } from "@/lib/flyer-copy";
import type { ChurchProfile, FlyerCopy, ServiceItem } from "@/lib/types";
import { getChurch } from "./church";
import { getService } from "./services";

async function composeWithOpenAI(prompt: string): Promise<FlyerCopy> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("sem-chave");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você redige convites de cultos em português do Brasil. Responda apenas JSON válido." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`api-${response.status}`);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("vazia");
  const copy = parseFlyerCopy(content);
  if (!copy) throw new Error("json");
  return copy;
}

export async function composeFlyer(
  serviceId: number,
  variant = 0,
  format: "feed" | "story" = "feed",
  toneValue?: string | null,
  customPrompt?: string | null,
) {
  const service = await getService(serviceId);
  if (!service) return { error: "Culto não encontrado.", status: 404 as const };
  const church = await getChurch();
  const tone = getFlyerTone(toneValue ?? undefined);
  const trimmed = typeof customPrompt === "string" ? customPrompt.trim().slice(0, 8000) : "";
  const prompt = trimmed
    ? `${trimmed}

LEMBRETE FINAL: data, horário, nomes, endereço, CNPJ e contato são oficiais. Não invente e não altere.`
    : buildFlyerPrompt(church as ChurchProfile, service as ServiceItem, format, tone);
  if (!process.env.OPENAI_API_KEY) {
    return {
      source: "simulacao" as const,
      notice: `Sem chave OPENAI_API_KEY no servidor. O texto foi composto localmente no tom ${tone}, com versículo escolhido pelo tema do culto. Os dados oficiais da igreja e do culto não passam por um modelo.`,
      prompt,
      copy: simulateFlyerCopy(service, variant, tone),
      service,
      church,
      variant,
      tone,
    };
  }
  try {
    const copy = await composeWithOpenAI(prompt);
    return {
      source: "openai" as const,
      notice: `Texto criativo composto pelo ChatGPT no tom ${tone}. Data, horário, nomes, fotos, endereço, CNPJ e contato continuam vindo do cadastro — o modelo não pode alterá-los.`,
      prompt,
      copy,
      service,
      church,
      variant,
      tone,
    };
  } catch (error) {
    console.error(error);
    return {
      source: "simulacao" as const,
      notice: "A API do ChatGPT não respondeu. O flyer foi composto localmente para a secretaria não ficar sem o cartaz, no tom pedido. Os dados oficiais permanecem os do cadastro.",
      prompt,
      copy: simulateFlyerCopy(service, variant, tone),
      service,
      church,
      variant,
      tone,
    };
  }
}
