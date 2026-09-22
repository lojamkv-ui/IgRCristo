/**
 * Renderizador de flyer em Canvas 2D.
 *
 * Desenha uma arte completa (1080×1920 ou 1080×1350) a partir dos dados do
 * culto, do conteúdo gerado (ChatGPT/simulado) e do tema escolhido.
 * Tudo acontece no navegador — nenhuma dependência externa.
 */

import type { FlyerResponse } from "@/lib/api";
import { getTheme, type FlyerTheme } from "@/lib/flyer-themes";
import { initials } from "@/lib/format";

export type FlyerFormat = "stories" | "feed";

export const FLYER_FORMATS: Array<{
  id: FlyerFormat;
  label: string;
  width: number;
  height: number;
  hint: string;
}> = [
  { id: "stories", label: "Stories", width: 1080, height: 1920, hint: "9:16 · Status/Stories" },
  { id: "feed", label: "Feed", width: 1080, height: 1350, hint: "4:5 · Post de feed" },
];

export type RenderOptions = {
  theme?: string | null;
  format?: FlyerFormat;
};

const DISPLAY = '"Sora", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const BODY = '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif';

type Ctx = CanvasRenderingContext2D;
type ImageMap = Map<string, HTMLImageElement | null>;

/* ------------------------------------------------------------------ *
 * Utilidades
 * ------------------------------------------------------------------ */

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    if (!src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

async function ensureFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load('800 40px "Sora"'),
      document.fonts.load('700 40px "Sora"'),
      document.fonts.load('600 20px "Inter"'),
      document.fonts.load('500 20px "Inter"'),
      document.fonts.load('italic 400 20px "Inter"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Fontes web indisponíveis: o canvas usa as fontes do sistema.
  }
}

function rgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return `rgba(255,255,255,${alpha})`;
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

function font(weight: number, size: number, family: string, italic = false): string {
  return `${italic ? "italic " : ""}${weight} ${Math.round(size)}px ${family}`;
}

/** Gerador pseudoaleatório determinístico (padrões iguais a cada render). */
function seeded(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Quebra o texto em linhas respeitando a largura máxima (com corte de palavras longas). */
function wrap(ctx: Ctx, text: string, maxWidth: number, maxLines = Infinity): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  const pushLine = (line: string) => {
    if (line) lines.push(line);
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) pushLine(current);
    // palavra maior que a linha: corta em pedaços
    if (ctx.measureText(word).width > maxWidth) {
      let chunk = "";
      for (const char of word) {
        if (ctx.measureText(chunk + char).width > maxWidth) {
          pushLine(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }
  pushLine(current);

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

/** Encontra o maior tamanho de fonte que cabe em `maxLines` linhas. */
function fitText(
  ctx: Ctx,
  text: string,
  maxWidth: number,
  maxLines: number,
  weight: number,
  family: string,
  start: number,
  min: number,
): { size: number; lines: string[] } {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = font(weight, size, family);
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = font(weight, min, family);
  return { size: min, lines: wrap(ctx, text, maxWidth, maxLines) };
}

/** Texto com espaçamento entre letras, centralizado em `cx`. Retorna a largura. */
function drawTracked(ctx: Ctx, text: string, cx: number, y: number, spacing: number, dry: boolean): number {
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, chars.length - 1);
  if (!dry) {
    const previousAlign = ctx.textAlign;
    ctx.textAlign = "left";
    let x = cx - total / 2;
    chars.forEach((char, index) => {
      ctx.fillText(char, x, y);
      x += widths[index] + spacing;
    });
    ctx.textAlign = previousAlign;
  }
  return total;
}

function drawCirclePhoto(
  ctx: Ctx,
  image: HTMLImageElement | null,
  name: string,
  cx: number,
  cy: number,
  r: number,
  theme: FlyerTheme,
  ringWidth: number,
) {
  // anel
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, theme.accent);
  ring.addColorStop(1, rgba(theme.accent, 0.35));
  ctx.beginPath();
  ctx.arc(cx, cy, r + ringWidth, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();

  // sombra suave
  ctx.save();
  ctx.shadowColor = rgba("#000000", theme.dark ? 0.45 : 0.18);
  ctx.shadowBlur = r * 0.35;
  ctx.shadowOffsetY = r * 0.12;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = theme.background[1];
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (image && image.naturalWidth > 0) {
    const scale = Math.max((2 * r) / image.naturalWidth, (2 * r) / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.drawImage(image, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    const fill = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    fill.addColorStop(0, theme.dark ? "#5f3fd1" : "#7355e8");
    fill.addColorStop(1, theme.dark ? "#261a56" : "#4d31a8");
    ctx.fillStyle = fill;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(800, r * 0.72, DISPLAY);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(name), cx, cy + r * 0.04);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Fundo e padrões decorativos
 * ------------------------------------------------------------------ */

function drawBackground(ctx: Ctx, theme: FlyerTheme, W: number, H: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, theme.background[0]);
  gradient.addColorStop(0.55, theme.background[1]);
  gradient.addColorStop(1, theme.background[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const glowTop = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, H * 0.55);
  glowTop.addColorStop(0, rgba(theme.accent, theme.dark ? 0.32 : 0.2));
  glowTop.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, H);

  const glowBottom = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, H * 0.45);
  glowBottom.addColorStop(0, rgba(theme.accent, theme.dark ? 0.18 : 0.14));
  glowBottom.addColorStop(1, rgba(theme.accent, 0));
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 0, W, H);
}

function drawPattern(ctx: Ctx, theme: FlyerTheme, W: number, H: number) {
  const random = seeded(theme.id.length * 977 + W + H);
  const alphaBase = theme.dark ? 1 : 0.7;
  ctx.save();

  switch (theme.pattern) {
    case "rays": {
      ctx.translate(W / 2, -H * 0.05);
      for (let i = 0; i < 28; i += 1) {
        const angle = (Math.PI / 28) * i + Math.PI / 56;
        ctx.save();
        ctx.rotate(angle - Math.PI / 2);
        ctx.fillStyle = rgba(theme.accent, (i % 2 === 0 ? 0.06 : 0.025) * alphaBase);
        ctx.fillRect(-12, 0, 24, H * 1.4);
        ctx.restore();
      }
      break;
    }
    case "stars": {
      for (let i = 0; i < 160; i += 1) {
        const x = random() * W;
        const y = random() * H;
        const r = random() * 2.6 + 0.4;
        ctx.fillStyle = rgba(theme.text, (random() * 0.5 + 0.15) * alphaBase);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 6; i += 1) {
        const x = random() * W;
        const y = random() * H * 0.6;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 60);
        glow.addColorStop(0, rgba(theme.accent, 0.35));
        glow.addColorStop(1, rgba(theme.accent, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(x - 60, y - 60, 120, 120);
      }
      break;
    }
    case "circles": {
      ctx.lineWidth = 2;
      for (let i = 1; i <= 9; i += 1) {
        ctx.strokeStyle = rgba(theme.accent, (0.16 - i * 0.014) * alphaBase);
        ctx.beginPath();
        ctx.arc(W * 0.92, H * 0.06, i * 95, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(W * 0.06, H * 0.9, i * 80, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "waves": {
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i += 1) {
        const baseY = H * 0.62 + i * 48;
        ctx.strokeStyle = rgba(theme.accent, (0.14 - i * 0.012) * alphaBase);
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 12) {
          const y = baseY + Math.sin((x / W) * Math.PI * 2.2 + i * 0.6) * 26;
          if (x === -20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case "dots": {
      for (let y = 40; y < H; y += 44) {
        for (let x = 40; x < W; x += 44) {
          ctx.fillStyle = rgba(theme.accent, 0.13);
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "grid": {
      ctx.strokeStyle = rgba(theme.accent, 0.08);
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= W; x += 72) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 72) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();

  // barra superior e moldura sutil
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, W, 10);
  ctx.strokeStyle = rgba(theme.accent, theme.dark ? 0.35 : 0.5);
  ctx.lineWidth = 2;
  roundRect(ctx, 26, 36, W - 52, H - 62, 34);
  ctx.stroke();
}

/* ------------------------------------------------------------------ *
 * Rodapé institucional
 * ------------------------------------------------------------------ */

type FooterLayout = {
  height: number;
  president: string;
  addressLines: string[];
  contact: string;
  cnpj: string;
  sizes: { president: number; body: number; small: number };
};

function measureFooter(ctx: Ctx, data: FlyerResponse, W: number, compact: boolean): FooterLayout {
  const sizes = compact
    ? { president: 22, body: 19, small: 17 }
    : { president: 25, body: 21, small: 19 };
  const maxWidth = W - 84 * 2 - 60;
  ctx.font = font(500, sizes.body, BODY);
  const addressLines = wrap(ctx, data.church.addressFull, maxWidth, 2);
  const contact = [
    data.church.phone ? `Contato: ${data.church.phone}` : null,
    data.church.email,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const cnpj = data.church.cnpj ? `CNPJ: ${data.church.cnpj}` : "";
  const height =
    36 +
    sizes.president +
    14 +
    addressLines.length * (sizes.body * 1.35) +
    6 +
    sizes.body * 1.35 +
    (cnpj ? 4 + sizes.small * 1.3 : 0) +
    34;
  return {
    height,
    president: (data.church.president ?? data.church.name).toUpperCase(),
    addressLines,
    contact,
    cnpj,
    sizes,
  };
}

function drawFooter(ctx: Ctx, footer: FooterLayout, theme: FlyerTheme, W: number, top: number, logo: HTMLImageElement | null) {
  const x = 60;
  const width = W - 120;
  ctx.fillStyle = theme.dark ? rgba("#000000", 0.3) : rgba(theme.accent, 0.08);
  roundRect(ctx, x, top, width, footer.height, 30);
  ctx.fill();
  ctx.strokeStyle = rgba(theme.accent, theme.dark ? 0.4 : 0.35);
  ctx.lineWidth = 2;
  roundRect(ctx, x, top, width, footer.height, 30);
  ctx.stroke();

  const cx = W / 2;
  let y = top + 36;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.fillStyle = theme.accent;
  ctx.font = font(800, footer.sizes.president, BODY);
  drawTracked(ctx, footer.president, cx, y, 3, false);
  y += footer.sizes.president + 14;

  ctx.fillStyle = rgba(theme.text, 0.88);
  ctx.font = font(500, footer.sizes.body, BODY);
  footer.addressLines.forEach((line) => {
    ctx.fillText(line, cx, y);
    y += footer.sizes.body * 1.35;
  });
  y += 6;
  ctx.fillText(footer.contact, cx, y);
  y += footer.sizes.body * 1.35;

  if (footer.cnpj) {
    y += 4;
    ctx.fillStyle = rgba(theme.text, 0.65);
    ctx.font = font(500, footer.sizes.small, BODY);
    ctx.fillText(footer.cnpj, cx, y);
  }

  if (logo) {
    const size = 64;
    ctx.save();
    roundRect(ctx, x + 24, top + footer.height / 2 - size / 2, size, size, 14);
    ctx.clip();
    ctx.drawImage(logo, x + 24, top + footer.height / 2 - size / 2, size, size);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ *
 * Corpo do flyer (fluxo vertical com ajuste automático de escala)
 * ------------------------------------------------------------------ */

type BodyArgs = {
  ctx: Ctx;
  data: FlyerResponse;
  theme: FlyerTheme;
  W: number;
  images: ImageMap;
  k: number;
  dry: boolean;
};

function paintBody({ ctx, data, theme, W, images, k, dry }: BodyArgs): number {
  const { service, church, copy } = data;
  const cx = W / 2;
  const pad = 84;
  const maxW = W - pad * 2;
  const muted = rgba(theme.text, 0.78);
  const fs = (n: number) => n * (0.78 + 0.22 * k);
  const gap = (n: number) => n * k;

  const fill = (text: string, x: number, y: number) => {
    if (!dry) ctx.fillText(text, x, y);
  };

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  let y = 64 + gap(40);

  /* logo */
  const logo = images.get("logo") ?? null;
  if (logo) {
    const size = fs(112);
    if (!dry) {
      ctx.save();
      roundRect(ctx, cx - size / 2, y, size, size, size * 0.24);
      ctx.clip();
      ctx.drawImage(logo, cx - size / 2, y, size, size);
      ctx.restore();
    }
    y += size + gap(22);
  }

  /* nome da igreja com linhas laterais */
  ctx.font = font(700, fs(23), BODY);
  ctx.fillStyle = theme.accent;
  const churchWidth = drawTracked(ctx, church.name.toUpperCase(), cx, y, 5, dry);
  if (!dry) {
    const lineW = Math.min(70, (maxW - churchWidth) / 2 - 20);
    if (lineW > 20) {
      ctx.strokeStyle = rgba(theme.accent, 0.7);
      ctx.lineWidth = 2;
      const lineY = y + fs(23) * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - churchWidth / 2 - 18 - lineW, lineY);
      ctx.lineTo(cx - churchWidth / 2 - 18, lineY);
      ctx.moveTo(cx + churchWidth / 2 + 18, lineY);
      ctx.lineTo(cx + churchWidth / 2 + 18 + lineW, lineY);
      ctx.stroke();
    }
  }
  y += fs(23) + gap(16);

  /* tipo do culto */
  if (service.kind) {
    ctx.font = font(600, fs(21), BODY);
    ctx.fillStyle = muted;
    drawTracked(ctx, service.kind.toUpperCase(), cx, y, 4, dry);
    y += fs(21) + gap(30);
  } else {
    y += gap(22);
  }

  /* título principal */
  const headline = fitText(ctx, copy.headline, maxW, 2, 800, DISPLAY, fs(112), fs(60));
  ctx.fillStyle = theme.text;
  if (!dry && theme.dark) {
    ctx.shadowColor = rgba(theme.accent, 0.35);
    ctx.shadowBlur = 30;
  }
  headline.lines.forEach((line) => {
    fill(line, cx, y);
    y += headline.size * 1.06;
  });
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  y += gap(18);

  /* subtítulo */
  ctx.font = font(500, fs(29), BODY);
  ctx.fillStyle = muted;
  const subtitleText = `${service.title}${service.theme ? ` — “${service.theme}”` : ""}`;
  wrap(ctx, subtitleText, maxW - 40, 2).forEach((line) => {
    fill(line, cx, y);
    y += fs(29) * 1.3;
  });
  y += gap(28);

  /* pílula de data/hora */
  ctx.font = font(800, fs(40), DISPLAY);
  const dateText = `${service.dateBR}    ${service.time}`;
  const dateWidth = ctx.measureText(dateText).width;
  const pillW = Math.min(maxW, dateWidth + 110);
  const pillH = fs(40) + 50;
  if (!dry) {
    ctx.fillStyle = rgba(theme.accent, theme.dark ? 0.16 : 0.14);
    roundRect(ctx, cx - pillW / 2, y, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = rgba(theme.accent, 0.6);
    ctx.lineWidth = 2.5;
    roundRect(ctx, cx - pillW / 2, y, pillW, pillH, pillH / 2);
    ctx.stroke();

    ctx.textBaseline = "middle";
    ctx.fillStyle = theme.text;
    ctx.fillText(dateText, cx, y + pillH / 2 + 2);
    // separador central
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(cx, y + pillH / 2 + 1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = "top";
  }
  y += pillH + gap(12);

  const weekday = service.dateLong.split(",")[0]?.trim();
  if (weekday) {
    ctx.font = font(600, fs(21), BODY);
    ctx.fillStyle = muted;
    drawTracked(ctx, weekday.toUpperCase(), cx, y, 3, dry);
    y += fs(21) + gap(40);
  } else {
    y += gap(36);
  }

  /* pregador */
  const preacherR = Math.round(150 * (0.7 + 0.3 * k));
  if (!dry) {
    drawCirclePhoto(
      ctx,
      images.get("preacher") ?? null,
      service.preacherName ?? "Pregador",
      cx,
      y + preacherR,
      preacherR,
      theme,
      7,
    );
  }
  y += preacherR * 2 + gap(26);

  ctx.font = font(700, fs(21), BODY);
  ctx.fillStyle = theme.accent;
  drawTracked(ctx, "PREGADOR", cx, y, 6, dry);
  y += fs(21) + gap(12);

  ctx.font = font(800, fs(44), DISPLAY);
  ctx.fillStyle = theme.text;
  wrap(ctx, service.preacherName ?? "A confirmar", maxW, 2).forEach((line) => {
    fill(line, cx, y);
    y += fs(44) * 1.15;
  });
  y += gap(34);

  /* cantores */
  const singers = service.singers.slice(0, 5);
  if (singers.length > 0) {
    ctx.font = font(700, fs(21), BODY);
    ctx.fillStyle = theme.accent;
    drawTracked(ctx, "LOUVOR", cx, y, 6, dry);
    y += fs(21) + gap(22);

    const singerR = Math.round(68 * (0.7 + 0.3 * k));
    const cell = Math.min(220, maxW / singers.length);
    const startX = cx - (cell * singers.length) / 2 + cell / 2;
    ctx.font = font(600, fs(22), BODY);
    let namesHeight = 0;

    singers.forEach((singer, index) => {
      const sx = startX + index * cell;
      if (!dry) {
        drawCirclePhoto(ctx, images.get(`singer:${index}`) ?? null, singer.name, sx, y + singerR, singerR, theme, 4);
      }
      ctx.font = font(600, fs(22), BODY);
      ctx.fillStyle = rgba(theme.text, 0.92);
      const lines = wrap(ctx, singer.name, cell - 18, 2);
      let ny = y + singerR * 2 + gap(12);
      lines.forEach((line) => {
        fill(line, sx, ny);
        ny += fs(22) * 1.25;
      });
      namesHeight = Math.max(namesHeight, lines.length * fs(22) * 1.25);
    });

    y += singerR * 2 + gap(12) + namesHeight + gap(30);
  }

  /* dirigente */
  ctx.font = font(500, fs(28), BODY);
  const leaderLabel = "Dirigente: ";
  const labelWidth = ctx.measureText(leaderLabel).width;
  const leaderWidth = ctx.measureText(service.leader).width;
  if (!dry) {
    ctx.textAlign = "left";
    const startX = cx - (labelWidth + leaderWidth) / 2;
    ctx.fillStyle = theme.accent;
    ctx.font = font(700, fs(28), BODY);
    ctx.fillText(leaderLabel, startX, y);
    ctx.fillStyle = theme.text;
    ctx.font = font(500, fs(28), BODY);
    ctx.fillText(service.leader, startX + labelWidth, y);
    ctx.textAlign = "center";
  }
  y += fs(28) * 1.35;

  /* intercessores */
  if (service.intercessors.length > 0) {
    ctx.font = font(500, fs(24), BODY);
    ctx.fillStyle = muted;
    wrap(ctx, `Intercessores: ${service.intercessors.join(", ")}`, maxW - 20, 2).forEach((line) => {
      fill(line, cx, y);
      y += fs(24) * 1.35;
    });
  }
  y += gap(34);

  /* versículo */
  ctx.font = font(400, fs(29), BODY, true);
  ctx.fillStyle = rgba(theme.text, 0.86);
  wrap(ctx, `“${copy.verse}”`, maxW - 80, 3).forEach((line) => {
    fill(line, cx, y);
    y += fs(29) * 1.4;
  });
  y += gap(8);
  ctx.font = font(700, fs(24), BODY);
  ctx.fillStyle = theme.accent;
  fill(copy.verseReference, cx, y);
  y += fs(24) + gap(22);

  /* chamada */
  ctx.font = font(800, fs(31), DISPLAY);
  ctx.fillStyle = theme.text;
  drawTracked(ctx, copy.callToAction.toUpperCase(), cx, y, 4, dry);
  y += fs(31) + gap(16);

  return y;
}

/* ------------------------------------------------------------------ *
 * API pública
 * ------------------------------------------------------------------ */

async function preloadImages(data: FlyerResponse): Promise<ImageMap> {
  const entries: Array<[string, string | null]> = [
    ["preacher", data.service.preacherPhoto],
    ["logo", data.church.logo],
    ...data.service.singers.slice(0, 5).map<[string, string | null]>((singer, index) => [`singer:${index}`, singer.photo]),
  ];
  const loaded = await Promise.all(
    entries.map(async ([key, src]) => [key, src ? await loadImage(src) : null] as const),
  );
  return new Map(loaded);
}

/** Renderiza o flyer completo no canvas informado. */
export async function renderFlyer(
  canvas: HTMLCanvasElement,
  data: FlyerResponse,
  options: RenderOptions = {},
): Promise<void> {
  const format = FLYER_FORMATS.find((item) => item.id === options.format) ?? FLYER_FORMATS[0];
  const theme = getTheme(options.theme);
  const W = format.width;
  const H = format.height;

  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado neste navegador.");

  await ensureFonts();
  const images = await preloadImages(data);

  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, theme, W, H);
  drawPattern(ctx, theme, W, H);

  const compact = format.id === "feed";
  const footer = measureFooter(ctx, data, W, compact);
  const footerTop = H - 56 - footer.height;

  // Ajuste automático: reduz a escala do corpo até caber acima do rodapé.
  let chosen = compact ? 0.82 : 1;
  const candidates = [chosen, 0.9, 0.8, 0.72, 0.64, 0.56, 0.5].filter(
    (value, index, list) => value <= chosen && list.indexOf(value) === index,
  );
  for (const k of candidates) {
    const endY = paintBody({ ctx, data, theme, W, images, k, dry: true });
    chosen = k;
    if (endY <= footerTop - 24) break;
  }

  paintBody({ ctx, data, theme, W, images, k: chosen, dry: false });
  drawFooter(ctx, footer, theme, W, footerTop, images.get("logo") ?? null);
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar a imagem."))),
      type,
      quality,
    );
  });
}
