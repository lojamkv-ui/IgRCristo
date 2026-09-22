/**
 * Fundos cinematográficos desenhados no próprio Canvas.
 * Correspondem ao Prompt 2: retrato 1080×1350, luz dramática, feixes, fumaça
 * e espaço central livre para a foto do pregador e os textos.
 */

export type CinematicId = "azul-dourado" | "luz-divina" | "palco" | "fumaca" | "noite-vinho";

export type CinematicScene = {
  id: CinematicId;
  label: string;
  note: string;
  swatch: [string, string, string];
};

export const CINEMATIC_SCENES: CinematicScene[] = [
  {
    id: "azul-dourado",
    label: "Azul e dourado",
    note: "Iluminação dramática, feixes cruzados e fumaça suave. O Prompt 2 clássico.",
    swatch: ["#071428", "#c9a227", "#1a3a6b"],
  },
  {
    id: "luz-divina",
    label: "Luz divina",
    note: "Raios dourados descendo do alto, como um palco de adoração.",
    swatch: ["#1a1208", "#e4c27a", "#5a3a12"],
  },
  {
    id: "palco",
    label: "Palco de adoração",
    note: "Luzes de contra, névoa baixa e profundidade de palco.",
    swatch: ["#0c0c12", "#8eb4ff", "#d4af67"],
  },
  {
    id: "fumaca",
    label: "Textura escurecida",
    note: "Haze denso, contraste alto e centro livre para a foto.",
    swatch: ["#101014", "#9aa3b5", "#6a2433"],
  },
  {
    id: "noite-vinho",
    label: "Noite da sede",
    note: "Vinho profundo da igreja com dourado cinematográfico.",
    swatch: ["#2b0d16", "#e4c27a", "#4c1826"],
  },
];

export function isCinematicId(value: string): boolean {
  return CINEMATIC_SCENES.some((scene) => scene.id === value);
}

export function getCinematic(value: string | null | undefined): CinematicScene | null {
  if (!value) return null;
  return CINEMATIC_SCENES.find((scene) => scene.id === value) ?? null;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Lê um prompt de fundo e escolhe a cena cinematográfica correspondente. */
export function cinematicFromPrompt(prompt: string): CinematicId {
  const haystack = fold(prompt);
  const has = (...words: string[]) => words.some((word) => haystack.includes(word));
  if (has("vinho", "burgundy", "igreja sede", "renascendo")) return "noite-vinho";
  if (has("palco", "adoracao", "spot", "contra-luz", "contraluz")) return "palco";
  if (has("luz divina", "raio", "raios", "dourado alto", "halo")) return "luz-divina";
  if (has("fumaca", "haze", "nevoa", "textura escurecida", "escurecid")) return "fumaca";
  if (has("azul", "cinemat", "feixe", "dourado")) return "azul-dourado";
  return "azul-dourado";
}

function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

type Palette = {
  deep: string;
  mid: string;
  gold: string;
  blue: string;
  haze: string;
};

const PALETTES: Record<CinematicId, Palette> = {
  "azul-dourado": { deep: "#050b18", mid: "#102445", gold: "#e0c36a", blue: "#4d7ec8", haze: "rgba(160,190,230,0.08)" },
  "luz-divina": { deep: "#120c06", mid: "#3a2710", gold: "#f0d48a", blue: "#8a6a32", haze: "rgba(232,210,150,0.1)" },
  palco: { deep: "#07070c", mid: "#161622", gold: "#d4af67", blue: "#7ea2e0", haze: "rgba(180,200,240,0.1)" },
  fumaca: { deep: "#0c0c10", mid: "#1c1c24", gold: "#c8b48a", blue: "#6a7080", haze: "rgba(180,180,190,0.12)" },
  "noite-vinho": { deep: "#14060c", mid: "#3a121c", gold: "#e4c27a", blue: "#6a2433", haze: "rgba(228,194,122,0.08)" },
};

function beam(ctx: CanvasRenderingContext2D, cx: number, cy: number, angle: number, length: number, spread: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle - spread) * length, cy + Math.sin(angle - spread) * length);
  ctx.lineTo(cx + Math.cos(angle + spread) * length, cy + Math.sin(angle + spread) * length);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function smoke(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, seed: number) {
  const random = seeded(seed);
  ctx.save();
  for (let index = 0; index < 28; index += 1) {
    const x = random() * w;
    const y = h * (0.18 + random() * 0.7);
    const radius = 80 + random() * 220;
    const gradient = ctx.createRadialGradient(x, y, 10, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Pinta o fundo cinematográfico. O centro fica deliberadamente mais limpo
 * para receber a foto do pregador e os textos do culto.
 */
export function paintCinematic(ctx: CanvasRenderingContext2D, w: number, h: number, id: CinematicId) {
  const palette = PALETTES[id];
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, palette.mid);
  sky.addColorStop(0.45, palette.deep);
  sky.addColorStop(1, "#020308");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w / 2, h * 0.18, 20, w / 2, h * 0.42, w * 0.85);
  glow.addColorStop(0, `${palette.gold}33`);
  glow.addColorStop(0.45, `${palette.blue}22`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const originX = w / 2;
  const originY = id === "luz-divina" ? -40 : -80;
  const count = id === "palco" ? 14 : 10;
  for (let index = 0; index < count; index += 1) {
    const t = (index / (count - 1) - 0.5) * (id === "luz-divina" ? 1.05 : 0.9);
    const angle = Math.PI / 2 + t * 0.95;
    const spread = 0.035 + (index % 3) * 0.012;
    const gold = index % 2 === 0 ? `${palette.gold}22` : `${palette.blue}18`;
    beam(ctx, originX, originY, angle, h * 1.35, spread, gold);
  }
  if (id === "palco") {
    beam(ctx, 80, h * 0.15, 0.55, h * 1.1, 0.05, `${palette.blue}16`);
    beam(ctx, w - 80, h * 0.15, Math.PI - 0.55, h * 1.1, 0.05, `${palette.gold}16`);
  }
  ctx.restore();

  smoke(ctx, w, h, palette.haze, id === "fumaca" ? 11 : 41);
  if (id === "fumaca") smoke(ctx, w, h, "rgba(220,220,230,0.06)", 77);

  // Centro mais limpo: vinheta que escurece as bordas e poupa o meio.
  const vignette = ctx.createRadialGradient(w / 2, h * 0.42, w * 0.18, w / 2, h * 0.48, w * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.55, "rgba(0,0,0,0.18)");
  vignette.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const floor = ctx.createLinearGradient(0, h * 0.72, 0, h);
  floor.addColorStop(0, "rgba(0,0,0,0)");
  floor.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
}
