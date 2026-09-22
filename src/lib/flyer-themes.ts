/**
 * Catálogo de temas visuais do flyer.
 * Pure data: pode ser importado pelo client (seletores) e pelo desenho no canvas.
 */

export type FlyerThemeId = "classico" | "noite" | "manha" | "sepia" | "realeza" | "oliveira" | "grafite";

export type FlyerTexture = "rings" | "burst" | "grain" | "bands" | "dots" | "vignette";
export type FlyerOrnament = "arc" | "bracket" | "line" | "dots" | "cross";

export type FlyerTheme = {
  id: FlyerThemeId;
  label: string;
  note: string;
  /** True quando a área principal do cartaz é escura (inverte leitura de contraste). */
  dark: boolean;
  /** Paradas do degradê vertical da área principal. */
  bg: [string, string, string];
  /** Cor principal do texto sobre a área principal. */
  text: string;
  /** Cor de destaque (dourado, prata, âmbar…). */
  accent: string;
  /** Versão mais densa do destaque, para traços finos. */
  accentDeep: string;
  cardFill: string;
  cardStroke: string;
  photoRing: string;
  fallbackFill: string;
  footerBg: string;
  footerInk: string;
  footerMuted: string;
  footerRule: string;
  /** Três cores para a bolinha de pré-visualização no seletor. */
  swatch: [string, string, string];
  texture: FlyerTexture;
  ornament: FlyerOrnament;
};

export const FLYER_THEMES: FlyerTheme[] = [
  {
    id: "classico",
    label: "Clássico Sede",
    note: "Vinho profundo com dourado, moldura dupla e arco no alto. O padrão da casa.",
    dark: true,
    bg: ["#6a2433", "#4c1826", "#2b0d16"],
    text: "#f7f1e6",
    accent: "#e4c27a",
    accentDeep: "#b8893d",
    cardFill: "rgba(255,250,244,0.08)",
    cardStroke: "rgba(228,194,122,0.45)",
    photoRing: "#e4c27a",
    fallbackFill: "#6a2a38",
    footerBg: "#f7f1e6",
    footerInk: "#2a1618",
    footerMuted: "#6f5b55",
    footerRule: "#4c1826",
    swatch: ["#6a2433", "#e4c27a", "#f7f1e6"],
    texture: "rings",
    ornament: "arc",
  },
  {
    id: "noite",
    label: "Noite de Oração",
    note: "Azul de vigília com feixes de luz e prata. Bom para quinta e santa ceia.",
    dark: true,
    bg: ["#1b2c56", "#132043", "#080f24"],
    text: "#eef2fb",
    accent: "#9fc4ff",
    accentDeep: "#5f8fd8",
    cardFill: "rgba(255,255,255,0.07)",
    cardStroke: "rgba(159,196,255,0.4)",
    photoRing: "#9fc4ff",
    fallbackFill: "#243a6b",
    footerBg: "#eef2fb",
    footerInk: "#101a33",
    footerMuted: "#5b6b8c",
    footerRule: "#1b2c56",
    swatch: ["#1b2c56", "#9fc4ff", "#eef2fb"],
    texture: "burst",
    ornament: "line",
  },
  {
    id: "manha",
    label: "Manhã de Louvor",
    note: "Fundo claro com grão de papel e dourado queimado. Leve para cultos diurnos.",
    dark: false,
    bg: ["#fdf7ec", "#f6ecd9", "#efd9bb"],
    text: "#33231a",
    accent: "#8a6320",
    accentDeep: "#6b4c17",
    cardFill: "rgba(107,76,23,0.07)",
    cardStroke: "rgba(138,99,32,0.38)",
    photoRing: "#b8893d",
    fallbackFill: "#e6d3b3",
    footerBg: "#3a121c",
    footerInk: "#f7f1e6",
    footerMuted: "#d6c3ae",
    footerRule: "#e4c27a",
    swatch: ["#f6ecd9", "#b8893d", "#3a121c"],
    texture: "grain",
    ornament: "arc",
  },
  {
    id: "sepia",
    label: "Sépia Vintage",
    note: "Papel envelhecido, marrom e creme. Combina com aniversário e conferência.",
    dark: false,
    bg: ["#ecdfc6", "#ddc9a3", "#c6ab7d"],
    text: "#33261a",
    accent: "#7d5a2a",
    accentDeep: "#5d4220",
    cardFill: "rgba(93,66,32,0.08)",
    cardStroke: "rgba(125,90,42,0.42)",
    photoRing: "#8a6a3c",
    fallbackFill: "#cbb489",
    footerBg: "#3b2a19",
    footerInk: "#f3e8d4",
    footerMuted: "#d8c4a2",
    footerRule: "#c8a366",
    swatch: ["#e3d3b4", "#8a6a3c", "#3b2a19"],
    texture: "grain",
    ornament: "cross",
  },
  {
    id: "realeza",
    label: "Realeza",
    note: "Roxo profundo com lavanda e faixas diagonais. Solene e forte.",
    dark: true,
    bg: ["#3d1a52", "#2b1040", "#160722"],
    text: "#f6effb",
    accent: "#dcc2ff",
    accentDeep: "#9a72c9",
    cardFill: "rgba(255,255,255,0.07)",
    cardStroke: "rgba(220,194,255,0.42)",
    photoRing: "#dcc2ff",
    fallbackFill: "#4d2263",
    footerBg: "#f6effb",
    footerInk: "#1f0b2e",
    footerMuted: "#6b5a7a",
    footerRule: "#3d1a52",
    swatch: ["#3d1a52", "#dcc2ff", "#f6effb"],
    texture: "bands",
    ornament: "bracket",
  },
  {
    id: "oliveira",
    label: "Verde Oliveira",
    note: "Verde ramo com brilho suave. Servir para cultos de missões e famílias.",
    dark: true,
    bg: ["#274b38", "#1a3627", "#0d1e15"],
    text: "#f1f6ef",
    accent: "#cfe3a8",
    accentDeep: "#8fae63",
    cardFill: "rgba(255,255,255,0.06)",
    cardStroke: "rgba(207,227,168,0.4)",
    photoRing: "#cfe3a8",
    fallbackFill: "#2f5540",
    footerBg: "#f1f6ef",
    footerInk: "#14261b",
    footerMuted: "#5f7264",
    footerRule: "#274b38",
    swatch: ["#274b38", "#cfe3a8", "#f1f6ef"],
    texture: "vignette",
    ornament: "dots",
  },
  {
    id: "grafite",
    label: "Grafite Moderno",
    note: "Quase preto com âmbar e retícula. Ideal para culto de jovens.",
    dark: true,
    bg: ["#2a2a30", "#1c1c20", "#0f0f12"],
    text: "#f5f5f2",
    accent: "#f0b429",
    accentDeep: "#c98d12",
    cardFill: "rgba(255,255,255,0.06)",
    cardStroke: "rgba(240,180,41,0.44)",
    photoRing: "#f0b429",
    fallbackFill: "#34343b",
    footerBg: "#f5f5f2",
    footerInk: "#16161a",
    footerMuted: "#63636b",
    footerRule: "#26262b",
    swatch: ["#26262b", "#f0b429", "#f5f5f2"],
    texture: "dots",
    ornament: "bracket",
  },
];

export const DEFAULT_FLYER_THEME: FlyerTheme = FLYER_THEMES[0] as FlyerTheme;

export function isFlyerThemeId(value: string): boolean {
  return FLYER_THEMES.some((theme) => theme.id === value);
}

export function getFlyerTheme(value: string | null | undefined): FlyerTheme {
  if (!value) return DEFAULT_FLYER_THEME;
  return FLYER_THEMES.find((theme) => theme.id === value) ?? DEFAULT_FLYER_THEME;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Sugere um tema visual a partir do nome do culto.
 * A secretaria pode trocar depois; é só um ponto de partida coerente.
 */
export function suggestFlyerThemeId(title: string, subject?: string | null): FlyerThemeId {
  const haystack = fold(`${title} ${subject ?? ""}`);
  const has = (...words: string[]) => words.some((word) => haystack.includes(word));
  if (has("joven", "juventude", "mocidade", "adolescente")) return "grafite";
  if (has("ceia", "vigilia", "oracao", "intercessao", "santa")) return "noite";
  if (has("mulher", "homem", "familia", "casal", "casais", "noivos")) return "oliveira";
  if (has("missao", "missoes", "conferencia", "avivamento")) return "realeza";
  if (has("infantil", "crianca", "criancas", "escola dominical", "manha")) return "manha";
  if (has("aniversario", "comemoracao", "historia", "memoria")) return "sepia";
  if (has("doutrina", "ensino", "estudo")) return "classico";
  return "classico";
}
