"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCopy, IconExternal, IconRefresh, IconSparkles } from "@/components/icons";
import { CanvaMark, CanvaPanel } from "@/components/CanvaPanel";
import { CanvaPromptStudio } from "@/components/CanvaPromptStudio";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, Segmented, Spinner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage, type FlyerResponse } from "@/lib/api";
import type { FlyerFormat } from "@/lib/flyer-canvas";
import type { ServiceDTO } from "@/lib/types";

type Tab = "prompt" | "modelos" | "legenda";

const CANVA_HOME = "https://www.canva.com/";
const CANVA_MAGIC_WRITE = "https://www.canva.com/magic-write/";
const FORMAT_STORAGE_KEY = "rec-flyer-format";

function readStoredFormat(): FlyerFormat {
  try {
    const value = window.localStorage.getItem(FORMAT_STORAGE_KEY);
    return value === "stories" ? "stories" : "feed";
  } catch {
    return "feed";
  }
}

/**
 * Fluxo principal do flyer: gera o prompt personalizado com os dados do
 * culto, copia para a área de transferência e abre o Canva — o usuário
 * só cola no Magic Write / Magic Media. Nada é desenhado no site.
 */
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
  const [tab, setTab] = useState<Tab>("prompt");
  const [data, setData] = useState<FlyerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [format, setFormat] = useState<FlyerFormat>("feed");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFormat(readStoredFormat());
  }, []);

  /* --------------------------- geração do prompt -------------------------- */
  const generate = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    try {
      const response = await api.flyer.generate(service.id);
      setData(response);
      toast(
        "success",
        "Prompt gerado",
        response.notice
          ? `${response.notice}`
          : `Texto criado via ${response.model}. Copie e cole no Canva.`,
      );
    } catch (error) {
      setFailure(errorMessage(error));
      toast("error", "Falha ao gerar o prompt", errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [service.id, toast]);

  useEffect(() => {
    if (open && !data && !loading) void generate();
    if (!open) setTab("prompt");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function changeFormat(next: FlyerFormat) {
    setFormat(next);
    try {
      window.localStorage.setItem(FORMAT_STORAGE_KEY, next);
    } catch {
      // armazenamento indisponível: mantém só em memória
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", `${label} copiado`, "Cole no Canva e pronto.");
    } catch {
      toast("error", "Não foi possível copiar", "Seu navegador bloqueou a área de transferência.");
    }
  }

  function openCanva(url: string) {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) toast("warning", "Pop-up bloqueado", "Permita pop-ups ou abra canva.com em outra aba.");
  }

  if (!mounted) return null;

  return createPortal(
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Criar flyer no Canva"
      description={
        data
          ? `${data.service.title} · ${data.service.dateBR} às ${data.service.time} — prompt pronto para colar no Canva`
          : service.title
      }
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" variant="outline" onClick={() => void generate()} disabled={loading}>
            {loading ? <Spinner size={15} /> : <IconRefresh size={16} />}
            {loading ? "Gerando…" : "Gerar novamente"}
          </Button>
          <Button type="button" variant="primary" onClick={() => openCanva(CANVA_HOME)}>
            <CanvaMark size={16} />
            Abrir Canva
          </Button>
        </>
      }
    >
      {failure ? (
        <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-sm text-danger">
          <strong className="font-semibold">Não foi possível gerar o prompt.</strong>
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
            <p className="font-display text-sm font-bold text-ink-900">Montando o prompt…</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-500">
              Lendo data, hora, pregador, dirigente, cantores e dados oficiais da igreja.
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
                { value: "prompt", label: "Prompt", icon: <IconSparkles size={15} /> },
                { value: "modelos", label: "Modelos", icon: <CanvaMark size={15} /> },
                { value: "legenda", label: "Legenda", icon: <IconCopy size={15} /> },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={data.source === "openai" ? "success" : "gold"}>
                {data.source === "openai" ? `ChatGPT · ${data.model}` : "Texto: gerador local"}
              </Badge>
              {loading ? <Spinner size={14} className="text-brand-600" /> : null}
            </div>
          </div>

          {data.notice ? (
            <p className="rounded-lg border border-gold-200 bg-[#fdf8ec] px-3 py-2 text-[12.5px] leading-snug text-[#7a5a12]">
              {data.notice}
            </p>
          ) : null}

          {/* -------------------------------- PROMPT ------------------------------- */}
          {tab === "prompt" ? (
            <CanvaPromptStudio data={data} format={format} onFormatChange={changeFormat} />
          ) : null}

          {/* -------------------------------- MODELOS ------------------------------ */}
          {tab === "modelos" ? (
            <CanvaPanel serviceId={data.service.id} serviceTitle={data.service.title} />
          ) : null}

          {/* -------------------------------- LEGENDA ------------------------------ */}
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      void copyText(`${data.copy.socialCaption}\n\n${data.copy.hashtags.join(" ")}`, "Legenda")
                    }
                  >
                    <IconCopy size={15} />
                    Copiar legenda com hashtags
                  </Button>
                  <a
                    href={CANVA_MAGIC_WRITE}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    <IconExternal size={15} />
                    Abrir Magic Write
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>,
    document.body,
  );
}
