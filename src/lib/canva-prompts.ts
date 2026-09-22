/**
 * Biblioteca de prompts prontos para o Canva (Magic Write, Magic Media e Magic Studio).
 *
 * Cada prompt é preenchido com os dados reais do culto e da igreja.
 * O usuário copia, cola no Canva e gera o texto ou o fundo — sem precisar
 * reescrever nada.
 */

import type { FlyerCopy } from "@/lib/flyer-prompt";
import type { FlyerTheme } from "@/lib/flyer-themes";
import { getTheme } from "@/lib/flyer-themes";

export type CanvaPromptKind = "texto" | "fundo" | "studio" | "colar";

export type CanvaBackgroundStyle = {
  id: string;
  label: string;
  description: string;
  searchTerms: string[];
  prompt: string;
};

export type CanvaPromptPack = {
  textPrompt: string;
  backgroundPrompt: string;
  studioPrompt: string;
  readyCopy: string;
  tips: string[];
  searchTerms: string[];
  style: CanvaBackgroundStyle;
};

export type CanvaPromptContext = {
  title: string;
  kind: string | null;
  theme: string | null;
  scripture: string | null;
  dateBR: string;
  dateLong: string;
  time: string;
  leader: string;
  preacherName: string | null;
  singers: string[];
  intercessors: string[];
  churchName: string;
  president: string | null;
  addressFull: string;
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  copy: FlyerCopy;
  paletteId?: string | null;
  format: { width: number; height: number; label: string };
};

const KIND_TITLES: Record<string, string[]> = {
  "Santa Ceia": ["Ceia do Senhor", "Mesa Preparada", "Comunhão e Graça"],
  Vigília: ["Noite de Poder", "Vigília de Fogo", "Madrugada com Deus"],
  "Culto de Oração": ["Casa de Oração", "Clamor e Resposta", "Tempo de Buscar"],
  "Escola Bíblica Dominical": ["Palavra que Edifica", "Escola da Fé", "Crescendo na Palavra"],
  "Culto de Jovens": ["Geração Renovada", "Jovens com Propósito", "Fogo da Juventude"],
  "Culto de Senhoras": ["Mulheres de Fé", "Senhoras do Senhor", "Mulher Virtuosa"],
  "Culto de Homens": ["Homens de Valor", "Varões de Deus", "Homens de Fé"],
  "Culto de Missões": ["Ide por Todo o Mundo", "Corações Enviados", "Missões"],
  Batismo: ["Novo Nascimento", "Águas da Fé", "Batismo nas Águas"],
  Casamento: ["Aliança de Amor", "Unidos por Deus", "Dois se tornam um"],
  "Culto de Celebração": ["Culto da Família", "Noite de Milagres", "Encontro com Deus"],
  "Culto de Doutrina": ["Fundamento da Fé", "Palavra Viva", "Doutrina que Edifica"],
};

export const CANVA_BACKGROUND_STYLES: CanvaBackgroundStyle[] = [
  {
    id: "cinematic",
    label: "Cinematográfico",
    description: "Azul escuro e dourado, feixes de luz e fumaça — o estilo clássico de palco.",
    searchTerms: ["luz divina", "palco adoração", "fumaça dourada", "textura escurecida"],
    prompt:
      "Crie um fundo moderno para flyer de culto evangélico no formato retrato ({size}), estilo cinematográfico. Iluminação dramática em tons de azul escuro e dourado, feixes de luz cruzando a atmosfera, fumaça suave ao fundo, textura minimalista e espaço central livre para colocar a foto de um pregador e textos. Visual limpo, elegante e de alta qualidade. Sem pessoas, sem texto, sem logotipo, sem marcas d'água.",
  },
  {
    id: "worship",
    label: "Palco de adoração",
    description: "Palco vazio com luzes quentes, névoa e cruz sutil ao fundo.",
    searchTerms: ["palco igreja", "luzes de palco", "cruz luz", "adoração"],
    prompt:
      "Crie um fundo para flyer de culto evangélico no formato retrato ({size}). Palco de adoração vazio, iluminação quente em âmbar e dourado, névoa suave, cruz luminosa desfocada ao fundo, piso reflexivo, espaço central livre para foto do pregador. Estilo fotográfico cinematográfico, alta qualidade, sem pessoas e sem texto.",
  },
  {
    id: "holy-light",
    label: "Luz divina",
    description: "Raios de luz descendo do alto, atmosfera celestial e reverente.",
    searchTerms: ["raios de luz", "luz divina", "céu dourado", "atmosfera celestial"],
    prompt:
      "Crie um fundo para flyer de igreja evangélica no formato retrato ({size}). Raios de luz dourada descendo do alto sobre um fundo azul-noite profundo, partículas de poeira iluminadas, atmosfera celestial e reverente, espaço amplo no centro e na parte inferior para foto e textos. Sem pessoas, sem texto, visual premium.",
  },
  {
    id: "family",
    label: "Família / aconchego",
    description: "Tons quentes de creme e âmbar — ideal para Culto da Família.",
    searchTerms: ["luz quente", "textura creme", "amanhecer dourado", "acolhedor"],
    prompt:
      "Crie um fundo acolhedor para flyer de Culto da Família no formato retrato ({size}). Tons quentes de creme, âmbar e dourado suave, luz de amanhecer, textura de tecido leve, espaço central livre para foto e textos. Visual limpo, elegante, convidativo. Sem pessoas e sem texto.",
  },
  {
    id: "youth",
    label: "Jovens",
    description: "Contraste forte, neon suave e energia — Culto de Jovens.",
    searchTerms: ["neon suave", "luz roxa", "palco jovem", "energia"],
    prompt:
      "Crie um fundo moderno para flyer de Culto de Jovens evangélico no formato retrato ({size}). Contraste forte em roxo profundo, azul elétrico e detalhes dourados, luzes de palco, energia contemporânea, espaço central livre para foto. Visual limpo e de alta qualidade, sem pessoas e sem texto.",
  },
  {
    id: "communion",
    label: "Santa Ceia",
    description: "Mesa, pão e cálice em luz dourada suave — reverente.",
    searchTerms: ["santa ceia", "cálice dourado", "pão e vinho", "mesa da ceia"],
    prompt:
      "Crie um fundo reverente para flyer de Santa Ceia no formato retrato ({size}). Mesa da ceia em silhueta suave, pão e cálice iluminados por luz dourada, fundo vinho profundo, fumaça leve, espaço superior e central livres para textos e foto. Visual elegante, sem pessoas e sem texto.",
  },
  {
    id: "prayer",
    label: "Oração / vigília",
    description: "Noite profunda, estrelas e uma chama de vela.",
    searchTerms: ["vela", "noite estrelada", "oração", "vigília"],
    prompt:
      "Crie um fundo contemplativo para flyer de vigília e oração no formato retrato ({size}). Noite profunda azul-marinho, estrelas suaves, uma chama de vela desfocada, feixe de luz vertical, espaço central livre. Visual cinematográfico, limpo, sem pessoas e sem texto.",
  },
];

const CANVA_TIPS = [
  "Formato ideal: Post para Instagram (Retrato · 1080 × 1350 px) — ocupa mais tela no celular. Stories: 1080 × 1920 px.",
  "Fundo: no Canva, busque por “textura escurecida”, “luz divina”, “palco adoração” ou “fumaça dourada”. Ou cole o Prompt 2 em Magic Media.",
  "Foto do pregador: remova o fundo (BG Remover) e aplique uma sombra preta suave atrás para dar profundidade.",
  "Fontes: no máximo duas — uma pesada/moderna no título (Montserrat Black, Anton, Bebas Neue) e uma limpa nos horários (Roboto, Lato, Inter).",
  "Hierarquia: título grande no terço superior → foto do pregador no centro → data/hora em faixa → rodapé com endereço e contato.",
  "Contraste: texto claro sobre fundo escuro (ou o inverso). Evite dourado fino em fundo claro — some na tela do celular.",
  "Rodapé obrigatório: nome da igreja, pastor presidente, endereço, telefone, e-mail e CNPJ em corpo pequeno e legível.",
  "Exportar: PNG (melhor qualidade) ou PDF padrão para impressão. Marque “ achatar ” se for enviar para WhatsApp.",
];

function suggestedTitles(kind: string | null, theme: string | null): string {
  if (theme && theme.length <= 32) return theme;
  const list = KIND_TITLES[kind ?? ""] ?? KIND_TITLES["Culto de Celebração"];
  return list.join(", ");
}

function styleForKind(kind: string | null, paletteId?: string | null): CanvaBackgroundStyle {
  const k = (kind ?? "").toLowerCase();
  if (k.includes("ceia")) return CANVA_BACKGROUND_STYLES.find((s) => s.id === "communion")!;
  if (k.includes("joven")) return CANVA_BACKGROUND_STYLES.find((s) => s.id === "youth")!;
  if (k.includes("família") || k.includes("familia") || k.includes("celebra"))
    return CANVA_BACKGROUND_STYLES.find((s) => s.id === "family")!;
  if (k.includes("ora") || k.includes("vigíl") || k.includes("vigil"))
    return CANVA_BACKGROUND_STYLES.find((s) => s.id === "prayer")!;
  if (paletteId === "dawn") return CANVA_BACKGROUND_STYLES.find((s) => s.id === "family")!;
  if (paletteId === "night") return CANVA_BACKGROUND_STYLES.find((s) => s.id === "prayer")!;
  if (paletteId === "forest") return CANVA_BACKGROUND_STYLES.find((s) => s.id === "youth")!;
  return CANVA_BACKGROUND_STYLES[0];
}

export function getBackgroundStyle(id?: string | null, kind?: string | null, paletteId?: string | null): CanvaBackgroundStyle {
  return CANVA_BACKGROUND_STYLES.find((item) => item.id === id) ?? styleForKind(kind ?? null, paletteId);
}

/** Prompt 1 — Magic Write / ChatGPT: textos do flyer. */
export function buildCanvaTextPrompt(ctx: CanvaPromptContext): string {
  const kind = ctx.kind ?? "Culto";
  const titles = suggestedTitles(ctx.kind, ctx.theme);
  const lines = [
    "Aja como um designer especialista em mídias sociais para igrejas.",
    `Crie os textos para um flyer de ${kind}.`,
    "Precisa conter:",
    `- Título chamativo (sugestões para este culto: ${titles})`,
    `- Data e horário: ${ctx.dateLong}, às ${ctx.time}`,
    `- Nome do preletor/pastor: ${ctx.preacherName ?? "a confirmar"}`,
    `- Dirigente: ${ctx.leader}`,
    ctx.singers.length > 0 ? `- Louvor: ${ctx.singers.join(", ")}` : null,
    ctx.intercessors.length > 0 ? `- Intercessores: ${ctx.intercessors.join(", ")}` : null,
    `- Frase de efeito ou versículo curto${ctx.scripture ? ` (base: ${ctx.scripture})` : ctx.copy.verseReference ? ` (sugestão: ${ctx.copy.verseReference})` : ""}`,
    `- Local / transmissão: ${ctx.churchName} · ${ctx.addressFull}`,
    ctx.phone ? `- Contato: ${ctx.phone}` : null,
    "Seja objetivo e use linguagem inspiradora.",
    "Entregue em português do Brasil, pronto para colar no Canva, neste formato:",
    "",
    "TÍTULO:",
    "SUBTÍTULO:",
    "DATA E HORA:",
    "PREGADOR:",
    "VERSÍCULO:",
    "CHAMADA:",
    "RODAPÉ:",
    "",
    "Não invente nomes, endereços, telefones ou CNPJ diferentes dos dados acima.",
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

/** Prompt 2 — Magic Media: fundo cinematográfico (ou o estilo escolhido). */
export function buildCanvaBackgroundPrompt(ctx: CanvaPromptContext, style?: CanvaBackgroundStyle): string {
  const chosen = style ?? styleForKind(ctx.kind, ctx.paletteId);
  const size = `${ctx.format.width}x${ctx.format.height}`;
  const extras = [
    `Tema do culto: ${ctx.kind ?? ctx.title}${ctx.theme ? ` — “${ctx.theme}”` : ""}.`,
    `Deixe o terço central e a faixa inferior livres (foto do pregador${ctx.preacherName ? ` ${ctx.preacherName}` : ""} + textos).`,
  ];
  return `${chosen.prompt.replace("{size}", size)} ${extras.join(" ")}`;
}

/** Prompt único para o Magic Studio do Canva (texto + layout + fundo). */
export function buildCanvaStudioPrompt(ctx: CanvaPromptContext, style?: CanvaBackgroundStyle): string {
  const chosen = style ?? styleForKind(ctx.kind, ctx.paletteId);
  const theme: FlyerTheme = getTheme(ctx.paletteId);
  return [
    "Crie um flyer de culto evangélico brasileiro, visual premium, no Canva.",
    `Formato: ${ctx.format.label} (${ctx.format.width}×${ctx.format.height} px, retrato).`,
    `Culto: ${ctx.title}${ctx.kind ? ` · ${ctx.kind}` : ""}${ctx.theme ? ` · tema “${ctx.theme}”` : ""}.`,
    `Data: ${ctx.dateLong}. Horário: ${ctx.time}.`,
    `Pregador: ${ctx.preacherName ?? "a confirmar"}. Dirigente: ${ctx.leader}.`,
    ctx.singers.length > 0 ? `Louvor: ${ctx.singers.join(", ")}.` : "",
    `Igreja: ${ctx.churchName}. ${ctx.president ?? ""}.`,
    `Endereço: ${ctx.addressFull}. Contato: ${ctx.phone ?? ""}. E-mail: ${ctx.email ?? ""}. CNPJ: ${ctx.cnpj ?? ""}.`,
    `Estilo visual: ${chosen.label.toLowerCase()} — ${chosen.description}`,
    `Cores: fundo ${theme.background[0]}, destaque ${theme.accent}, texto ${theme.text}.`,
    "Composição: título no terço superior, foto do pregador com fundo removido e sombra suave no centro, data/hora em faixa, rodapé institucional pequeno.",
    "Tipografia: no máximo duas fontes (pesada no título, limpa nos horários). Sem erros, sem marcas d'água.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Textos já prontos para colar nos elementos do Canva (sem precisar do Magic Write). */
export function buildReadyCopy(ctx: CanvaPromptContext): string {
  return [
    `TÍTULO: ${ctx.copy.headline}`,
    `SUBTÍTULO: ${ctx.title}${ctx.kind ? ` · ${ctx.kind}` : ""}`,
    ctx.theme ? `TEMA: ${ctx.theme}` : null,
    `DATA E HORA: ${ctx.dateBR} · ${ctx.time}`,
    `DATA POR EXTENSO: ${ctx.dateLong}`,
    `PREGADOR: ${ctx.preacherName ?? "A confirmar"}`,
    `DIRIGENTE: ${ctx.leader}`,
    ctx.singers.length > 0 ? `LOUVOR: ${ctx.singers.join(", ")}` : null,
    ctx.intercessors.length > 0 ? `INTERCESSORES: ${ctx.intercessors.join(", ")}` : null,
    `VERSÍCULO: “${ctx.copy.verse}”`,
    `REFERÊNCIA: ${ctx.copy.verseReference}`,
    `CHAMADA: ${ctx.copy.callToAction}`,
    `IGREJA: ${ctx.churchName}`,
    ctx.president ? `PRESIDENTE: ${ctx.president}` : null,
    `LOCAL: ${ctx.addressFull}`,
    ctx.phone ? `CONTATO: ${ctx.phone}` : null,
    ctx.email ? `E-MAIL: ${ctx.email}` : null,
    ctx.cnpj ? `CNPJ: ${ctx.cnpj}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildCanvaPromptPack(
  ctx: CanvaPromptContext,
  styleId?: string | null,
): CanvaPromptPack {
  const style = getBackgroundStyle(styleId, ctx.kind, ctx.paletteId);
  return {
    textPrompt: buildCanvaTextPrompt(ctx),
    backgroundPrompt: buildCanvaBackgroundPrompt(ctx, style),
    studioPrompt: buildCanvaStudioPrompt(ctx, style),
    readyCopy: buildReadyCopy(ctx),
    tips: CANVA_TIPS,
    searchTerms: style.searchTerms,
    style,
  };
}
