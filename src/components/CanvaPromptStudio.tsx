"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCopy, IconExternal, IconSparkles } from "@/components/icons";
import { CanvaMark } from "@/components/CanvaPanel";
import { Badge, Button, Segmented } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import type { FlyerResponse } from "@/lib/api";
import {
  buildCanvaPromptPack,
  CANVA_BACKGROUND_STYLES,
  type CanvaBackgroundStyle,
  type CanvaPromptContext,
} from "@/lib/canva-prompts";
import { FLYER_FORMATS, type FlyerFormat } from "@/lib/flyer-canvas";

type StudioTab = "colar" | "texto" | "fundo" | "studio" | "dicas";

const TAB_LABEL: Record<StudioTab, string> = {
  colar: "Textos prontos",
  texto: "Prompt 1 · Texto",
  fundo: "Prompt 2 · Fundo",
  studio: "Magic Studio",
  dicas: "Como montar",
};

const CANVA_HOME = "https://www.canva.com/";
const CANVA_MAGIC_WRITE = "https://www.canva.com/magic-write/";
const CANVA_MAGIC_MEDIA = "https://www.canva.com/magic-media/";

function contextFrom(data: FlyerResponse, format: FlyerFormat): CanvaPromptContext {
  const dims = FLYER_FORMATS.find((item) => item.id === format) ?? FLYER_FORMATS[1] ?? FLYER_FORMATS[0];
  return {
    title: data.service.title,
    kind: data.service.kind,
    theme: data.service.theme,
    scripture: data.service.scripture,
    dateBR: data.service.dateBR,
    dateLong: data.service.dateLong,
    time: data.service.time,
    leader: data.service.leader,
    preacherName: data.service.preacherName,
    singers: data.service.singers.map((singer) => singer.name),
    intercessors: data.service.intercessors,
    churchName: data.church.name,
    president: data.church.president,
    addressFull: data.church.addressFull,
    phone: data.church.phone,
    email: data.church.email,
    cnpj: data.church.cnpj,
    copy: data.copy,
    paletteId: data.church.flyerPalette,
    format: { width: dims.width, height: dims.height, label: dims.label },
  };
}

/** Bloco de prompts pronto para copiar (Prompt 1 + Prompt 2). */
function combined(pack: { textPrompt: string; backgroundPrompt: string }): string {
  return [
    "========== PROMPT 1 — TEXTOS (cole no Magic Write) ==========",
    pack.textPrompt,
    "",
    "========== PROMPT 2 — FUNDO (cole no Magic Media) ==========",
    pack.backgroundPrompt,
  ].join("\n");
}

/**
 * Estúdio de prompts para o Canva: gera Prompt 1 (textos), Prompt 2 (fundo),
 * Magic Studio, textos prontos e dicas — tudo personalizado com o culto.
 * O fluxo principal é: copiar → abrir o Canva → colar.
 */
export function CanvaPromptStudio({
  data,
  format,
  onFormatChange,
}: {
  data: FlyerResponse;
  format: FlyerFormat;
  onFormatChange?: (format: FlyerFormat) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<StudioTab>("colar");
  const [styleId, setStyleId] = useState<string>(() => {
    const kind = (data.service.kind ?? "").toLowerCase();
    if (kind.includes("ceia")) return "communion";
    if (kind.includes("joven")) return "youth";
    if (kind.includes("vigil") || kind.includes("ora")) return "prayer";
    if (kind.includes("fam") || kind.includes("celebra")) return "family";
    return "cinematic";
  });
  const autoTried = useRef(false);

  const pack = useMemo(
    () => buildCanvaPromptPack(contextFrom(data, format), styleId),
    [data, format, styleId],
  );

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", `${label} copiado`, "Cole no Canva (Ctrl/Cmd + V) e pronto.");
      return true;
    } catch {
      toast("error", "Não foi possível copiar", "Seu navegador bloqueou a área de transferência — selecione o texto manualmente.");
      return false;
    }
  }

  /** Cópia automática do bloco combinado assim que o prompt fica pronto. */
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const timer = setTimeout(() => {
      void navigator.clipboard
        ?.writeText(combined(pack))
        .then(() => toast("info", "Prompts copiados automaticamente", "Abra o Canva e cole no Magic Write / Magic Media."))
        .catch(() => undefined);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openTab(url: string) {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) toast("warning", "Pop-up bloqueado", "Permita pop-ups ou abra canva.com manualmente.");
  }

  /** Ação principal: abre o Canva e copia os prompts de uma vez. */
  async function copyAndOpen() {
    const popup = window.open(CANVA_HOME, "_blank", "noopener,noreferrer");
    const ok = await copy(combined(pack), "Prompts 1 e 2");
    if (!popup) {
      toast("warning", "Pop-up bloqueado", "Permita pop-ups para abrir o Canva automaticamente.");
    } else if (ok) {
      toast("info", "Agora é só colar", "Prompt 1 → Magic Write · Prompt 2 → Magic Media.");
    }
  }

  const body: Record<StudioTab, string> = {
    colar: pack.readyCopy,
    texto: pack.textPrompt,
    fundo: pack.backgroundPrompt,
    studio: pack.studioPrompt,
    dicas: pack.tips.map((tip, index) => `${index + 1}. ${tip}`).join("\n\n"),
  };

  const help: Record<StudioTab, string> = {
    colar: "Copie e cole cada linha em um elemento de texto do Canva. Não precisa de IA.",
    texto: "Cole no Magic Write do Canva (ou no ChatGPT) para gerar variações do texto do flyer.",
    fundo: "Cole no Magic Media do Canva para gerar o fundo. Depois envie a foto do pregador por cima.",
    studio: "Prompt único para o Magic Studio — descreve layout, cores, textos e fundo de uma vez.",
    dicas: "Passo a passo para montar o flyer no Canva à mão, com buscas e tipografia.",
  };

  return (
    <div className="space-y-4">
      {/* Fluxo principal: copiar e abrir o Canva */}
      <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
          Fluxo em 3 passos
        </p>
        <ol className="mt-2 grid gap-1.5 text-[12.5px] leading-snug text-ink-600 sm:grid-cols-3">
          <li className="flex gap-1.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">1</span>
            O sistema gera o prompt com os dados do culto
          </li>
          <li className="flex gap-1.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">2</span>
            Você copia com um clique (ou já está copiado)
          </li>
          <li className="flex gap-1.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white">3</span>
            Abre o Canva e cola no Magic Write / Magic Media
          </li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="gold" onClick={() => void copyAndOpen()}>
            <CanvaMark size={16} />
            Copiar prompts e abrir o Canva
          </Button>
          <Button type="button" variant="outline" onClick={() => void copy(pack.textPrompt, "Prompt 1 (texto)")}>
            <IconCopy size={15} />
            Só o Prompt 1
          </Button>
          <Button type="button" variant="outline" onClick={() => void copy(pack.backgroundPrompt, "Prompt 2 (fundo)")}>
            <IconCopy size={15} />
            Só o Prompt 2
          </Button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openTab(CANVA_MAGIC_WRITE)}>
            <IconSparkles size={15} />
            Magic Write
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openTab(CANVA_MAGIC_MEDIA)}>
            <IconExternal size={15} />
            Magic Media
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
            <CanvaMark size={18} />
            Prompts personalizados deste culto
          </p>
          <p className="mt-0.5 text-[13px] text-ink-500">
            {data.service.title} · {data.service.dateBR} às {data.service.time}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{pack.style.label}</Badge>
          {onFormatChange ? (
            <Segmented
              value={format}
              onChange={onFormatChange}
              options={FLYER_FORMATS.map((item) => ({
                value: item.id,
                label: `${item.label} ${item.width}×${item.height}`,
              }))}
            />
          ) : (
            <Badge tone="neutral">{pack.style.description.slice(0, 0) || `${pack.style.label}`}</Badge>
          )}
        </div>
      </div>

      {/* Estilo de fundo */}
      <section>
        <p className="label">Estilo do fundo (Prompt 2)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CANVA_BACKGROUND_STYLES.map((style) => (
            <StyleChip key={style.id} style={style} active={style.id === styleId} onSelect={() => setStyleId(style.id)} />
          ))}
        </div>
      </section>

      {/* Abas */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(TAB_LABEL) as StudioTab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              tab === item
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-line bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700"
            }`}
          >
            {TAB_LABEL[item]}
          </button>
        ))}
      </div>

      <p className="text-[12.5px] leading-snug text-ink-500">{help[tab]}</p>

      {tab === "fundo" ? (
        <p className="rounded-lg border border-gold-200 bg-[#fdf8ec] px-3 py-2 text-[12px] leading-snug text-[#7a5a12]">
          Busque também no Canva por:{" "}
          {pack.searchTerms.map((term) => (
            <button
              key={term}
              type="button"
              className="mr-1 mt-1 inline-flex rounded-full bg-white px-2 py-0.5 font-semibold text-[#7a5a12] ring-1 ring-[#f0e0b6] hover:bg-[#fff8e8]"
              onClick={() => void copy(term, "Termo de busca")}
            >
              {term}
            </button>
          ))}
        </p>
      ) : null}

      <div className="rounded-xl border border-line bg-ink-950 p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-200">{TAB_LABEL[tab]}</p>
          <button
            type="button"
            onClick={() => void copy(body[tab], TAB_LABEL[tab])}
            className="btn btn-sm border border-white/15 bg-white/5 text-white hover:bg-white/12"
          >
            <IconCopy size={14} />
            Copiar
          </button>
        </div>
        <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-ink-100">
          {body[tab]}
        </pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="primary" onClick={() => void copy(body[tab], TAB_LABEL[tab])}>
          <IconCopy size={15} />
          Copiar {TAB_LABEL[tab].toLowerCase()}
        </Button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => openTab(CANVA_HOME)}>
          <CanvaMark size={15} />
          Abrir o Canva
        </button>
        <a href="https://www.canva.com/magic-studio/" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          <IconExternal size={15} />
          Magic Studio
        </a>
      </div>
    </div>
  );
}

function StyleChip({
  style,
  active,
  onSelect,
}: {
  style: CanvaBackgroundStyle;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      title={style.description}
      className={`rounded-xl border px-2.5 py-2 text-left transition ${
        active ? "border-brand-500 bg-brand-50 shadow-sm" : "border-line bg-white hover:border-brand-300"
      }`}
    >
      <span className={`block text-[12px] font-semibold ${active ? "text-brand-700" : "text-ink-800"}`}>
        {style.label}
      </span>
      <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-ink-400">{style.description}</span>
    </button>
  );
}
