"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconImage,
  IconPrinter,
  IconRefresh,
  IconSparkles,
} from "@/components/icons";
import { CanvaMark, CanvaPanel } from "@/components/CanvaPanel";
import { CanvaPromptStudio } from "@/components/CanvaPromptStudio";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, Segmented, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage, type FlyerResponse } from "@/lib/api";
import { canvasToBlob, FLYER_FORMATS, renderFlyer, type FlyerFormat } from "@/lib/flyer-canvas";
import { FLYER_THEMES, getTheme, isThemeId, themeGradient, type FlyerThemeId } from "@/lib/flyer-themes";
import { slugify } from "@/lib/format";
import type { ServiceDTO } from "@/lib/types";

type Tab = "flyer" | "canva" | "prompt" | "legenda";

const THEME_STORAGE_KEY = "rec-flyer-theme";
const FORMAT_STORAGE_KEY = "rec-flyer-format";

function readStoredTheme(): FlyerThemeId | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(value) ? value : null;
  } catch {
    return null;
  }
}

function readStoredFormat(): FlyerFormat {
  try {
    const value = window.localStorage.getItem(FORMAT_STORAGE_KEY);
    return value === "stories" ? "stories" : "feed";
  } catch {
    return "feed";
  }
}

export function FlyerDialog({
  open,
  onClose,
  service,
}: {
  open: boolean;
  onClose: () => void;
  service: ServiceDTO;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("flyer");
  const [data, setData] = useState<FlyerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [theme, setTheme] = useState<FlyerThemeId>("royal");
  const [format, setFormat] = useState<FlyerFormat>("stories");
  const [mounted, setMounted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderToken = useRef(0);

  useEffect(() => {
    setMounted(true);
    setFormat(readStoredFormat());
  }, []);

  /* ------------------------- geração do conteúdo ------------------------- */
  const generate = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const response = await api.flyer.generate(service.id);
      setData(response);
      // Tema inicial: preferência salva no navegador > padrão configurado na igreja.
      const stored = readStoredTheme();
      setTheme(stored ?? (isThemeId(response.church.flyerPalette) ? response.church.flyerPalette : "royal"));
      if (response.notice) {
        toast("info", "Conteúdo gerado localmente", response.notice);
      } else {
        toast("success", "Conteúdo do flyer pronto", `Texto criado via ${response.model}.`);
      }
    } catch (error) {
      setFailure(errorMessage(error));
      toast("error", "Falha ao gerar o flyer", errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [service.id, toast]);

  useEffect(() => {
    if (open && !data && !loading) void generate();
    if (!open) setTab("flyer");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ------------------------- renderização no canvas ---------------------- */
  useEffect(() => {
    if (!data) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const token = ++renderToken.current;
    setRendering(true);

    renderFlyer(canvas, data, { theme, format })
      .catch((error: unknown) => {
        if (token === renderToken.current) {
          toast("error", "Falha ao desenhar o flyer", errorMessage(error));
        }
      })
      .finally(() => {
        if (token === renderToken.current) setRendering(false);
      });
  }, [data, theme, format, toast]);

  function chooseTheme(next: FlyerThemeId) {
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // sem armazenamento local: apenas não persiste a preferência
    }
  }

  function chooseFormat(next: FlyerFormat) {
    setFormat(next);
    try {
      window.localStorage.setItem(FORMAT_STORAGE_KEY, next);
    } catch {
      // idem
    }
  }

  /* ------------------------------ ações ---------------------------------- */
  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", `${label} copiado`, "Cole onde precisar (WhatsApp, Instagram, ChatGPT).");
    } catch {
      toast("error", "Não foi possível copiar", "Seu navegador bloqueou o acesso à área de transferência.");
    }
  }

  function fileName(extension: string) {
    if (!data) return `flyer.${extension}`;
    return `flyer-${slugify(data.service.title)}-${data.service.dateISO}-${theme}-${format}.${extension}`;
  }

  async function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    setExporting(true);
    try {
      const blob = await canvasToBlob(canvas, "image/png");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName("png");
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      const dims = FLYER_FORMATS.find((item) => item.id === format);
      toast("success", "Flyer baixado", `Imagem ${dims?.width}×${dims?.height} salva no seu dispositivo.`);
    } catch (error) {
      toast("error", "Falha ao exportar", errorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  async function copyImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (typeof ClipboardItem === "undefined") throw new Error("sem suporte");
      const blob = await canvasToBlob(canvas, "image/png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("success", "Imagem copiada", "Cole diretamente no WhatsApp, e-mail ou editor.");
    } catch {
      toast("warning", "Copiar imagem indisponível", "Use “Baixar PNG” — este navegador não permite copiar imagens.");
    }
  }

  function printFlyer() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL("image/png");
    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");
    if (!popup) {
      toast("warning", "Pop-up bloqueado", "Permita pop-ups para imprimir ou use “Baixar PNG”.");
      return;
    }
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${fileName("png")}</title>
<style>html,body{margin:0;padding:0;background:#fff}img{display:block;width:100%;max-height:100vh;object-fit:contain;margin:0 auto}@page{margin:8mm}</style>
</head><body><img src="${image}" alt="Flyer do culto" onload="setTimeout(function(){window.print();},150)"></body></html>`);
    popup.document.close();
  }

  if (!mounted) return null;

  const activeTheme = getTheme(theme);
  const activeFormat = FLYER_FORMATS.find((item) => item.id === format) ?? FLYER_FORMATS[0];

  return createPortal(
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Gerar flyer do culto"
      description={data ? `${data.service.title} · ${data.service.dateBR} às ${data.service.time}` : service.title}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" variant="outline" onClick={() => void generate()} disabled={loading}>
            <IconRefresh size={16} />
            Regenerar texto
          </Button>
          <Button type="button" variant="outline" onClick={printFlyer} disabled={!data || loading || rendering}>
            <IconPrinter size={16} />
            Imprimir
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => void downloadPng()}
            disabled={!data || loading || rendering}
            loading={exporting}
          >
            {exporting ? null : <IconDownload size={16} />}
            {exporting ? "Gerando imagem…" : `Baixar PNG ${activeFormat.width}×${activeFormat.height}`}
          </Button>
        </>
      }
    >
      {failure ? (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
          <strong className="font-semibold">Não foi possível gerar o flyer.</strong>
          <p className="mt-1">{failure}</p>
          <Button type="button" variant="danger" size="sm" className="mt-3" onClick={() => void generate()}>
            <IconRefresh size={15} />
            Tentar novamente
          </Button>
        </div>
      ) : loading && !data ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Spinner size={30} className="text-brand-600" />
          <div>
            <p className="font-display text-sm font-bold text-ink-900">Montando o flyer…</p>
            <p className="mt-1 text-[13px] text-ink-500">
              Coletando dados do culto, fotos da equipe e informações oficiais da igreja.
            </p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "flyer", label: "Flyer", icon: <IconImage size={15} /> },
                { value: "canva", label: "Canva", icon: <CanvaMark size={15} /> },
                { value: "prompt", label: "Prompts Canva", icon: <IconSparkles size={15} /> },
                { value: "legenda", label: "Legenda", icon: <IconCopy size={15} /> },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={data.source === "openai" ? "success" : "gold"}>
                {data.source === "openai" ? `ChatGPT · ${data.model}` : "Texto: gerador local"}
              </Badge>
              <Badge tone="brand">Arte: Canvas</Badge>
              {loading || rendering ? <Spinner size={14} className="text-brand-600" /> : null}
            </div>
          </div>

          {data.notice ? (
            <p className="rounded-lg border border-gold-200 bg-[#fdf8ec] px-3 py-2 text-[12.5px] leading-snug text-[#7a5a12]">
              {data.notice}
            </p>
          ) : null}

          {/* ------------------------------- FLYER ------------------------------- */}
          <div className={tab === "flyer" ? "flex flex-col gap-5 lg:flex-row lg:items-start" : "hidden"}>
            {/* Pré-visualização */}
            <div className="mx-auto w-full max-w-[380px] shrink-0 lg:mx-0">
              <div
                className="relative overflow-hidden rounded-2xl shadow-pop"
                style={{ aspectRatio: `${activeFormat.width} / ${activeFormat.height}`, background: themeGradient(activeTheme) }}
              >
                <canvas
                  ref={canvasRef}
                  className="block h-full w-full"
                  aria-label={`Pré-visualização do flyer no tema ${activeTheme.label}`}
                />
                {rendering ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/25 backdrop-blur-[1px]">
                    <span className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-800 shadow">
                      <Spinner size={14} className="text-brand-600" />
                      Desenhando…
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-center text-[11px] text-ink-400">
                {activeFormat.width}×{activeFormat.height}px · {activeFormat.hint} · tema {activeTheme.label}
              </p>
            </div>

            {/* Controles */}
            <div className="min-w-0 flex-1 space-y-4">
              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="label mb-0">Tema visual</p>
                  <span className="text-[11px] text-ink-400">{activeTheme.description}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                  {FLYER_THEMES.map((item) => {
                    const active = item.id === theme;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseTheme(item.id)}
                        aria-pressed={active}
                        title={item.description}
                        className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition ${
                          active
                            ? "border-brand-500 bg-brand-50 shadow-sm"
                            : "border-line bg-white hover:border-brand-300"
                        }`}
                      >
                        <span
                          className="relative grid h-12 w-full place-items-center overflow-hidden rounded-lg ring-1 ring-black/5"
                          style={{ background: themeGradient(item) }}
                        >
                          <span
                            className="h-4 w-4 rounded-full ring-2 ring-white/70"
                            style={{ background: item.accent }}
                            aria-hidden="true"
                          />
                          {active ? (
                            <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-brand-700">
                              <IconCheck size={11} />
                            </span>
                          ) : null}
                        </span>
                        <span className={`text-[11px] font-semibold ${active ? "text-brand-700" : "text-ink-600"}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className="label">Formato</p>
                <div className="grid grid-cols-2 gap-2">
                  {FLYER_FORMATS.map((item) => {
                    const active = item.id === format;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => chooseFormat(item.id)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          active ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:border-brand-300"
                        }`}
                      >
                        <span
                          className={`shrink-0 rounded-[3px] border-2 ${active ? "border-brand-600" : "border-ink-300"}`}
                          style={{ width: 16, height: item.id === "stories" ? 28 : 20 }}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className={`block text-sm font-semibold ${active ? "text-brand-700" : "text-ink-800"}`}>
                            {item.label}
                          </span>
                          <span className="block truncate text-[11px] text-ink-400">
                            {item.width}×{item.height} · {item.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void copyImage()} disabled={rendering}>
                  <IconCopy size={15} />
                  Copiar imagem
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyText(data.copy.socialCaption, "Legenda")}>
                  <IconCopy size={15} />
                  Copiar legenda
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyText(data.prompt, "Prompt")}>
                  <IconSparkles size={15} />
                  Copiar prompt
                </Button>
              </section>

              <InfoBlock
                title="Dados usados no flyer"
                items={[
                  ["Culto", `${data.service.title}${data.service.kind ? ` · ${data.service.kind}` : ""}`],
                  ["Data e hora", `${data.service.dateLong} · ${data.service.time}`],
                  ["Dirigente", data.service.leader],
                  ["Pregador", data.service.preacherName ?? "não informado"],
                  ["Cantores", data.service.singers.map((singer) => singer.name).join(", ") || "nenhum"],
                  ["Intercessores", data.service.intercessors.join(", ") || "nenhum"],
                  ["Versículo", `${data.copy.verse} (${data.copy.verseReference})`],
                ]}
              />
              <InfoBlock
                title="Dados da igreja (rodapé)"
                items={[
                  ["Igreja", data.church.name],
                  ["Presidente", data.church.president ?? "—"],
                  ["Endereço", data.church.addressFull],
                  ["Contato", data.church.phone ?? "—"],
                  ["E-mail", data.church.email ?? "—"],
                  ["CNPJ", data.church.cnpj ?? "—"],
                ]}
              />
            </div>
          </div>

          {/* ------------------------------- CANVA ------------------------------- */}
          {tab === "canva" ? (
            <CanvaPanel
              serviceId={data.service.id}
              serviceTitle={data.service.title}
              format={`${activeFormat.label} ${activeFormat.width}×${activeFormat.height}`}
              getImage={async () => {
                const canvas = canvasRef.current;
                if (!canvas || rendering) return null;
                return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
              }}
            />
          ) : null}

          {/* ------------------------------- PROMPT ------------------------------ */}
          {tab === "prompt" ? <CanvaPromptStudio data={data} format={format} /> : null}

          {/* ------------------------------- LEGENDA ----------------------------- */}
          {tab === "legenda" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-surface/60 p-4">
                <p className="label mb-2">Legenda para WhatsApp / Instagram</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-800">{data.copy.socialCaption}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.copy.hashtags.map((tag) => (
                    <Badge key={tag} tone="brand">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  className="mt-3"
                  onClick={() =>
                    void copyText(`${data.copy.socialCaption}\n\n${data.copy.hashtags.join(" ")}`, "Legenda")
                  }
                >
                  <IconCopy size={15} />
                  Copiar legenda com hashtags
                </Button>
              </div>
              <div className="rounded-xl border border-line p-4">
                <p className="label mb-2">Instruções de design sugeridas</p>
                <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink-600">
                  {data.copy.layoutNotes.map((note, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>,
    document.body,
  );
}

/* ------------------------------ auxiliares ------------------------------ */

function InfoBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-line bg-surface/60 p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      <dl className="mt-2 space-y-1.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 text-[13px]">
            <dt className="shrink-0 text-ink-500">{label}</dt>
            <dd className="min-w-0 text-right font-medium text-ink-900">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
