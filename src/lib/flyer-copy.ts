import { formatLongDate, formatTime, weekdayName } from "./format";
import type { ChurchProfile, FlyerCopy, ServiceItem } from "./types";

/** Tons de redação disponíveis para o texto do flyer. */
export const FLYER_TONES = [
  { id: "acolhedor", label: "Acolhedor", note: "Convite caloroso, linguagem simples e próxima." },
  { id: "celebrativo", label: "Celebrativo", note: "Alegria e gratidão, sem exageros." },
  { id: "solene", label: "Solene", note: "Reverência e quietude, frases curtas." },
  { id: "jovem", label: "Jovem", note: "Direto, com energia e fé." },
  { id: "esperanca", label: "Esperança", note: "Consolo e ânimo para quem está cansado." },
] as const;

export type FlyerToneId = (typeof FLYER_TONES)[number]["id"];

export const DEFAULT_FLYER_TONE: FlyerToneId = "acolhedor";

export function isFlyerToneId(value: string): boolean {
  return FLYER_TONES.some((tone) => tone.id === value);
}

export function getFlyerTone(value: string | null | undefined): FlyerToneId {
  if (!value) return DEFAULT_FLYER_TONE;
  const found = FLYER_TONES.find((tone) => tone.id === value);
  return found ? found.id : DEFAULT_FLYER_TONE;
}

type Tone = FlyerToneId;

type VerseSeed = { ref: string; text: string; tags: string[]; tones: Tone[] };
type HeadlineSeed = { text: string; tags: string[]; tones: Tone[] };

const VERSES: VerseSeed[] = [
  { ref: "Salmos 100:2", text: "Servi ao Senhor com alegria e apresentai-vos a ele com cântico.", tags: ["louvor", "celebra"], tones: ["celebrativo", "acolhedor"] },
  { ref: "Salmos 122:1", text: "Alegrei-me quando me disseram: Vamos à casa do Senhor.", tags: ["convite", "culto"], tones: ["acolhedor", "celebrativo"] },
  { ref: "Isaías 55:6", text: "Buscai ao Senhor enquanto se pode achar, invocai-o enquanto está perto.", tags: ["oracao", "vigilia"], tones: ["solene", "esperanca"] },
  { ref: "Mateus 11:28", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", tags: ["acolhida"], tones: ["esperanca", "acolhedor"] },
  { ref: "João 4:24", text: "Deus é Espírito, e importa que os que o adoram o adorem em espírito e em verdade.", tags: ["ador", "doutrina"], tones: ["solene"] },
  { ref: "Colossenses 3:16", text: "A palavra de Cristo habite em vós abundantemente.", tags: ["doutrina", "ensino", "palavra"], tones: ["solene", "jovem"] },
  { ref: "1 Coríntios 11:26", text: "Todas as vezes que comerdes este pão e beberdes este cálice, anunciais a morte do Senhor.", tags: ["ceia", "santa"], tones: ["solene"] },
  { ref: "1 Timóteo 4:12", text: "Ninguém despreze a tua mocidade; sê o exemplo dos fiéis.", tags: ["jovens", "juventude"], tones: ["jovem"] },
  { ref: "Josué 24:15", text: "Eu e a minha casa serviremos ao Senhor.", tags: ["familia", "casais"], tones: ["acolhedor", "celebrativo"] },
  { ref: "Salmos 91:1", text: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.", tags: ["vigilia", "oracao"], tones: ["solene", "esperanca"] },
  { ref: "Efésios 5:19", text: "Cantando e louvando de coração ao Senhor.", tags: ["louvor", "cantor"], tones: ["celebrativo", "jovem"] },
  { ref: "Romanos 15:13", text: "O Deus da esperança vos encha de todo o gozo e paz na vossa fé.", tags: ["esperanca", "miss", "conferencia"], tones: ["esperanca", "celebrativo"] },
  { ref: "Lamentações 3:22", text: "As misericórdias do Senhor são a causa de não sermos consumidos.", tags: ["gratidao", "celebra"], tones: ["celebrativo", "esperanca"] },
  { ref: "Hebreus 10:25", text: "Não deixemos a nossa congregação, como é costume de alguns.", tags: ["convite", "culto"], tones: ["acolhedor"] },
];

const HEADLINES: HeadlineSeed[] = [
  { text: "Venha adorar conosco", tags: ["celebra", "culto", "ador"], tones: ["acolhedor", "celebrativo"] },
  { text: "Há um lugar para você", tags: ["convite", "acolhida"], tones: ["acolhedor", "esperanca"] },
  { text: "Uma noite para buscar a Deus", tags: ["oracao", "vigilia"], tones: ["solene"] },
  { text: "Celebre a ceia do Senhor", tags: ["ceia", "santa"], tones: ["solene"] },
  { text: "A Palavra vai falar hoje", tags: ["doutrina", "ensino", "palavra"], tones: ["solene", "jovem"] },
  { text: "Jovens, este é o seu tempo", tags: ["jovens", "juventude"], tones: ["jovem"] },
  { text: "Toda a casa, diante do Senhor", tags: ["familia", "casais"], tones: ["acolhedor", "celebrativo"] },
  { text: "Louvor que nos aproxima", tags: ["louvor", "cantor"], tones: ["celebrativo", "jovem"] },
  { text: "Deus renova as forças", tags: ["esperanca", "consolo"], tones: ["esperanca"] },
  { text: "Gratidão por tudo", tags: ["gratidao", "celebra"], tones: ["celebrativo"] },
];

const INVITATIONS: Record<Tone, string[]> = {
  acolhedor: [
    "Traga sua família. Chegue um pouco antes, alguém vai receber você na porta.",
    "Venha como está. Aqui há lugar para você e para quem você ama.",
  ],
  celebrativo: [
    "Vamos agradecer juntos o que Deus já fez. Chegue cedo e escolha seu lugar.",
    "Um culto para cantar, lembrar e celebrar. Esperamos você.",
  ],
  solene: [
    "Um tempo de silêncio, oração e Palavra. Venha preparar o coração.",
    "Diante do Senhor, em quietude. Chegue com tempo para orar.",
  ],
  jovem: [
    "Chama a galera e vem. Vai ter louvor, Palavra e gente de verdade.",
    "Sua presença importa. Vem cultuar com a gente.",
  ],
  esperanca: [
    "Se o ano pesou, venha descansar. Deus cuida de você.",
    "Um culto para quem precisa de ânimo. Você não está sozinho.",
  ],
};

function foldLoose(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function scoreTags(tags: string[], haystack: string) {
  return tags.reduce((total, tag) => (haystack.includes(tag) ? total + 2 : total), 0);
}

function pick<T>(items: T[], offset: number, pool: number) {
  if (!items.length) return undefined;
  const index = Math.abs(offset) % Math.min(pool, items.length);
  return items[index];
}

/** Composição local: escolhe versículo, headline e convite pelo tema do culto e pelo tom pedido. */
export function simulateFlyerCopy(
  service: Pick<ServiceItem, "title" | "theme" | "serviceDate" | "serviceTime">,
  variant = 0,
  tone: FlyerToneId = DEFAULT_FLYER_TONE,
): FlyerCopy {
  const haystack = foldLoose(`${service.title} ${service.theme ?? ""}`);
  const rank = <T extends { tags: string[]; tones: Tone[] }>(items: T[]) =>
    [...items].sort(
      (a, b) =>
        (b.tones.includes(tone) ? 3 : 0) - (a.tones.includes(tone) ? 3 : 0) ||
        scoreTags(b.tags, haystack) - scoreTags(a.tags, haystack) ||
        (b.tones.includes(tone) ? 0 : 0) ||
        a.tones[0]!.localeCompare(b.tones[0]!),
    );

  const verses = rank(VERSES);
  const heads = rank(HEADLINES);
  const verse = pick(verses, variant, 4) ?? VERSES[0]!;
  const headline = pick(heads, variant, 4) ?? HEADLINES[0]!;
  const invitationPool = INVITATIONS[tone] ?? INVITATIONS.acolhedor;
  const when = `${weekdayName(service.serviceDate)}, ${formatLongDate(service.serviceDate)}, às ${formatTime(service.serviceTime)}`;
  const subject = service.theme ? service.theme.charAt(0).toLowerCase() + service.theme.slice(1) : null;
  const invitation = [
    subject ? `Neste culto, ${subject}.` : "",
    `${pick(invitationPool, variant, invitationPool.length)} ${when}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline: headline.text,
    verseReference: verse.ref,
    verseText: verse.text,
    invitation,
    hashtags: ["RenascendoEmCristo", "Culto", "TrindadeGO", "Igreja"],
  };
}

export function buildFlyerPrompt(
  church: ChurchProfile,
  service: ServiceItem,
  format: "feed" | "story",
  tone: FlyerToneId = DEFAULT_FLYER_TONE,
) {
  const toneMeta = FLYER_TONES.find((item) => item.id === tone) ?? FLYER_TONES[0]!;
  const singers = service.singers.length
    ? service.singers.map((person) => `${person.name}${person.photoUrl ? " (com foto)" : " (sem foto)"}`).join("; ")
    : "não informados";
  const intercessors = service.intercessors.length ? service.intercessors.map((person) => person.name).join("; ") : "não informados";
  return `Você é redator de uma igreja evangélica brasileira. Escreva SOMENTE o texto criativo de um flyer de culto. Não altere fatos, não invente pessoas e não reescreva dados oficiais.

DADOS OFICIAIS DA IGREJA — usar exatamente como estão, sem corrigir, abreviar ou completar:
- Nome: ${church.name}
- Pastor: ${church.pastor}
- E-mail: ${church.email}
- Telefone: ${church.phone}
- CNPJ: ${church.cnpj}
- Endereço: ${church.addressFull}

DADOS DO CULTO — não inventar horário, tema ou nomes:
- Título: ${service.title}
- Data: ${formatLongDate(service.serviceDate)} (${weekdayName(service.serviceDate)})
- Hora: ${service.serviceTime}
- Tema: ${service.theme || "não informado"}
- Dirigente: ${service.leaderName}
- Pregador: ${service.preacherName}${service.preacherPhotoUrl ? " (foto disponível)" : " (sem foto)"}
- Cantores: ${singers}
- Intercessores: ${intercessors}
- Observações internas, que não devem ir para o cartaz se forem administrativas: ${service.notes || "nenhuma"}
- Formato: ${format === "story" ? "status 1080x1920" : "cartaz 1080x1350"}
- Tom desejado: ${toneMeta.label} — ${toneMeta.note}

REGRAS:
- Português do Brasil.
- Respeite o tom pedido acima sem cair em clichê nem em exagero.
- Sem sensacionalismo, sem promessa de milagre, sem culpa e sem excesso de maiúsculas.
- O versículo deve ser curto, real e com referência bíblica correta.
- A headline deve ter no máximo 8 palavras.
- O convite deve ter no máximo 2 frases e caber em um cartaz.
- Não repita o endereço, o CNPJ ou o telefone dentro do convite. O sistema já imprime esses dados.
- Não cite o tom escolhido como se fosse parte do texto.

Responda APENAS um JSON válido, sem markdown, com as chaves:
{
  "headline": "string",
  "verseReference": "string",
  "verseText": "string",
  "invitation": "string",
  "hashtags": ["string", "string", "string", "string"]
}`;
}

export function buildCaption(church: ChurchProfile, service: ServiceItem, copy: FlyerCopy) {
  const singers = service.singers.map((person) => person.name).join(", ");
  const intercessors = service.intercessors.map((person) => person.name).join(", ");
  const tags = copy.hashtags
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag.replace(/\s+/g, "")}`))
    .join(" ");
  return [
    copy.headline,
    "",
    `${service.title}${service.theme ? ` — ${service.theme}` : ""}`,
    `${weekdayName(service.serviceDate)}, ${formatLongDate(service.serviceDate)} · ${formatTime(service.serviceTime)}`,
    `Dirigente: ${service.leaderName}`,
    `Pregação: ${service.preacherName}`,
    singers ? `Louvor: ${singers}` : "",
    intercessors ? `Intercessão: ${intercessors}` : "",
    "",
    copy.invitation,
    `"${copy.verseText}" ${copy.verseReference}`,
    "",
    church.name,
    church.addressFull,
    `${church.phone} · ${church.email}`,
    church.pastor,
    "",
    tags,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function parseFlyerCopy(raw: string): FlyerCopy | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const headline = typeof record.headline === "string" ? record.headline.trim().slice(0, 90) : "";
  const verseReference = typeof record.verseReference === "string" ? record.verseReference.trim().slice(0, 48) : "";
  const verseText = typeof record.verseText === "string" ? record.verseText.trim().slice(0, 320) : "";
  const invitation = typeof record.invitation === "string" ? record.invitation.trim().slice(0, 360) : "";
  if (!headline || !verseReference || !verseText || !invitation) return null;
  const hashtags = Array.isArray(record.hashtags)
    ? record.hashtags.map((tag) => (typeof tag === "string" ? tag.trim().slice(0, 40) : "")).filter(Boolean).slice(0, 6)
    : [];
  return { headline, verseReference, verseText, invitation, hashtags };
}
