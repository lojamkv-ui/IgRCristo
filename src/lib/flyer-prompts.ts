import { formatLongDate, formatTime, weekdayName } from "./format";
import type { ChurchProfile, ServiceItem } from "./types";
import type { FlyerFormat } from "./draw-flyer";
import { cinematicFromPrompt, type CinematicId } from "./cinematic";

export type CanvasPromptKind = "texto" | "fundo";

export type CanvasPrompt = {
  id: string;
  kind: CanvasPromptKind;
  label: string;
  note: string;
  /** Texto-base, no estilo Canva/ChatGPT, com chaves {{campo}}. */
  template: string;
};

export const CANVAS_PROMPTS: CanvasPrompt[] = [
  {
    id: "texto-culto",
    kind: "texto",
    label: "Prompt 1 · Textos do flyer",
    note: "Designer de mídias sociais para igrejas. Gera título, data, preletor, versículo e local.",
    template: `Aja como um designer especialista em mídias sociais para igrejas. Crie os textos para um flyer de culto {{quando}}. Precisa conter: Título chamativo (ex: Culto da Família ou Noite de Milagres), data e horário, nome do preletor/pastor, frase de efeito ou versículo curto, e local/transmissão online. Seja objetivo e use linguagem inspiradora.

DADOS REAIS DESTE CULTO — não inventar, não alterar, não completar:
- Igreja: {{igreja}}
- Culto: {{titulo}}
- Tema: {{tema}}
- Data: {{data}} ({{diaSemana}})
- Horário: {{hora}}
- Dirigente: {{dirigente}}
- Pregador / preletor: {{pregador}}
- Cantores: {{cantores}}
- Intercessores: {{intercessores}}
- Local: {{endereco}}
- Contato: {{telefone}} · {{email}}
- Pastor presidente: {{pastor}}
- CNPJ: {{cnpj}}
- Formato do cartaz: {{formato}}

REGRAS:
- Português do Brasil, tom inspirador e objetivo.
- Sem promessa de milagre, sem culpa, sem excesso de maiúsculas.
- O versículo deve ser real, curto e com referência.
- A headline deve ter no máximo 8 palavras.
- O convite deve ter no máximo 2 frases.
- Não repita endereço, CNPJ ou telefone no convite: o cartaz já imprime isso.

Responda APENAS um JSON válido, sem markdown:
{
  "headline": "string",
  "verseReference": "string",
  "verseText": "string",
  "invitation": "string",
  "hashtags": ["string", "string", "string", "string"]
}`,
  },
  {
    id: "fundo-cinematografico",
    kind: "fundo",
    label: "Prompt 2 · Fundo cinematográfico",
    note: "Retrato 1080×1350, azul escuro e dourado, feixes de luz, fumaça e centro livre.",
    template: `Crie um fundo moderno para flyer de culto evangélico no formato retrato ({{largura}}x{{altura}}), estilo cinematográfico. Iluminação dramática em tons de azul escuro e dourado, feixes de luz cruzando a atmosfera, fumaça suave ao fundo, textura minimalista e espaço central livre para colocar a foto de um pregador e textos. Visual limpo, elegante e de alta qualidade.

Contexto do culto (não escrever texto no fundo):
- Igreja: {{igreja}}
- Culto: {{titulo}}
- Tema: {{tema}}
- Cores da igreja: vinho #4c1826 e dourado #e4c27a
- Sem pessoas, sem rosto, sem letras, sem logotipo, sem cruz grande ocupando o centro.
- O centro deve permanecer livre (zona segura) para a foto do pregador {{pregador}} e para os textos do culto.`,
  },
  {
    id: "texto-familia",
    kind: "texto",
    label: "Culto da Família",
    note: "Título chamativo no estilo “Culto da Família”, linguagem acolhedora.",
    template: `Aja como um designer especialista em mídias sociais para igrejas. Crie os textos para um flyer de Culto da Família {{quando}}. Precisa conter: título chamativo, data e horário, nome do preletor, versículo curto sobre casa/família, e o local. Linguagem inspiradora e acolhedora.

DADOS REAIS — não inventar:
Igreja {{igreja}} · {{titulo}} · {{tema}} · {{data}} {{hora}} · Preletor {{pregador}} · Dirige {{dirigente}} · {{endereco}} · {{pastor}}

Responda APENAS JSON: {"headline":"","verseReference":"","verseText":"","invitation":"","hashtags":["","","",""]}`,
  },
  {
    id: "fundo-palco",
    kind: "fundo",
    label: "Palco de adoração",
    note: "Busca no estilo Canva: palco, luz divina, textura escurecida.",
    template: `Crie um fundo cinematográfico para flyer evangélico, formato retrato {{largura}}x{{altura}}. Palco de adoração, luz divina caindo do alto, textura escurecida, fumaça baixa, contra-luz dourada. Espaço central livre para a foto do pregador {{pregador}}. Sem texto, sem pessoas, sem logotipo. Cores: azul-noite, dourado e um toque de vinho da igreja ({{igreja}}).`,
  },
];

export const CANVA_TIPS = [
  {
    title: "Formato ideal",
    text: "Post para Instagram (Retrato — 1080 × 1350 px). Ocupa mais tela no celular. No nosso canvas, é o Cartaz 4:5.",
  },
  {
    title: "Fundo (Background)",
    text: "No Canva, busque “textura escurecida”, “luz divina” ou “palco adoração”. Aqui, use o Prompt 2: o canvas pinta feixes, fumaça e deixa o centro livre.",
  },
  {
    title: "Foto do pregador",
    text: "Cadastre a foto no membro ou no culto. No Canva, remova o fundo e aplique uma sombra preta leve. No nosso flyer, o recorte circular já dá profundidade.",
  },
  {
    title: "Fontes",
    text: "No máximo duas: uma pesada para o título (Fraunces, no canvas) e uma limpa para horários (Outfit). No Canva, equivalentes: Playfair / Montserrat Black + Lato ou Roboto.",
  },
];

export type PromptContext = {
  church: ChurchProfile;
  service: ServiceItem;
  format: FlyerFormat;
};

export function fillCanvasPrompt(template: string, ctx: PromptContext) {
  const { church, service, format } = ctx;
  const size = format === "story" ? { w: 1080, h: 1920 } : { w: 1080, h: 1350 };
  const when =
    weekdayName(service.serviceDate) === "domingo"
      ? "de Domingo à Noite"
      : `de ${weekdayName(service.serviceDate)}`;
  const values: Record<string, string> = {
    quando: when,
    igreja: church.name,
    titulo: service.title,
    tema: service.theme || "não informado",
    data: formatLongDate(service.serviceDate),
    diaSemana: weekdayName(service.serviceDate),
    hora: formatTime(service.serviceTime),
    dirigente: service.leaderName,
    pregador: service.preacherName,
    cantores: service.singers.length ? service.singers.map((person) => person.name).join(", ") : "não informados",
    intercessores: service.intercessors.length ? service.intercessors.map((person) => person.name).join(", ") : "não informados",
    endereco: church.addressFull,
    telefone: church.phone,
    email: church.email,
    pastor: church.pastor,
    cnpj: church.cnpj,
    formato: format === "story" ? "status 1080x1920" : "cartaz 1080x1350",
    largura: String(size.w),
    altura: String(size.h),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

export function sceneFromFilledPrompt(prompt: string): CinematicId {
  return cinematicFromPrompt(prompt);
}
