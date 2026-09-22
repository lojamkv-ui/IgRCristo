"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconCheck,
  IconExternal,
  IconImage,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconX,
} from "@/components/icons";
import { Badge, Button, Skeleton, Spinner, TextInput } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, errorMessage, type CanvaDesignResult, type CanvaStatus, type CanvaTemplateItem } from "@/lib/api";
import { formatRelative } from "@/lib/format";

/** Ícone do Canva (marca simplificada em SVG). */
export function CanvaMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#00C4CC" />
      <path
        d="M21.6 18.9c-.5 2.6-3 5.1-6.2 5.1-3.6 0-6-3-6-6.7 0-4.9 3.4-9.3 7.6-9.3 2.4 0 3.9 1.3 3.9 3.2 0 1.4-.9 2.4-2 2.4-.9 0-1.5-.6-1.5-1.4 0-.7.4-1 .4-1.6 0-.6-.5-1-1.3-1-2 0-3.9 3-3.9 6.5 0 2.7 1.4 4.4 3.5 4.4 1.9 0 3.6-1.5 4.2-3.5.1-.4.5-.6.8-.5.4.1.6.4.5.8z"
        fill="#fff"
      />
    </svg>
  );
}

type Step = "idle" | "working" | "done";

/**
 * Modelos do Canva: lista os designs e brand templates da conta do usuário
 * e abre um deles já com as fotos do culto na biblioteca de uploads.
 * O texto/fundo vem dos prompts — nada é desenhado aqui.
 */
export function CanvaPanel({
  serviceId,
  serviceTitle,
}: {
  serviceId: number;
  serviceTitle: string;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<CanvaStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [templates, setTemplates] = useState<CanvaTemplateItem[] | null>(null);
  const [brandNotice, setBrandNotice] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CanvaTemplateItem | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<CanvaDesignResult | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const response = await api.canva.status(serviceId);
      setStatus(response.data);
    } catch (error) {
      toast("error", "Falha ao verificar o Canva", errorMessage(error));
    } finally {
      setLoadingStatus(false);
    }
  }, [serviceId, toast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const loadTemplates = useCallback(
    async (q: string) => {
      setLoadingTemplates(true);
      try {
        const response = await api.canva.templates(q || undefined);
        setTemplates(response.data);
        setBrandNotice(response.brandTemplatesUnavailable);
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError?.status === 401) {
          toast("warning", "Sessão do Canva expirou", "Conecte novamente em Configurações.");
          void loadStatus();
        } else {
          toast("error", "Falha ao listar modelos", errorMessage(error));
        }
        setTemplates([]);
      } finally {
        setLoadingTemplates(false);
      }
    },
    [toast, loadStatus],
  );

  useEffect(() => {
    if (!status?.connected) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void loadTemplates(query), templates === null ? 0 : 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status?.connected]);

  async function useTemplate(item: CanvaTemplateItem) {
    setStep("working");
    setResult(null);
    try {
      const response = await api.canva.createDesign({
        serviceId,
        mode: item.kind === "brand_template" ? "autofill" : "open",
        templateId: item.id,
        templateTitle: item.title,
        templateKind: item.kind,
        uploadPhotos: true,
      });
      setResult(response.data);
      setStep("done");
      if (response.data.source === "autofill") {
        toast(
          "success",
          "Modelo preenchido",
          `${response.data.filledFields.length} campo(s) preenchido(s) automaticamente.`,
        );
      } else {
        toast("success", "Modelo pronto no Canva", "As fotos do culto já estão na sua biblioteca de uploads.");
      }
      void loadStatus();
    } catch (error) {
      setStep("idle");
      toast("error", "Não foi possível usar o modelo", errorMessage(error));
    }
  }

  /* ---------------------------------- render ---------------------------------- */

  if (loadingStatus && !status) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <Notice
        title="Integração com o Canva não configurada"
        body={
          <>
            Para listar e abrir modelos da sua conta, crie um app em <strong>canva.com/developers</strong>{" "}
            (Connect API) e defina <code>CANVA_CLIENT_ID</code> e <code>CANVA_CLIENT_SECRET</code> no servidor.
            Sem a integração, a aba <strong>Prompt</strong> já copia o Prompt 1 e o Prompt 2 para você colar
            direto no Magic Write / Magic Media.
          </>
        }
        action={
          <Link href="/configuracoes#canva" className="btn btn-outline btn-sm">
            Ver instruções
          </Link>
        }
      />
    );
  }

  if (!status.connected) {
    return (
      <Notice
        title="Conecte sua conta do Canva"
        body="Autorize o sistema a listar seus designs, abrir modelos e enviar as fotos do culto para a sua biblioteca. A autorização é feita com segurança pelo próprio Canva (OAuth)."
        action={
          <a
            href={`/api/canva/connect?returnTo=${encodeURIComponent(`/agenda?destaque=${serviceId}`)}`}
            className="btn btn-primary btn-sm"
          >
            <CanvaMark size={16} />
            Conectar ao Canva
          </a>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-ink-600">
          <CanvaMark size={18} />
          Conectado como <strong className="text-ink-900">{status.user?.displayName ?? "usuário do Canva"}</strong>
        </p>
        <div className="flex gap-2">
          <a
            href="https://www.canva.com/magic-write/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
          >
            <IconSparkles size={15} />
            Magic Write
          </a>
          <a
            href="https://www.canva.com/magic-media/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm"
          >
            <IconImage size={15} />
            Magic Media
          </a>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
            <IconSearch size={16} />
          </span>
          <TextInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nos seus designs e brand templates…"
            className="pl-9"
          />
          {query ? (
            <button type="button" className="icon-btn absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setQuery("")} aria-label="Limpar">
              <IconX size={14} />
            </button>
          ) : null}
        </div>

        {brandNotice ? (
          <p className="rounded-lg border border-gold-200 bg-[#fdf8ec] px-3 py-2 text-[12px] leading-snug text-[#7a5a12]">
            <strong>Brand templates com preenchimento automático</strong> exigem Canva Enterprise. Mostrando seus
            designs comuns — ao escolher um, as fotos do culto são enviadas para sua biblioteca e o design é aberto
            para edição.
          </p>
        ) : null}

        {loadingTemplates && templates === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] w-full rounded-xl" />
            ))}
          </div>
        ) : templates && templates.length === 0 ? (
          <Notice
            title="Nenhum modelo encontrado"
            body={`Nenhum design ou brand template corresponde à busca para “${serviceTitle}”. Crie ou salve um design na sua conta do Canva e ele aparecerá aqui.`}
            action={
              <a href="https://www.canva.com/templates/?query=culto%20igreja" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                <IconExternal size={15} />
                Explorar modelos no Canva
              </a>
            }
          />
        ) : (
          <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
            {(templates ?? []).map((item) => {
              const active = selected?.id === item.id;
              return (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  onClick={() => setSelected(active ? null : item)}
                  className={`group relative overflow-hidden rounded-xl border bg-white text-left transition ${
                    active ? "border-brand-500 ring-2 ring-brand-200" : "border-line hover:border-brand-300"
                  }`}
                >
                  <span className="block aspect-[3/4] w-full overflow-hidden bg-surface-alt">
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnail} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.03]" loading="lazy" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-ink-300">
                        <IconImage size={26} />
                      </span>
                    )}
                  </span>
                  <span className="block p-2">
                    <span className="line-clamp-2 text-[12px] font-semibold leading-snug text-ink-800">{item.title}</span>
                    <span className="mt-1 flex items-center gap-1">
                      <Badge tone={item.kind === "brand_template" ? "gold" : "neutral"} className="text-[10px]">
                        {item.kind === "brand_template" ? "Autofill" : "Design"}
                      </Badge>
                      {item.updatedAt ? (
                        <span className="truncate text-[10px] text-ink-400">{formatRelative(new Date(item.updatedAt * 1000))}</span>
                      ) : null}
                    </span>
                  </span>
                  {active ? (
                    <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white shadow">
                      <IconCheck size={13} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {selected ? (
          <div className="flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-brand-900">
              <strong>{selected.title}</strong>
              {selected.kind === "brand_template"
                ? " — os campos do modelo serão preenchidos com os dados do culto."
                : " — o design será aberto no Canva com as fotos do culto já na sua biblioteca."}
            </p>
            <Button type="button" variant="primary" size="sm" onClick={() => void useTemplate(selected)} loading={step === "working"}>
              {step === "working" ? null : <IconSparkles size={15} />}
              {selected.kind === "brand_template" ? "Preencher e criar" : "Abrir no Canva"}
            </Button>
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="animate-pop-in flex flex-col gap-3 rounded-xl border border-success/30 bg-success-soft p-4 sm:flex-row sm:items-center">
          {result.design.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.design.thumbnail} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-ink-900">{result.design.title}</p>
            <p className="text-[12px] text-ink-600">
              {result.source === "autofill"
                ? `${result.filledFields.length} campo(s) preenchido(s)${result.skippedFields.length ? ` · ${result.skippedFields.length} sem correspondência: ${result.skippedFields.join(", ")}` : ""}`
                : `${result.uploadedAssets.length} imagem(ns) enviada(s) para sua biblioteca de uploads.`}
            </p>
          </div>
          {result.design.editUrl ? (
            <a href={result.design.editUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm shrink-0">
              <IconExternal size={15} />
              Abrir no Canva
            </a>
          ) : null}
        </div>
      ) : null}

      {status.designs.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Designs deste culto no Canva</p>
            <button type="button" className="icon-btn h-7 w-7" onClick={() => void loadStatus()} aria-label="Atualizar">
              {loadingStatus ? <Spinner size={13} /> : <IconRefresh size={14} />}
            </button>
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {status.designs.map((design) => (
              <li key={design.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink-800">{design.title ?? design.designId}</span>
                  <span className="block text-[11px] text-ink-400">
                    {design.source === "autofill" ? "Modelo preenchido" : "Modelo aberto"} · {formatRelative(design.createdAt)}
                  </span>
                </span>
                {design.editUrl ? (
                  <a href={design.editUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                    <IconExternal size={14} />
                    Abrir
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Notice({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/60 p-4 sm:flex-row sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-line">
        <CanvaMark size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold text-ink-900">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{body}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
