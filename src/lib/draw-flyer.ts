import { paintCinematic, type CinematicId } from "./cinematic";
import { formatLongDate, formatTime, initials, monthName, weekdayName } from "./format";
import type { FlyerTheme, FlyerOrnament } from "./flyer-themes";
import type { FlyerModel, FlyerModelId } from "./flyer-models";

export type FlyerFormat = "feed" | "story";

export const FLYER_SIZES: Record<FlyerFormat, { w: number; h: number }> = {
  feed: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

export type FlyerCopyInput = {
  headline: string;
  verseReference: string;
  verseText: string;
  invitation: string;
  hashtags: string[];
};

export type FlyerDrawInput = {
  format: FlyerFormat;
  /** Modelo da biblioteca (layout). */
  model: FlyerModel;
  /** Tema visual (paleta). */
  theme: FlyerTheme;
  /** Fundo importado pela secretaria, se houver. */
  backgroundImage: HTMLImageElement | null;
  /** Fundo cinematográfico gerado no canvas a partir de um prompt. */
  cinematic: CinematicId | null;
  church: { name: string; pastor: string; email: string; phone: string; cnpj: string; addressFull: string };
  title: string;
  /** Tema assinalado para o culto (assunto da pregação). */
  subject: string | null;
  serviceDate: string;
  serviceTime: string;
  leaderName: string;
  preacherName: string;
  intercessors: string[];
  copy: FlyerCopyInput;
  preacherImage: HTMLImageElement | null;
  singers: { name: string; image: HTMLImageElement | null }[];
  emblem: HTMLImageElement | null;
  fonts: { display: string; sans: string };
};

type Person = { name: string; image: HTMLImageElement | null; role: string; primary: boolean };

type Scene = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  story: boolean;
  /** Início do rodapé, limite da área de conteúdo. */
  bottom: number;
  left: number;
  right: number;
  theme: FlyerTheme;
  fonts: { display: string; sans: string };
  input: FlyerDrawInput;
  people: Person[];
};

/* ------------------------------------------------------------------ *
 * Primitivas
 * ------------------------------------------------------------------ */

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const breakWord = (word: string) => {
    let chunk = "";
    const broken: string[] = [];
    for (const char of word) {
      const test = chunk + char;
      if (ctx.measureText(test).width > maxWidth && chunk) {
        broken.push(chunk);
        chunk = char;
      } else chunk = test;
    }
    if (chunk) broken.push(chunk);
    return broken;
  };
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      const pieces = breakWord(word);
      lines.push(...pieces.slice(0, -1));
      line = pieces[pieces.length - 1] ?? "";
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function limitLines(lines: string[], max: number) {
  if (lines.length <= max) return lines;
  const cut = lines.slice(0, max);
  cut[max - 1] = `${cut[max - 1]?.replace(/[.…\s]+$/, "")}…`;
  return cut;
}

/** Texto com espaçamento entre letras que se ajusta à largura disponível. */
function tracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  options: { tracking: number; maxWidth: number; align: "center" | "left"; x?: number },
) {
  const chars = [...text];
  const width = (gap: number) =>
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + gap * Math.max(0, chars.length - 1);
  let gap = options.tracking;
  let guard = 0;
  while (width(gap) > options.maxWidth && guard < 48) {
    if (gap > 0.5) gap *= 0.86;
    else {
      const size = Number((/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? "18").replace("px", ""));
      ctx.font = ctx.font.replace(/(\d+(?:\.\d+)?)px/, `${Math.max(9, size - 1)}px`);
    }
    guard += 1;
  }
  const total = width(gap);
  let cursor = options.align === "center" ? (options.x ?? 0) - total / 2 : (options.x ?? 0);
  ctx.textAlign = "left";
  for (const char of chars) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + gap;
  }
}

type BlockOptions = {
  font: string;
  color: string;
  maxWidth: number;
  maxLines: number;
  lineHeight: number;
  align?: "center" | "left";
  x?: number;
};

function drawBlock(s: Scene, y: number, text: string, options: BlockOptions) {
  const { ctx } = s;
  const align = options.align ?? "center";
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const x = options.x ?? (align === "center" ? s.w / 2 : s.left);
  for (const line of limitLines(wrapText(ctx, text, options.maxWidth), options.maxLines)) {
    ctx.fillText(line, x, y);
    y += options.lineHeight;
  }
  return y;
}

function drawCoverCircle(ctx: CanvasRenderingContext2D, image: HTMLImageElement, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const ratio = image.width / image.height || 1;
  let dw = radius * 2;
  let dh = radius * 2;
  if (ratio > 1) dw = dh * ratio;
  else dh = dw / ratio;
  ctx.drawImage(image, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

function drawPerson(s: Scene, person: Person, cx: number, base: number, radius: number, nameWidth: number) {
  const { ctx, theme, fonts } = s;
  const cy = base - radius;
  if (person.image) drawCoverCircle(ctx, person.image, cx, cy, radius);
  else {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = theme.fallbackFill;
    ctx.fill();
    ctx.fillStyle = theme.text;
    ctx.font = `600 ${Math.round(radius * 0.58)}px ${fonts.display}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(person.name), cx, cy + 1);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
  ctx.strokeStyle = theme.photoRing;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `600 ${radius > 70 ? 22 : 18}px ${fonts.sans}`;
  const lines = limitLines(wrapText(ctx, person.name, nameWidth), 2);
  lines.forEach((line, index) => ctx.fillText(line, cx, base + 14 + index * (radius > 70 ? 26 : 22)));
  ctx.fillStyle = theme.accent;
  ctx.font = `500 ${radius > 70 ? 15 : 13}px ${fonts.sans}`;
  ctx.fillText(person.role.toUpperCase(), cx, base + 14 + lines.length * (radius > 70 ? 26 : 22) + 4);
}

function drawEmblem(s: Scene, cx: number, cy: number, radius: number) {
  const { ctx, theme, input } = s;
  if (input.emblem) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(input.emblem, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    return;
  }
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 0.6);
  ctx.lineTo(cx, cy + radius * 0.6);
  ctx.moveTo(cx - radius * 0.35, cy - radius * 0.15);
  ctx.lineTo(cx + radius * 0.35, cy - radius * 0.15);
  ctx.stroke();
}

/* ------------------------------------------------------------------ *
 * Blocos reutilizáveis
 * ------------------------------------------------------------------ */

function churchLine(s: Scene, y: number, align: "center" | "left" = "center"): number {
  const { ctx, theme, fonts, story, input, w } = s;
  ctx.font = `600 ${story ? 20 : 18}px ${fonts.sans}`;
  ctx.fillStyle = theme.accent;
  ctx.textBaseline = "top";
  tracked(ctx, input.church.name.toUpperCase(), y, { tracking: 3.2, maxWidth: 900, align, x: align === "center" ? w / 2 : s.left });
  y += story ? 34 : 28;
  ctx.strokeStyle = `${theme.accent}b3`;
  ctx.lineWidth = 1;
  if (align === "center") {
    ctx.beginPath();
    ctx.moveTo(w / 2 - 150, y);
    ctx.lineTo(w / 2 + 150, y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(s.left, y);
    ctx.lineTo(s.left + 260, y);
    ctx.stroke();
  }
  return y + (story ? 26 : 20);
}

function verseCard(s: Scene, y: number, align: "center" | "left" = "center"): number {
  const { ctx, theme, fonts, story } = s;
  const width = Math.min(830, s.right - s.left - 30);
  const font = `italic ${story ? 28 : 23}px ${fonts.display}`;
  ctx.font = font;
  const rows = limitLines(wrapText(ctx, `“${s.input.copy.verseText}”`, width - 70), story ? 5 : 4);
  const height = 32 + rows.length * (story ? 36 : 30) + 42;
  const x = align === "center" ? (s.w - width) / 2 : s.left;
  ctx.fillStyle = theme.cardFill;
  roundRect(ctx, x, y, width, height, 20);
  ctx.fill();
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const cx = x + width / 2;
  let ty = y + 18;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = font;
  for (const row of rows) {
    ctx.fillText(row, cx, ty);
    ty += story ? 36 : 30;
  }
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 17 : 15}px ${fonts.sans}`;
  ctx.fillText(s.input.copy.verseReference.toUpperCase(), cx, ty + 6);
  return y + height;
}

/** Linha compacta de data: "SÁBADO · 04 DE OUTUBRO · 18H30". */
function dateLine(s: Scene, y: number, align: "center" | "left" = "center"): number {
  const { ctx, theme, fonts, story, input, w } = s;
  ctx.font = `600 ${story ? 22 : 19}px ${fonts.sans}`;
  ctx.fillStyle = theme.accent;
  ctx.textBaseline = "top";
  const text = `${weekdayName(input.serviceDate).toUpperCase()} · ${Number(input.serviceDate.slice(8, 10))} DE ${monthName(input.serviceDate).toUpperCase()} · ${formatTime(input.serviceTime)}`;
  tracked(ctx, text, y, { tracking: 2.4, maxWidth: s.right - s.left, align, x: align === "center" ? w / 2 : s.left });
  return y + (story ? 34 : 30);
}

function photosRow(s: Scene, y: number, align: "center" | "left" = "center"): number {
  const { people, bottom, story } = s;
  if (!people.length) return y;
  const available = bottom - y;
  if (available < 118) return y;
  const desired = story ? 96 : 74;
  const radius = Math.max(34, Math.min(desired, (available - 64) / 2));
  const base = Math.min(bottom - 44, y + radius * 2 + 6);
  const gap = people.length === 1 ? 0 : story ? 30 : 24;
  const widths = people.map((person) => (person.primary ? radius * 2 : radius * 1.4));
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (people.length - 1);
  let cursor = align === "center" ? s.w / 2 - total / 2 : s.left;
  people.forEach((person, index) => {
    const r = person.primary ? radius : Math.round(radius * 0.74);
    const slot = widths[index] ?? r * 2;
    const cx = cursor + slot / 2;
    const personBase = base - (person.primary ? 0 : Math.round((radius - r) * 0.15));
    drawPerson(s, person, cx, personBase, r, slot - 6);
    cursor += slot + gap;
  });
  return base;
}

/** Grade de fotos no topo (modelo Galeria). */
function photosGrid(s: Scene, y: number): number {
  const { people, story, w } = s;
  const cast = people.slice(0, 4);
  if (!cast.length) return y;
  const radius =
    cast.length === 1
      ? story ? 124 : 104
      : cast.length === 2
        ? story ? 108 : 92
        : story ? 94 : 84;
  const gap = cast.length === 1 ? 0 : story ? 34 : 26;
  const widths = cast.map((person) => (person.primary ? radius * 2 : radius * 1.28));
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (cast.length - 1);
  let cursor = w / 2 - total / 2;
  const base = y + radius * 2 + 6;
  cast.forEach((person, index) => {
    const r = person.primary ? radius : Math.round(radius * 0.82);
    const slot = widths[index] ?? r * 2;
    const cx = cursor + slot / 2;
    const personBase = base - (person.primary ? 0 : Math.round((radius - r) * 0.2));
    drawPerson(s, person, cx, personBase, r, slot - 4);
    cursor += slot + gap;
  });
  return base + 34;
}

/* ------------------------------------------------------------------ *
 * Fundo e ornamentos
 * ------------------------------------------------------------------ */

function seeded(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function paintBackground(s: Scene) {
  const { ctx, w, h, theme, input } = s;
  if (input.cinematic) {
    paintCinematic(ctx, w, h, input.cinematic);
    return;
  }
  if (input.backgroundImage) {
    const image = input.backgroundImage;
    const ratio = image.width / image.height || 1;
    let dw = w;
    let dh = h;
    if (ratio > w / h) dw = dh * ratio;
    else dh = dw / ratio;
    ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
    const scrim = ctx.createLinearGradient(0, 0, w * 0.4, h);
    if (theme.dark) {
      scrim.addColorStop(0, "rgba(12,6,10,0.5)");
      scrim.addColorStop(0.55, "rgba(12,6,10,0.7)");
      scrim.addColorStop(1, "rgba(8,4,7,0.88)");
    } else {
      scrim.addColorStop(0, "rgba(255,252,246,0.72)");
      scrim.addColorStop(0.6, "rgba(255,252,246,0.86)");
      scrim.addColorStop(1, "rgba(255,250,243,0.95)");
    }
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, w * 0.35, h);
  gradient.addColorStop(0, theme.bg[0]);
  gradient.addColorStop(0.55, theme.bg[1]);
  gradient.addColorStop(1, theme.bg[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  switch (theme.texture) {
    case "rings": {
      ctx.strokeStyle = `${theme.accent}2a`;
      ctx.lineWidth = 1.5;
      for (const radius of [220, 340, 470, 610]) {
        ctx.beginPath();
        ctx.arc(w / 2, 30, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case "burst": {
      const cx = w / 2;
      const cy = -80;
      for (let index = 0; index < 18; index += 1) {
        const spread = (Math.PI / 9) * index - Math.PI / 2 - (Math.PI / 9) * 3.5;
        const length = index % 2 === 0 ? 1500 : 1120;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(spread - 0.045) * length, cy + Math.sin(spread - 0.045) * length);
        ctx.lineTo(cx + Math.cos(spread + 0.045) * length, cy + Math.sin(spread + 0.045) * length);
        ctx.closePath();
        ctx.fillStyle = index % 2 === 0 ? `${theme.accent}14` : `${theme.accent}09`;
        ctx.fill();
      }
      break;
    }
    case "grain": {
      const random = seeded(97);
      ctx.fillStyle = theme.dark ? `${theme.accent}1f` : `${theme.accentDeep}1c`;
      for (let index = 0; index < 2200; index += 1) {
        ctx.fillRect(random() * w, random() * h, random() < 0.75 ? 1 : 2, random() < 0.75 ? 1 : 2);
      }
      const glow = ctx.createRadialGradient(w / 2, h * 0.32, 40, w / 2, h * 0.32, w * 0.85);
      glow.addColorStop(0, `${theme.accent}22`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case "bands": {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.42);
      for (const [offset, alpha, width] of [[-420, 0.1, 120], [-180, 0.06, 240], [220, 0.08, 90], [430, 0.05, 190]] as const) {
        ctx.fillStyle = `${theme.accent}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fillRect(-w, offset, w * 2, width);
      }
      break;
    }
    case "dots": {
      const random = seeded(31);
      ctx.fillStyle = `${theme.accent}26`;
      for (let y = 60; y < h * 0.62; y += 26) {
        for (let x = 60; x < w - 40; x += 26) {
          const distance = Math.hypot(x - w * 0.78, y - 60) / 620;
          const radius = Math.max(0, 3.4 - distance * 3.2) * (0.7 + random() * 0.6);
          if (radius <= 0.2) continue;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "vignette": {
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.34, 60, w * 0.5, h * 0.42, w * 0.95);
      glow.addColorStop(0, `${theme.accent}2e`);
      glow.addColorStop(0.55, `${theme.accent}12`);
      glow.addColorStop(1, "rgba(0,0,0,0.32)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }
  ctx.restore();
}

function paintOrnament(s: Scene) {
  if (s.input.backgroundImage || s.input.cinematic) return;
  const { ctx, w, h, theme } = s;
  const kind: FlyerOrnament = theme.ornament;
  ctx.save();
  ctx.strokeStyle = `${theme.accent}7a`;
  ctx.lineWidth = 2;
  const inset = 96;
  switch (kind) {
    case "arc":
      ctx.beginPath();
      ctx.arc(w / 2, 40, 300, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "bracket": {
      const length = 120;
      const corners: [number, number, number, number][] = [
        [inset, inset, 1, 1],
        [w - inset, inset, -1, 1],
        [inset, h - inset, 1, -1],
        [w - inset, h - inset, -1, -1],
      ];
      for (const [x, y, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x + sx * length, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + sy * length);
        ctx.stroke();
      }
      break;
    }
    case "line":
      for (const y of [inset, h - inset]) {
        ctx.beginPath();
        ctx.moveTo(inset, y);
        ctx.lineTo(inset + 150, y);
        ctx.moveTo(w - inset - 150, y);
        ctx.lineTo(w - inset, y);
        ctx.stroke();
      }
      break;
    case "dots":
      for (let index = 0; index < 5; index += 1) {
        ctx.beginPath();
        ctx.arc(w / 2 - 60 + index * 30, inset, index === 2 ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = `${theme.accent}8c`;
        ctx.fill();
      }
      break;
    case "cross":
      ctx.beginPath();
      ctx.moveTo(w / 2, inset - 26);
      ctx.lineTo(w / 2, inset + 26);
      ctx.moveTo(w / 2 - 15, inset - 6);
      ctx.lineTo(w / 2 + 15, inset - 6);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Modelos da biblioteca
 * ------------------------------------------------------------------ */

function renderSede(s: Scene) {
  const { ctx, w, theme, fonts, story, input } = s;
  const emblemR = story ? 58 : 46;
  const emblemY = story ? 108 : 92;
  drawEmblem(s, w / 2, emblemY, emblemR);
  let y = emblemY + emblemR + (story ? 26 : 20);
  y = churchLine(s, y);
  y = drawBlock(s, y, input.copy.headline, {
    font: `italic ${story ? 34 : 28}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 860,
    maxLines: 2,
    lineHeight: story ? 42 : 36,
  }) + 8;
  y = drawBlock(s, y, input.title, {
    font: `600 ${story ? 64 : 52}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 900,
    maxLines: 2,
    lineHeight: story ? 72 : 60,
  });
  if (input.subject) {
    y = drawBlock(s, y + 4, input.subject, {
      font: `italic ${story ? 28 : 22}px ${fonts.display}`,
      color: theme.accent,
      maxWidth: 820,
      maxLines: 2,
      lineHeight: story ? 34 : 28,
    });
  }
  y += story ? 28 : 18;
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 18 : 16}px ${fonts.sans}`;
  ctx.textBaseline = "top";
  tracked(ctx, weekdayName(input.serviceDate).toUpperCase(), y, { tracking: 4, maxWidth: 700, align: "center", x: w / 2 });
  y += story ? 28 : 24;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.font = `600 ${story ? 148 : 112}px ${fonts.display}`;
  ctx.fillText(String(Number(input.serviceDate.slice(8, 10))), w / 2, y);
  y += story ? 150 : 114;
  ctx.fillStyle = theme.accent;
  ctx.font = `500 ${story ? 26 : 22}px ${fonts.sans}`;
  ctx.fillText(`DE ${monthName(input.serviceDate).toUpperCase()}  ·  ${formatTime(input.serviceTime)}`, w / 2, y);
  y += story ? 48 : 40;
  y = verseCard(s, y);
  photosRow(s, y + (story ? 34 : 24));
}

function renderEditorial(s: Scene) {
  const { ctx, w, theme, fonts, story, input, bottom } = s;
  const emblemR = 32;
  drawEmblem(s, s.left + emblemR, 86, emblemR);
  ctx.font = `600 ${story ? 17 : 16}px ${fonts.sans}`;
  ctx.fillStyle = theme.accent;
  ctx.textBaseline = "top";
  tracked(ctx, input.church.name.toUpperCase(), 78, { tracking: 2.6, maxWidth: 620, align: "left", x: s.left + emblemR * 2 + 18 });
  ctx.strokeStyle = `${theme.accent}66`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w - s.left, 78);
  ctx.lineTo(w - s.left, bottom - 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w - s.left, bottom - 40, 5, 0, Math.PI * 2);
  ctx.fillStyle = `${theme.accent}aa`;
  ctx.fill();

  let y = 152;
  y = drawBlock(s, y, input.copy.headline, {
    font: `italic ${story ? 40 : 34}px ${fonts.display}`,
    color: theme.accent,
    maxWidth: s.right - s.left - 40,
    maxLines: 2,
    lineHeight: story ? 48 : 42,
    align: "left",
  });
  y = drawBlock(s, y + 6, input.title, {
    font: `600 ${story ? 62 : 54}px ${fonts.display}`,
    color: theme.text,
    maxWidth: s.right - s.left - 40,
    maxLines: 3,
    lineHeight: story ? 70 : 60,
    align: "left",
  });
  if (input.subject) {
    y = drawBlock(s, y + 4, input.subject, {
      font: `italic ${story ? 28 : 23}px ${fonts.display}`,
      color: theme.text,
      maxWidth: s.right - s.left - 60,
      maxLines: 2,
      lineHeight: story ? 34 : 29,
      align: "left",
    });
  }
  y += story ? 26 : 20;

  ctx.fillStyle = theme.accent;
  ctx.fillRect(s.left, y, 6, story ? 76 : 64);
  ctx.font = `600 ${story ? 22 : 19}px ${fonts.sans}`;
  ctx.fillStyle = theme.accent;
  ctx.textBaseline = "top";
  tracked(
    ctx,
    `${weekdayName(input.serviceDate).toUpperCase()}, ${Number(input.serviceDate.slice(8, 10))} DE ${monthName(input.serviceDate).toUpperCase()}`,
    y + 2,
    { tracking: 2.2, maxWidth: s.right - s.left - 40, align: "left", x: s.left + 24 },
  );
  ctx.font = `600 ${story ? 44 : 38}px ${fonts.display}`;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "left";
  ctx.fillText(formatTime(input.serviceTime), s.left + 24, y + (story ? 38 : 32));
  y += story ? 96 : 82;

  y = verseCard(s, y, "left");
  photosRow(s, Math.max(y + (story ? 30 : 22), bottom - (story ? 300 : 240)), "left");
}

function renderFaixa(s: Scene) {
  const { ctx, w, theme, fonts, story, input } = s;
  const bandH = story ? 176 : 150;
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, w, bandH);
  ctx.fillStyle = theme.bg[2];
  ctx.textBaseline = "top";
  ctx.font = `600 ${story ? 19 : 17}px ${fonts.sans}`;
  tracked(ctx, input.church.name.toUpperCase(), 42, { tracking: 3.4, maxWidth: 940, align: "center", x: w / 2 });
  ctx.font = `600 ${story ? 24 : 21}px ${fonts.sans}`;
  tracked(
    ctx,
    `${weekdayName(input.serviceDate).toUpperCase()} · ${formatLongDate(input.serviceDate).toUpperCase()}`,
    88,
    { tracking: 2, maxWidth: 940, align: "center", x: w / 2 },
  );

  let y = bandH + (story ? 40 : 32);
  y = drawBlock(s, y, input.copy.headline, {
    font: `italic ${story ? 36 : 30}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 880,
    maxLines: 2,
    lineHeight: story ? 44 : 38,
  });
  y = drawBlock(s, y + 4, input.title, {
    font: `600 ${story ? 60 : 50}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 920,
    maxLines: 2,
    lineHeight: story ? 68 : 58,
  });
  if (input.subject) {
    y = drawBlock(s, y + 2, input.subject, {
      font: `italic ${story ? 26 : 21}px ${fonts.display}`,
      color: theme.accent,
      maxWidth: 840,
      maxLines: 2,
      lineHeight: story ? 32 : 27,
    });
  }
  y += story ? 30 : 22;

  const band2H = story ? 168 : 140;
  ctx.fillStyle = theme.cardFill;
  roundRect(ctx, s.left, y, w - s.left * 2, band2H, 18);
  ctx.fill();
  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 20 : 17}px ${fonts.sans}`;
  ctx.fillText("DATA E HORA", w / 2, y + 20);
  ctx.fillStyle = theme.text;
  ctx.font = `600 ${story ? 62 : 52}px ${fonts.display}`;
  ctx.fillText(`${String(Number(input.serviceDate.slice(8, 10))).padStart(2, "0")} DE ${monthName(input.serviceDate).toUpperCase()}`, w / 2, y + (story ? 56 : 48));
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 30 : 26}px ${fonts.sans}`;
  ctx.fillText(formatTime(input.serviceTime), w / 2, y + band2H - (story ? 54 : 46));
  y += band2H + (story ? 32 : 26);

  y = verseCard(s, y);
  photosRow(s, y + (story ? 30 : 22));
}

function renderMinimal(s: Scene) {
  const { ctx, w, theme, fonts, story, input, bottom } = s;
  let y = story ? 170 : 140;
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 17 : 15}px ${fonts.sans}`;
  ctx.textBaseline = "top";
  tracked(ctx, input.church.name.toUpperCase(), y, { tracking: 4.4, maxWidth: 820, align: "center", x: w / 2 });
  y += story ? 30 : 26;
  ctx.strokeStyle = `${theme.accent}99`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 90, y);
  ctx.lineTo(w / 2 + 90, y);
  ctx.stroke();
  y += story ? 32 : 26;

  y = drawBlock(s, y, input.copy.headline, {
    font: `italic ${story ? 30 : 25}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 820,
    maxLines: 2,
    lineHeight: story ? 38 : 32,
  });
  y = drawBlock(s, y + 10, input.title, {
    font: `500 ${story ? 52 : 44}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 900,
    maxLines: 3,
    lineHeight: story ? 60 : 52,
  });
  if (input.subject) {
    y = drawBlock(s, y + 6, input.subject, {
      font: `400 ${story ? 24 : 20}px ${fonts.sans}`,
      color: theme.accent,
      maxWidth: 800,
      maxLines: 2,
      lineHeight: story ? 30 : 26,
    });
  }
  y += story ? 34 : 26;
  y = dateLine(s, y);
  y += story ? 22 : 18;
  ctx.fillStyle = theme.text;
  ctx.textAlign = "center";
  ctx.font = `600 ${story ? 84 : 68}px ${fonts.display}`;
  ctx.fillText(String(Number(input.serviceDate.slice(8, 10))).padStart(2, "0"), w / 2, y);
  y += story ? 96 : 78;
  y += story ? 26 : 20;

  const font = `italic ${story ? 25 : 21}px ${fonts.display}`;
  y = drawBlock(s, y, `“${input.copy.verseText}”`, {
    font,
    color: theme.text,
    maxWidth: 780,
    maxLines: story ? 5 : 4,
    lineHeight: story ? 33 : 28,
  });
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 15 : 13}px ${fonts.sans}`;
  tracked(ctx, input.copy.verseReference.toUpperCase(), y + 4, { tracking: 3, maxWidth: 600, align: "center", x: w / 2 });

  photosRow(s, Math.max(y + (story ? 56 : 46), bottom - (story ? 300 : 240)));
}

function renderGaleria(s: Scene) {
  const { ctx, w, theme, fonts, story, input } = s;
  let y = story ? 96 : 84;
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 18 : 16}px ${fonts.sans}`;
  ctx.textBaseline = "top";
  tracked(ctx, input.church.name.toUpperCase(), y, { tracking: 3.4, maxWidth: 880, align: "center", x: w / 2 });
  y += story ? 34 : 28;

  y = photosGrid(s, y);
  y = drawBlock(s, y, input.copy.headline, {
    font: `italic ${story ? 32 : 26}px ${fonts.display}`,
    color: theme.accent,
    maxWidth: 860,
    maxLines: 2,
    lineHeight: story ? 40 : 33,
  });
  y = drawBlock(s, y + 4, input.title, {
    font: `600 ${story ? 56 : 46}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 920,
    maxLines: 2,
    lineHeight: story ? 64 : 54,
  });
  if (input.subject) {
    y = drawBlock(s, y + 2, input.subject, {
      font: `italic ${story ? 26 : 21}px ${fonts.display}`,
      color: theme.text,
      maxWidth: 840,
      maxLines: 2,
      lineHeight: story ? 32 : 27,
    });
  }
  y += story ? 28 : 22;
  y = dateLine(s, y);
  y += story ? 30 : 24;
  y = verseCard(s, y);
  // As fotos já abriram o cartaz; a base fica livre para o convite respirar.
}

function renderSelo(s: Scene) {
  const { ctx, w, theme, fonts, story, input } = s;
  let y = story ? 96 : 84;
  ctx.font = `600 ${story ? 19 : 17}px ${fonts.sans}`;
  ctx.fillStyle = theme.accent;
  ctx.textBaseline = "top";
  tracked(ctx, input.church.name.toUpperCase(), y, { tracking: 3.6, maxWidth: 880, align: "center", x: w / 2 });
  y += story ? 36 : 30;

  const radius = story ? 168 : 138;
  const cx = w / 2;
  const cy = y + radius;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.strokeStyle = `${theme.accent}9c`;
  for (let index = 0; index < 60; index += 1) {
    const angle = (Math.PI * 2 * index) / 60;
    const inner = radius + 10;
    const outer = radius + (index % 5 === 0 ? 24 : 16);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 17 : 15}px ${fonts.sans}`;
  tracked(ctx, weekdayName(input.serviceDate).toUpperCase(), cy - radius + 34, { tracking: 3.6, maxWidth: radius * 1.6, align: "center", x: cx });
  ctx.fillStyle = theme.text;
  ctx.font = `600 ${story ? 118 : 96}px ${fonts.display}`;
  ctx.textBaseline = "top";
  ctx.fillText(String(Number(input.serviceDate.slice(8, 10))).padStart(2, "0"), cx, cy - (story ? 52 : 44));
  ctx.fillStyle = theme.accent;
  ctx.font = `600 ${story ? 22 : 19}px ${fonts.sans}`;
  ctx.fillText(monthName(input.serviceDate).toUpperCase(), cx, cy + (story ? 62 : 50));
  ctx.font = `600 ${story ? 30 : 26}px ${fonts.sans}`;
  ctx.fillText(formatTime(input.serviceTime), cx, cy + (story ? 96 : 80));

  y = cy + radius + (story ? 46 : 36);
  y = drawBlock(s, y, input.copy.headline, {
    font: `italic ${story ? 32 : 26}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 860,
    maxLines: 2,
    lineHeight: story ? 40 : 33,
  });
  y = drawBlock(s, y + 4, input.title, {
    font: `600 ${story ? 54 : 44}px ${fonts.display}`,
    color: theme.text,
    maxWidth: 920,
    maxLines: 2,
    lineHeight: story ? 62 : 52,
  });
  if (input.subject) {
    y = drawBlock(s, y + 2, input.subject, {
      font: `italic ${story ? 25 : 20}px ${fonts.display}`,
      color: theme.accent,
      maxWidth: 840,
      maxLines: 2,
      lineHeight: story ? 31 : 26,
    });
  }
  y += story ? 26 : 20;
  y = verseCard(s, y);
  photosRow(s, y + (story ? 26 : 18));
}

const RENDERERS: Record<FlyerModelId, (s: Scene) => void> = {
  sede: renderSede,
  editorial: renderEditorial,
  faixa: renderFaixa,
  minimal: renderMinimal,
  galeria: renderGaleria,
  selo: renderSelo,
};

/* ------------------------------------------------------------------ *
 * Rodapé com os dados oficiais
 * ------------------------------------------------------------------ */

function drawFooter(s: Scene) {
  const { ctx, w, h, theme, fonts, story, bottom, input } = s;
  ctx.fillStyle = theme.footerBg;
  ctx.fillRect(0, bottom, w, h - bottom);
  ctx.strokeStyle = theme.footerRule;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(48, bottom);
  ctx.lineTo(w - 48, bottom);
  ctx.stroke();

  let y = bottom + (story ? 28 : 22);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = theme.footerInk;
  ctx.font = `italic ${story ? 24 : 20}px ${fonts.display}`;
  for (const line of limitLines(wrapText(ctx, input.copy.invitation, 900), story ? 4 : 3)) {
    ctx.fillText(line, w / 2, y);
    y += story ? 32 : 26;
  }
  y += 8;
  ctx.font = `500 ${story ? 20 : 18}px ${fonts.sans}`;
  const meta = [`Dirigente  ·  ${input.leaderName}`];
  if (input.intercessors.length) meta.push(`Intercessão  ·  ${input.intercessors.join(", ")}`);
  for (const line of meta) {
    for (const part of limitLines(wrapText(ctx, line, 920), 2)) {
      ctx.fillText(part, w / 2, y);
      y += story ? 28 : 24;
    }
  }
  y += 8;
  ctx.fillStyle = theme.footerRule;
  ctx.font = `600 ${story ? 24 : 21}px ${fonts.display}`;
  ctx.fillText(input.church.pastor, w / 2, y);
  y += story ? 34 : 30;
  ctx.fillStyle = theme.footerMuted;
  ctx.font = `500 ${story ? 18 : 16}px ${fonts.sans}`;
  for (const line of limitLines(wrapText(ctx, input.church.addressFull, 940), 2)) {
    ctx.fillText(line, w / 2, y);
    y += story ? 24 : 22;
  }
  ctx.fillText(`${input.church.email}`, w / 2, y);
  y += story ? 26 : 22;
  ctx.font = `600 ${story ? 15 : 14}px ${fonts.sans}`;
  ctx.fillText(`CNPJ ${input.church.cnpj}`, w / 2, y);
}

/* ------------------------------------------------------------------ *
 * Entrada principal
 * ------------------------------------------------------------------ */

/** Entrada sem modelo nem formato: é o que a biblioteca de miniaturas reaproveita. */
export type FlyerBaseInput = Omit<FlyerDrawInput, "model" | "format">;

export function drawFlyer(ctx: CanvasRenderingContext2D, input: FlyerDrawInput) {
  const { w, h } = FLYER_SIZES[input.format];
  const story = input.format === "story";
  const bottom = story ? 1460 : 1016;
  const scene: Scene = {
    ctx,
    w,
    h,
    story,
    bottom,
    left: 96,
    right: w - 96,
    theme: input.theme,
    fonts: input.fonts,
    input,
    people: [
      { name: input.preacherName, image: input.preacherImage, role: "Pregação", primary: true },
      ...input.singers.slice(0, 4).map((singer) => ({ ...singer, role: "Louvor", primary: false })),
    ],
  };

  // O transform é responsabilidade de quem chama: o cartaz usa coordenadas
  // do espaço 1080px, e as miniaturas da biblioteca entram já escaladas.
  ctx.clearRect(0, 0, w, h);
  paintBackground(scene);
  paintOrnament(scene);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, bottom);
  ctx.clip();
  (RENDERERS[input.model.id] ?? renderSede)(scene);
  ctx.restore();

  drawFooter(scene);

  ctx.strokeStyle = `${input.theme.accent}d9`;
  ctx.lineWidth = 2;
  roundRect(ctx, 26, 26, w - 52, h - 52, 18);
  ctx.stroke();
  ctx.lineWidth = 1;
  roundRect(ctx, 34, 34, w - 68, h - 68, 14);
  ctx.stroke();

  ctx.fillStyle = `${input.theme.accent}e6`;
  ctx.font = `600 13px ${input.fonts.sans}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(formatLongDate(input.serviceDate).toUpperCase(), 52, h - 52);
}

export function loadImage(src: string | null) {
  if (!src) return Promise.resolve(null);
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => resolve(null), 8000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    image.src = src;
  });
}
