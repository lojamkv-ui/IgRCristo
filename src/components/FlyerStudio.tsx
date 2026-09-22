"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, compressImage } from "@/lib/client";
import { drawFlyer, loadImage, type FlyerBaseInput, type FlyerFormat } from "@/lib/draw-flyer";
import { buildCaption, FLYER_TONES, type FlyerToneId } from "@/lib/flyer-copy";
import { FLYER_THEMES, getFlyerTheme, isFlyerThemeId, type FlyerThemeId } from "@/lib/flyer-themes";
import { getFlyerModel, isFlyerModelId, suggestFlyerModelId, type FlyerModelId } from "@/lib/flyer-models";
import { copyText, formatLongDate, formatTime, slugify, weekdayName } from "@/lib/format";
import type { ChurchProfile, FlyerCopy, FlyerResponse, ServiceItem } from "@/lib/types";
import { FlyerModelLibrary } from "./FlyerModelLibrary";
import { FlyerPromptStudio } from "./FlyerPromptStudio";
import { GuardedLink, useToast } from "./providers";
import type { CinematicId } from "@/lib/cinematic";
import { CINEMATIC_SCENES } from "@/lib/cinematic";
import { ErrorState, Modal, Skeleton, Spinner } from "./ui";

const EMPTY_COPY: FlyerCopy = {
  headline: "Venha adorar conosco",
  verseReference: "Salmos 122:1",
  verseText: "Alegrei-me quando me disseram: Vamos à casa do Senhor.",
  invitation: "Compondo a mensagem do culto…",
  hashtags: [],
};

const THEME_STORAGE = "renascendo.flyer.theme";
const TONE_STORAGE = "renascendo.flyer.tone";
const MODEL_STORAGE = "renascendo.flyer.model";

function readPreference(key: string, fallback: string, urlParam: string, isValid: (value: string) => boolean) {
  if (typeof window === "undefined") return fallback;
  const fromUrl = new URLSearchParams(window.location.search).get(urlParam);
  if (fromUrl && isValid(fromUrl)) return fromUrl;
  const stored = window.localStorage.getItem(key);
  if (stored && isValid(stored)) return stored;
  return fallback;
}

type Assets = {
  emblem: HTMLImageElement | null;
  preacher: HTMLImageElement | null;
  singers: (HTMLImageElement | null)[];
};

export function FlyerStudio({ serviceId }: { serviceId: number }) {
  const { push } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<FlyerFormat>("feed");
  const [modelId, setModelId] = useState<FlyerModelId>("sede");
  const [themeId, setThemeId] = useState<FlyerThemeId>("classico");
  const [tone, setTone] = useState<FlyerToneId>("acolhedor");
  const [copy, setCopy] = useState<FlyerCopy>(EMPTY_COPY);
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState<"openai" | "simulacao" | "">("");
  const [notice, setNotice] = useState("");
  const [service, setService] = useState<ServiceItem | null>(null);
  const [church, setChurch] = useState<ChurchProfile | null>(null);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [background, setBackground] = useState<{ name: string; image: HTMLImageElement } | null>(null);
  const [cinematic, setCinematic] = useState<CinematicId | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [fonts, setFonts] = useState({ display: "Georgia, serif", sans: "Segoe UI, sans-serif" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variant, setVariant] = useState(0);
  const [edited, setEdited] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const modelChosen = useRef(false);

  // Preferências lembradas no aparelho; ?modelo=, ?tema= e ?tom= sobrescrevem.
  useEffect(() => {
    const urlModel = new URLSearchParams(window.location.search).get("modelo");
    const storedModel = window.localStorage.getItem(MODEL_STORAGE);
    const urlTheme = new URLSearchParams(window.location.search).get("tema");
    const storedTheme = window.localStorage.getItem(THEME_STORAGE);
    if ((urlModel && isFlyerModelId(urlModel)) || (storedModel && isFlyerModelId(storedModel))) {
      setModelId(readPreference(MODEL_STORAGE, "sede", "modelo", isFlyerModelId) as FlyerModelId);
      modelChosen.current = true;
    }
    if ((urlTheme && isFlyerThemeId(urlTheme)) || (storedTheme && isFlyerThemeId(storedTheme))) {
      setThemeId(readPreference(THEME_STORAGE, "classico", "tema", isFlyerThemeId) as FlyerThemeId);
    }
    setTone(
      readPreference(TONE_STORAGE, "acolhedor", "tom", (value) => FLYER_TONES.some((item) => item.id === value)) as FlyerToneId,
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE, themeId);
  }, [themeId]);
  useEffect(() => {
    window.localStorage.setItem(TONE_STORAGE, tone);
  }, [tone]);
  useEffect(() => {
    window.localStorage.setItem(MODEL_STORAGE, modelId);
  }, [modelId]);

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setFonts({
      display: style.getPropertyValue("--font-display").trim() || "Georgia, serif",
      sans: style.getPropertyValue("--font-sans").trim() || "Segoe UI, sans-serif",
    });
  }, []);

  const load = useCallback(
    async (nextVariant: number, replaceCopy: boolean, nextTone: FlyerToneId = tone, customPrompt?: string) => {
      setLoading(true);
      setError("");
      try {
        const result = await api<FlyerResponse>("/api/flyer", {
          method: "POST",
          body: JSON.stringify({ serviceId, variant: nextVariant, format, tone: nextTone, customPrompt }),
        });
        setService(result.service);
        setChurch(result.church);
        setPrompt(result.prompt);
        setSource(result.source);
        setNotice(result.notice);
        setVariant(result.variant);
        if (replaceCopy) {
          setCopy(result.copy);
          setEdited(false);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível gerar o flyer.");
      } finally {
        setLoading(false);
      }
    },
    [format, serviceId, tone],
  );

  useEffect(() => {
    void load(0, true);
    // A geração acontece ao abrir a página, destino do botão Gerar Flyer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  // Sem escolha explícita, o layout acompanha o tipo de culto.
  useEffect(() => {
    if (!service || modelChosen.current) return;
    setModelId(suggestFlyerModelId(service.title, service.theme));
  }, [service]);

  // Fotos do culto, carregadas uma vez e reaproveitadas pelo cartaz e pelas miniaturas.
  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    const loadAssets = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* fontes do sistema já bastam */
      }
      const [emblem, preacher, ...singers] = await Promise.all([
        loadImage("/brand/emblem.png"),
        loadImage(service.preacherPhotoUrl),
        ...service.singers.map((person) => loadImage(person.photoUrl)),
      ]);
      if (!cancelled) setAssets({ emblem, preacher, singers });
    };
    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, [service]);

  const theme = getFlyerTheme(themeId);
  const model = getFlyerModel(modelId);

  const base = useMemo<FlyerBaseInput | null>(() => {
    if (!service || !church || !assets) return null;
    return {
      theme,
      backgroundImage: cinematic ? null : background?.image ?? null,
      cinematic,
      church,
      title: service.title,
      subject: service.theme,
      serviceDate: service.serviceDate,
      serviceTime: service.serviceTime,
      leaderName: service.leaderName,
      preacherName: service.preacherName,
      intercessors: service.intercessors.map((person) => person.name),
      copy,
      preacherImage: assets.preacher,
      singers: service.singers.map((person, index) => ({ name: person.name, image: assets.singers[index] ?? null })),
      emblem: assets.emblem,
      fonts,
    };
  }, [assets, background, cinematic, church, copy, fonts, service, theme]);

  useEffect(() => {
    if (!base) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Sempre em resolução final: o CSS cuida do tamanho visível.
    canvas.width = 1080;
    canvas.height = format === "story" ? 1920 : 1350;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawFlyer(ctx, { ...base, format, model });
  }, [base, format, model]);

  const caption = useMemo(() => (service && church ? buildCaption(church, service, copy) : ""), [service, church, copy]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas || !service) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flyer-${model.id}-${slugify(theme.label)}-${service.serviceDate}-${slugify(service.title)}.png`;
      link.click();
      URL.revokeObjectURL(url);
      push("Flyer baixado em PNG.");
    }, "image/png");
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !service) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], `flyer-${service.serviceDate}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: service.title, text: caption });
      return;
    }
    download();
    push("Este navegador não compartilha arquivos. O PNG foi baixado.", "info");
  };

  const importBackground = async (file?: File) => {
    if (!file) return;
    try {
      const data = await compressImage(file, 1400);
      const image = await loadImage(data);
      if (!image) throw new Error("Não foi possível ler esta imagem.");
      setBackground({ name: file.name, image });
      setCinematic(null);
      push(`Fundo "${file.name}" importado. Ele não fica salvo no cadastro.`);
    } catch (cause) {
      push(cause instanceof Error ? cause.message : "Não foi possível importar o fundo.", "error");
    }
  };

  if (error && !service) return <ErrorState message={error} onRetry={() => void load(0, true)} />;

  const toneMeta = FLYER_TONES.find((item) => item.id === tone) ?? FLYER_TONES[0];
  const checks = service && church
    ? ([
        ["Modelo", model.label, true],
        ["Tema visual", theme.label, true],
        ["Fundo", cinematic ? (CINEMATIC_SCENES.find((scene) => scene.id === cinematic)?.label ?? cinematic) : background ? background.name : "paleta do tema", true],
        ["Data e hora", `${weekdayName(service.serviceDate)}, ${formatLongDate(service.serviceDate)} · ${formatTime(service.serviceTime)}`, true],
        ["Dirigente", service.leaderName, true],
        ["Pregador", service.preacherName, true],
        ["Foto do pregador", service.preacherPhotoUrl ? "incluída" : "sem foto", Boolean(service.preacherPhotoUrl)],
        ["Cantores", service.singers.length ? service.singers.map((person) => person.name).join(", ") : "não escalados", true],
        ["Intercessores", service.intercessors.map((person) => person.name).join(", ") || "não escalados", true],
        ["Tom do texto", toneMeta.label, true],
        ["Endereço", church.addressFull, true],
        ["CNPJ", church.cnpj, true],
        ["Contato", `${church.phone} · ${church.email}`, true],
        ["Pastor presidente", church.pastor, true],
      ] as const)
    : [];

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Flyer do culto</p>
          <h1>{service?.title ?? "Gerando flyer"}</h1>
          <p className="lede">Use os prompts no canvas: o Prompt 1 escreve o flyer e o Prompt 2 pinta o fundo cinematográfico. Modelo, tema e tom continuam à escolha. Os dados oficiais da sede entram sempre.</p>
        </div>
        <GuardedLink className="btn btn-ghost no-print" href={service ? `/agenda/${service.id}` : "/agenda"}>Voltar ao culto</GuardedLink>
      </header>
      {loading && !service ? <Skeleton rows={2} /> : null}

      <section className="card no-print picker-card">
        <div className="picker-block">
          <div className="section-title" style={{ margin: 0 }}>
            <p className="picker-label">Biblioteca de modelos</p>
            <span className="hint">As miniaturas usam o tema e o texto atuais.</span>
          </div>
          {base ? (
            <FlyerModelLibrary
              base={base}
              modelId={modelId}
              onSelect={(id) => {
                modelChosen.current = true;
                setModelId(id);
              }}
            />
          ) : (
            <div className="model-grid">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton model-thumb" style={{ aspectRatio: "4 / 5" }} />)}
            </div>
          )}
        </div>

        <div className="picker-block">
          <p className="picker-label">Tema visual</p>
          <div className="picker-row">
            {FLYER_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`theme-btn ${item.id === themeId ? "active" : ""}`}
                onClick={() => setThemeId(item.id)}
                title={item.note}
                aria-pressed={item.id === themeId}
              >
                <span
                  className="swatch"
                  style={{ background: `linear-gradient(135deg, ${item.swatch[0]} 0%, ${item.swatch[1]} 52%, ${item.swatch[2]} 100%)` }}
                  aria-hidden="true"
                />
                <span className="theme-name">{item.label}</span>
              </button>
            ))}
          </div>
          <p className="hint">{theme.note}</p>
        </div>

        <div className="picker-block">
          <p className="picker-label">Tom do texto</p>
          <div className="picker-row">
            {FLYER_TONES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tone-btn ${item.id === tone ? "active" : ""}`}
                onClick={() => {
                  setTone(item.id);
                  void load(variant, true, item.id);
                }}
                aria-pressed={item.id === tone}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="hint">{toneMeta.note} A troca recompõe o texto na hora.</p>
        </div>

        <div className="picker-block">
          <p className="picker-label">Fundo próprio (opcional)</p>
          <div className="picker-row">
            <label className="btn btn-small btn-ghost file-btn">
              Importar imagem
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  void importBackground(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {background ? (
              <>
                <span className="chip">{background.name}</span>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setBackground(null)}>Voltar à paleta</button>
              </>
            ) : (
              <span className="hint">Use uma foto do templo ou uma arte sua. O sistema escurece o fundo para o texto continuar legível.</span>
            )}
          </div>
        </div>
      </section>

      <div className="flyer-layout">
        <div>
          <div className="inline-actions no-print" style={{ marginBottom: 12 }}>
            <button type="button" className={`btn btn-small ${format === "feed" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFormat("feed")}>Cartaz 4:5</button>
            <button type="button" className={`btn btn-small ${format === "story" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFormat("story")}>Status 9:16</button>
            <button type="button" className="btn btn-small btn-gold" onClick={download} disabled={!base}>Baixar PNG</button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => void share()} disabled={!base}>Compartilhar</button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => window.print()} disabled={!base}>Imprimir</button>
          </div>
          <canvas ref={canvasRef} className="flyer-canvas" aria-label="Pré-visualização do flyer" />
          <p className="hint">
            {loading || !base ? "Montando o prompt e compondo o flyer…" : `${model.label} · ${theme.label}${cinematic ? " · fundo cinematográfico" : background ? " · fundo próprio" : ""} · ${format === "story" ? "1080×1920" : "1080×1350"}`}
          </p>
        </div>
        <div className="stack">
          {notice ? (
            <div className="card">
              <span className={`badge ${source === "openai" ? "status-atualizacao" : "status-cargo_local"}`}>{source === "openai" ? "ChatGPT" : "Composição local"}</span>
              <p style={{ marginTop: 8 }}>{notice}</p>
            </div>
          ) : null}
          <section className="form-section">
            <h2>Texto do cartaz</h2>
            <label className="field">Headline<input className="control" value={copy.headline} onChange={(event) => { setCopy({ ...copy, headline: event.target.value }); setEdited(true); }} /></label>
            <label className="field">Versículo<textarea className="control" value={copy.verseText} onChange={(event) => { setCopy({ ...copy, verseText: event.target.value }); setEdited(true); }} /></label>
            <label className="field">Referência<input className="control" value={copy.verseReference} onChange={(event) => { setCopy({ ...copy, verseReference: event.target.value }); setEdited(true); }} /></label>
            <label className="field">Convite<textarea className="control" value={copy.invitation} onChange={(event) => { setCopy({ ...copy, invitation: event.target.value }); setEdited(true); }} /></label>
            <div className="inline-actions">
              <button type="button" className="btn btn-primary" disabled={loading} onClick={() => (edited ? setConfirmOpen(true) : void load(variant + 1, true))}>
                {loading ? <Spinner /> : null}Gerar de novo
              </button>
              <button type="button" className="btn btn-ghost" onClick={async () => { if (await copyText(caption)) push("Legenda copiada."); }}>Copiar legenda</button>
            </div>
          </section>
          <section className="card">
            <h2>O que entra no flyer</h2>
            <ul className="checklist">
              {checks.map(([label, value, ok]) => (
                <li key={label}>
                  <span>{label}<br /><small className="muted">{value}</small></span>
                  <span className={ok ? "ok" : "warn"}>{ok ? "ok" : "atenção"}</span>
                </li>
              ))}
            </ul>
            {service && !service.preacherPhotoUrl ? <p className="hint">Para a foto do pregador aparecer, cadastre-a no membro ou neste culto.</p> : null}
          </section>
          <details className="prompt-box" open>
            <summary>Prompt enviado ao assistente</summary>
            <div>
              <button type="button" className="btn btn-small btn-ghost" onClick={async () => { if (await copyText(prompt)) push("Prompt copiado."); }}>Copiar prompt</button>
              <pre>{prompt || "O prompt aparece assim que a composição termina."}</pre>
            </div>
          </details>
        </div>
      </div>
      <Modal open={confirmOpen} title="Substituir o texto ajustado?" onClose={() => setConfirmOpen(false)}>
        <p>Você editou o convite. Gerar de novo troca headline, versículo e convite. As informações do culto continuam as mesmas.</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>Manter texto</button>
          <button type="button" className="btn btn-primary" onClick={() => { setConfirmOpen(false); void load(variant + 1, true); }}>Gerar de novo</button>
        </div>
      </Modal>
    </div>
  );
}
