import type { Service, Settings } from "@/db/schema";
import { fullAddress } from "@/lib/church";
import { formatDateBR, formatLongDate, formatTimeBR } from "@/lib/format";
import { getTheme } from "@/lib/flyer-themes";

export type FlyerCopy = {
  headline: string;
  subtitle: string;
  verse: string;
  verseReference: string;
  callToAction: string;
  hashtags: string[];
  socialCaption: string;
  palette: { background: string; accent: string; text: string };
  layoutNotes: string[];
};

const VERSES: Array<{ text: string; ref: string }> = [
  { text: "O Senhor é a minha luz e a minha salvação; a quem temerei?", ref: "Salmos 27.1" },
  { text: "Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.", ref: "Romanos 12.12" },
  { text: "Porque onde estiverem dois ou três reunidos em meu nome, aí estou eu no meio deles.", ref: "Mateus 18.20" },
  { text: "Renova-me, Senhor, e faz brotar vida nova em meu coração.", ref: "Salmos 51.10" },
  { text: "Buscai primeiro o reino de Deus e a sua justiça.", ref: "Mateus 6.33" },
  { text: "A tua palavra é lâmpada para os meus pés e luz para o meu caminho.", ref: "Salmos 119.105" },
  { text: "Grande é o Senhor e mui digno de louvor.", ref: "Salmos 145.3" },
  { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", ref: "Mateus 11.28" },
];

const HEADLINES: Record<string, string[]> = {
  "Santa Ceia": ["Mesa Preparada", "Ceia do Senhor", "Comunhão e Graça"],
  Vigília: ["Noite de Poder", "Vigília de Oração", "Madrugada com Deus"],
  "Culto de Oração": ["Clamor e Resposta", "Casa de Oração", "Tempo de Buscar"],
  "Escola Bíblica Dominical": ["Palavra que Edifica", "Escola Bíblica", "Crescendo na Palavra"],
  "Culto de Jovens": ["Geração Renovada", "Jovens com Propósito", "Fogo da Juventude"],
  Batismo: ["Novo Nascimento", "Águas da Fé", "Batismo nas Águas"],
  Casamento: ["Aliança de Amor", "Unidos por Deus", "Casamento"],
  "Culto de Missões": ["Ide por Todo Mundo", "Corações Enviados", "Missões"],
  "Culto de Senhoras": ["Mulheres de Fé", "Senhoras do Senhor", "Mulher Virtuosa"],
  "Culto de Homens": ["Homens de Valor", "Varões de Deus", "Homens de Fé"],
};



/** Hash determinístico simples para escolher variações sem repetir à toa. */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) % 100000;
  }
  return Math.abs(h);
}

function describePeople(service: Service): string {
  const singers = (service.singers ?? [])
    .map((s) => s.name)
    .filter(Boolean)
    .join(", ");
  const intercessors = (service.intercessors ?? []).filter(Boolean).join(", ");

  return [
    `Dirigente: ${service.leader}`,
    service.preacherName ? `Pregador: ${service.preacherName}` : "Pregador: a confirmar",
    singers ? `Cantores: ${singers}` : "Cantores: não informados",
    intercessors ? `Intercessores: ${intercessors}` : "Intercessores: não informados",
  ].join("\n");
}

function describePhotos(service: Service): string {
  const lines: string[] = [];
  lines.push(
    service.preacherPhoto
      ? `Foto do pregador (${service.preacherName ?? "pregador"}): disponível — usar em destaque, recorte circular com borda dourada.`
      : "Foto do pregador: indisponível — usar monograma com as iniciais.",
  );
  const singers = service.singers ?? [];
  if (singers.length === 0) {
    lines.push("Cantores: nenhum informado.");
  } else {
    singers.forEach((singer) => {
      lines.push(
        singer.photo
          ? `Foto do(a) cantor(a) ${singer.name}: disponível — recorte circular menor, alinhado em linha.`
          : `Foto do(a) cantor(a) ${singer.name}: indisponível — usar monograma com iniciais.`,
      );
    });
  }
  return lines.join("\n");
}

/** Prompt textual detalhado enviado ao ChatGPT para gerar o conteúdo do flyer. */
export function buildFlyerPrompt(service: Service, church: Settings): string {
  const kind = service.kind ?? "Culto";
  return [
    "Você é diretor de arte e redator de uma igreja evangélica brasileira.",
    "Crie o conteúdo textual de um FLYER DE DIVULGAÇÃO DE CULTO, em português do Brasil, tom acolhedor, reverente e convidativo.",
    "",
    "=== DADOS DO CULTO ===",
    `Título do culto: ${service.title}`,
    `Tipo: ${kind}`,
    `Data: ${formatLongDate(service.serviceDate)} (${formatDateBR(service.serviceDate)})`,
    `Horário: ${formatTimeBR(service.serviceTime)}`,
    service.theme ? `Tema: ${service.theme}` : "Tema: livre",
    service.scripture ? `Texto bíblico base: ${service.scripture}` : "Texto bíblico base: escolha um adequado",
    "",
    "=== ESCALA MINISTERIAL ===",
    describePeople(service),
    "",
    "=== FOTOS DISPONÍVEIS ===",
    describePhotos(service),
    "",
    "=== DADOS DA IGREJA (obrigatórios no rodapé) ===",
    `Igreja: ${church.churchName}`,
    `${church.president}`,
    `Endereço: ${fullAddress(church)}`,
    `Contato: ${church.phone ?? ""}`,
    `E-mail: ${church.email ?? ""}`,
    `CNPJ: ${church.cnpj ?? ""}`,
    "",
    "=== ENTREGA ===",
    "Responda APENAS com um JSON válido, sem markdown, com exatamente estas chaves:",
    '{ "headline": string (máx. 4 palavras, impacto), "subtitle": string (máx. 12 palavras), "verse": string (texto bíblico), "verseReference": string (livro capítulo.versículo), "callToAction": string (máx. 8 palavras), "hashtags": string[] (5 itens), "socialCaption": string (legenda para WhatsApp/Instagram, máx. 320 caracteres, com 1 emoji), "layoutNotes": string[] (4 instruções visuais para o designer) }',
    "Não invente endereços, telefones, CNPJ ou nomes diferentes dos fornecidos acima.",
  ].join("\n");
}

/** Prompt visual para um modelo de imagem (usado quando há API de imagens habilitada). */
export function buildImagePrompt(service: Service, church: Settings): string {
  const kind = service.kind ?? "Culto";
  return [
    "Flyer vertical 1080x1920 para igreja evangélica brasileira, design premium, elegante e limpo.",
    `Evento: ${service.title} — ${kind}, ${formatDateBR(service.serviceDate)} às ${formatTimeBR(service.serviceTime)}.`,
    `Ministério: ${describePeople(service).replace(/\n/g, " | ")}.`,
    `Igreja: ${church.churchName}. Rodapé com endereço ${fullAddress(church)}, contato ${church.phone ?? ""}, CNPJ ${church.cnpj ?? ""}.`,
    "Estilo: fundo em degradê profundo, tipografia serifada moderna para o título, detalhes em dourado, luz suave ao centro, espaço reservado circular para foto do pregador e miniaturas circulares para os cantores.",
    "Sem erros ortográficos, sem marcas d'água, sem elementos de outras religiões.",
  ].join(" ");
}

/** Fallback local determinístico — garante que o flyer funcione sem chave de API. */
export function simulateFlyerCopy(service: Service, church: Settings): FlyerCopy {
  const kind = service.kind ?? "Culto";
  const seed = hash(`${service.id}-${service.serviceDate}-${service.title}`);
  const headlines = HEADLINES[kind] ?? ["Encontro com Deus", "Tempo de Renovo", "Culto ao Senhor"];
  const headline = service.theme && service.theme.length <= 28 ? service.theme : headlines[seed % headlines.length];
  const verseItem = VERSES[seed % VERSES.length];
  const singers = (service.singers ?? []).map((s) => s.name).filter(Boolean);
  const themeDef = getTheme(church.flyerPalette);
  const palette = { background: themeDef.background[0], accent: themeDef.accent, text: themeDef.text };

  const subtitleParts = [
    `${formatDateBR(service.serviceDate)} · ${formatTimeBR(service.serviceTime)}`,
    `Dirigente: ${service.leader}`,
    service.preacherName ? `Pregador: ${service.preacherName}` : null,
    singers.length > 0 ? `Louvor: ${singers.join(", ")}` : null,
  ].filter(Boolean) as string[];

  const socialCaption = [
    `🙌 ${service.title} — ${kind}.`,
    `${formatLongDate(service.serviceDate)}, às ${formatTimeBR(service.serviceTime)}.`,
    service.preacherName ? `Palavra: ${service.preacherName}.` : null,
    `Dirigente: ${service.leader}.`,
    `${church.churchName} · ${church.address ?? ""}, ${church.city ?? ""}.`,
    `Informações: ${church.phone ?? ""}`,
    "Você e sua família são nossos convidados!",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline,
    subtitle: subtitleParts.join(" · "),
    verse: verseItem.text,
    verseReference: verseItem.ref,
    callToAction: "Venha adorar conosco!",
    hashtags: ["#RenascendoEmCristo", `#${kind.replace(/[^A-Za-zÀ-ÿ0-9]/g, "")}`, "#Culto", "#TrindadeGO", "#Fé"],
    socialCaption: socialCaption.slice(0, 420),
    palette,
    layoutNotes: [
      "Título centralizado no terço superior, com brilho suave e hierarquia forte.",
      service.preacherPhoto
        ? "Foto do pregador em círculo de 320px com anel dourado, acima do nome."
        : "Monograma circular com as iniciais do pregador, acima do nome.",
      singers.length > 0
        ? "Linha de miniaturas circulares (96px) para os cantores, com nomes abaixo."
        : "Bloco de louvor apenas tipográfico.",
      `Rodapé com ${church.churchName}, endereço completo, CNPJ, contato e e-mail em corpo pequeno e legível.`,
    ],
  };
}

export function parseFlyerCopy(raw: unknown, fallback: FlyerCopy): FlyerCopy {
  if (typeof raw !== "object" || raw === null) return fallback;
  const value = raw as Record<string, unknown>;
  const text = (key: string, def: string) => {
    const v = value[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : def;
  };
  const array = (key: string, def: string[]) => {
    const v = value[key];
    return Array.isArray(v) && v.length > 0 ? v.map((item) => String(item)).filter(Boolean) : def;
  };
  const rawPalette =
    typeof value.palette === "object" && value.palette !== null
      ? (value.palette as Record<string, unknown>)
      : null;
  const color = (key: keyof FlyerCopy["palette"]): string => {
    const candidate = rawPalette ? rawPalette[key] : null;
    return typeof candidate === "string" && /^#[0-9a-f]{6}$/i.test(candidate.trim())
      ? candidate.trim()
      : fallback.palette[key];
  };
  const palette = { background: color("background"), accent: color("accent"), text: color("text") };

  return {
    headline: text("headline", fallback.headline).slice(0, 60),
    subtitle: text("subtitle", fallback.subtitle).slice(0, 160),
    verse: text("verse", fallback.verse).slice(0, 240),
    verseReference: text("verseReference", fallback.verseReference).slice(0, 60),
    callToAction: text("callToAction", fallback.callToAction).slice(0, 80),
    hashtags: array("hashtags", fallback.hashtags).slice(0, 8),
    socialCaption: text("socialCaption", fallback.socialCaption).slice(0, 500),
    palette,
    layoutNotes: array("layoutNotes", fallback.layoutNotes).slice(0, 8),
  };
}
