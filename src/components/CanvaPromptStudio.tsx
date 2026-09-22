"use client";

import { useMemo, useState } from "react";
import { IconCopy, IconSparkles } from "@/components/icons";
import { CanvaMark } from "@/components/CanvaPanel";
import { Badge, Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import type { FlyerResponse } from "@/lib/api";
import {
  buildCanvaPromptPack,
  CANVA_BACKGROUND_STYLES,
  type CanvaBackgroundStyle,
  type CanvaPromptContext,
} from "@/lib/canva-prompts";
import type { FlyerFormat } from "@/lib/flyer-canvas";
import { FLYER_FORMATS } from "@/lib/flyer-canvas";

type StudioTab = "colar" | "texto" | "fundo" | "studio" | "dicas";

const TAB_LABEL: Record<StudioTab, string> = {
  colar: "Textos prontos",
  texto: "Prompt 1 · Texto",
  fundo: "Prompt 2 · Fundo",
  studio: "Magic Studio",
  dicas: "Como montar",
};

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

export function CanvaPromptStudio({
  data,
  format,
}: {
  data: FlyerResponse;
  format: FlyerFormat;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<StudioTab>("colar");
  const [styleId, setStyleId] = useState<string>(() => {
    const kind = data.service.kind ?? "";
    if (kind.toLowerCase().includes("ceia")) return "communion";
    if (kind.toLowerCase().includes("joven")) return "youth";
    if (kind.toLowerCase().includes("vigil") || kind.toLowerCase().includes("ora")) return "prayer";
    return "cinematic";
  });

  const pack = useMemo(
    () => buildCanvaPromptPack(contextFrom(data, format), styleId),
    [data, format, styleId],
  );

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", `${label} copiado`, "Cole no Magic Write, Magic Media ou em um elemento de texto do Canva.");
    } catch {
      toast("error", "Não foi possível copiar", "Seu navegador bloqueou a área de transferência.");
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
    texto: "Cole no Magic Write do Canva (ou no ChatGPT) para gerar variações do texto.",
    fundo: "Cole no Magic Media do Canva para gerar o fundo. Depois envie a foto do pregador por cima.",
    studio: "Prompt único para o Magic Studio — descreve layout, cores, textos e fundo de uma vez.",
    dicas: "Passo a passo para montar o flyer no Canva à mão, com buscas e tipografia.",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
            <CanvaMark size={18} />
            Prompts prontos para o Canva
          </p>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Personalizados com os dados deste culto. Copie, cole e gere — ou monte à mão com as dicas.
          </p>
        </div>
        <Badge tone="brand">{pack.style.label}</Badge>
      </div>

      {/* Estilo de fundo */}
      <section>
        <p className="label">Estilo do fundo (Prompt 2)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {CANVA_BACKGROUND_STYLES.map((style) => (
            <StyleChip
              key={style.id}
              style={style}
              active={style.id === styleId}
              onSelect={() => setStyleId(style.id)}
            />
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
        {tab !== "texto" ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void copy(pack.textPrompt, "Prompt 1")}>
            <IconSparkles size={15} />
            Copiar Prompt 1
          </Button>
        ) : null}
        {tab !== "fundo" ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void copy(pack.backgroundPrompt, "Prompt 2")}>
            <IconSparkles size={15} />
            Copiar Prompt 2
          </Button>
        ) : null}
        <a
          href="https://www.canva.com/magic-studio/"
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline btn-sm"
        >
          <CanvaMark size={14} />
          Abrir Magic Studio
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
