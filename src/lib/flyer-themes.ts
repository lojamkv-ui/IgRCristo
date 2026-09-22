/**
 * Catálogo de temas visuais do flyer.
 * Arquivo sem dependências de DOM para poder ser importado no servidor
 * (validação de configurações) e no cliente (renderizador Canvas).
 */

export type FlyerThemeId = "royal" | "night" | "dawn" | "forest" | "gold" | "minimal";

export type FlyerPattern = "rays" | "stars" | "circles" | "waves" | "dots" | "grid";

export type FlyerTheme = {
  id: FlyerThemeId;
  label: string;
  description: string;
  /** Três paradas do degradê de fundo (topo → base). */
  background: [string, string, string];
  accent: string;
  text: string;
  /** Tema escuro (texto claro) ou claro (texto escuro). */
  dark: boolean;
  pattern: FlyerPattern;
};

export const FLYER_THEMES: FlyerTheme[] = [
  {
    id: "royal",
    label: "Real",
    description: "Roxo profundo com dourado — clássico e solene.",
    background: ["#120f2e", "#1d1650", "#0e0b22"],
    accent: "#d9ac55",
    text: "#f8f6ff",
    dark: true,
    pattern: "rays",
  },
  {
    id: "night",
    label: "Noite",
    description: "Azul-marinho com brilho celeste — vigílias e cultos de oração.",
    background: ["#070c1f", "#10203f", "#060a18"],
    accent: "#8fb8ff",
    text: "#f2f6ff",
    dark: true,
    pattern: "stars",
  },
  {
    id: "dawn",
    label: "Amanhecer",
    description: "Vinho quente com coral — celebrações e Santa Ceia.",
    background: ["#2b0f1d", "#5a1f38", "#1d0a14"],
    accent: "#ff9b6a",
    text: "#fff5f0",
    dark: true,
    pattern: "circles",
  },
  {
    id: "forest",
    label: "Bosque",
    description: "Verde escuro com menta — missões, jovens e retiros.",
    background: ["#07211b", "#124b3a", "#051712"],
    accent: "#8fe0b8",
    text: "#f0fbf5",
    dark: true,
    pattern: "waves",
  },
  {
    id: "gold",
    label: "Marfim",
    description: "Fundo claro em tons de creme e ouro — elegante para impressão.",
    background: ["#fdf9ef", "#f4e8cc", "#fbf3e0"],
    accent: "#9a6b12",
    text: "#2a1d05",
    dark: false,
    pattern: "dots",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Branco com violeta — moderno, limpo e direto.",
    background: ["#ffffff", "#f3f0fb", "#ffffff"],
    accent: "#5f3fd1",
    text: "#1b1929",
    dark: false,
    pattern: "grid",
  },
];

export const DEFAULT_THEME_ID: FlyerThemeId = "royal";

export const FLYER_THEME_IDS = FLYER_THEMES.map((theme) => theme.id) as FlyerThemeId[];

export function isThemeId(value: unknown): value is FlyerThemeId {
  return typeof value === "string" && (FLYER_THEME_IDS as string[]).includes(value);
}

export function getTheme(id?: string | null): FlyerTheme {
  return FLYER_THEMES.find((theme) => theme.id === id) ?? FLYER_THEMES[0];
}

/** Degradê CSS usado nas miniaturas/seletores de tema. */
export function themeGradient(theme: FlyerTheme): string {
  return `linear-gradient(160deg, ${theme.background[0]} 0%, ${theme.background[1]} 55%, ${theme.background[2]} 100%)`;
}
