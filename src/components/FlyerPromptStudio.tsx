"use client";

import { useEffect, useMemo, useState } from "react";
import { CINEMATIC_SCENES, type CinematicId } from "@/lib/cinematic";
import { copyText } from "@/lib/format";
import {
  CANVA_TIPS,
  CANVAS_PROMPTS,
  fillCanvasPrompt,
  sceneFromFilledPrompt,
  type CanvasPrompt,
} from "@/lib/flyer-prompts";
import type { ChurchProfile, ServiceItem } from "@/lib/types";
import type { FlyerFormat } from "@/lib/draw-flyer";
import { useToast } from "./providers";
import { Spinner } from "./ui";

export function FlyerPromptStudio({
  church,
  service,
  format,
  cinematic,
  applying,
  onApplyText,
  onApplyBackground,
}: {
  church: ChurchProfile;
  service: ServiceItem;
  format: FlyerFormat;
  cinematic: CinematicId | null;
  applying: boolean;
  onApplyText: (prompt: string) => void;
  onApplyBackground: (scene: CinematicId | null, prompt: string) => void;
}) {
  const { push } = useToast();
  const [selected, setSelected] = useState(CANVAS_PROMPTS[0]!.id);
  const meta = CANVAS_PROMPTS.find((item) => item.id === selected) ?? CANVAS_PROMPTS[0]!;
  const filled = useMemo(
    () => fillCanvasPrompt(meta.template, { church, service, format }),
    [meta, church, service, format],
  );
  const [draft, setDraft] = useState(filled);

  useEffect(() => {
    setDraft(filled);
  }, [filled]);

  const apply = () => {
    if (meta.kind === "fundo") {
      const scene = sceneFromFilledPrompt(draft);
      onApplyBackground(scene, draft);
      return;
    }
    onApplyText(draft);
  };

  return (
    <section className="card no-print picker-card">
      <div className="picker-block">
        <p className="picker-label">Prompts para o Canvas</p>
        <p className="hint">Os dois prompts clássicos de igreja — textos do flyer e fundo cinematográfico — já vêm preenchidos com este culto. Aplique no canvas ou copie para o Canva / ChatGPT.</p>
        <div className="prompt-grid">
          {CANVAS_PROMPTS.map((item) => (
            <PromptCard key={item.id} item={item} active={item.id === selected} onSelect={() => setSelected(item.id)} />
          ))}
        </div>
      </div>

      <label className="field">
        Prompt {meta.kind === "texto" ? "de texto" : "de fundo"}
        <textarea className="control prompt-editor" value={draft} onChange={(event) => setDraft(event.target.value)} rows={10} />
      </label>

      <div className="inline-actions">
        <button type="button" className="btn btn-primary" disabled={applying} onClick={apply}>
          {applying ? <Spinner /> : null}
          {meta.kind === "texto" ? "Usar no texto do canvas" : "Usar no fundo do canvas"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            if (await copyText(draft)) push("Prompt copiado. Cole no ChatGPT ou no Canva Magic Studio.");
          }}
        >
          Copiar prompt
        </button>
      </div>

      <div className="picker-block">
        <p className="picker-label">Cenas cinematográficas</p>
        <div className="picker-row">
          {CINEMATIC_SCENES.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className={`theme-btn ${cinematic === scene.id ? "active" : ""}`}
              onClick={() => onApplyBackground(scene.id, draft)}
              title={scene.note}
              aria-pressed={cinematic === scene.id}
            >
              <span
                className="swatch"
                style={{ background: `linear-gradient(135deg, ${scene.swatch[0]} 0%, ${scene.swatch[1]} 55%, ${scene.swatch[2]} 100%)` }}
                aria-hidden="true"
              />
              <span className="theme-name">{scene.label}</span>
            </button>
          ))}
          {cinematic ? (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => onApplyBackground(null, draft)}>
              Voltar à paleta
            </button>
          ) : null}
        </div>
        <p className="hint">O Prompt 2 pinta o fundo no próprio canvas: feixes, fumaça e centro livre para a foto do pregador. Não precisa abrir o Canva.</p>
      </div>

      <details className="prompt-box">
        <summary>Dicas rápidas para montar no Canva</summary>
        <div className="stack" style={{ gap: 10 }}>
          {CANVA_TIPS.map((tip) => (
            <p key={tip.title}><strong>{tip.title}:</strong> {tip.text}</p>
          ))}
          <p className="hint">Se quiser um texto ainda mais específico, escolha o culto na agenda — o Prompt 1 já entra com tema, cores da sede, pregador e horário.</p>
        </div>
      </details>
    </section>
  );
}

function PromptCard({ item, active, onSelect }: { item: CanvasPrompt; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`prompt-card ${active ? "active" : ""}`} onClick={onSelect} aria-pressed={active}>
      <span className={`badge ${item.kind === "texto" ? "status-atualizacao" : "status-cargo_local"}`}>{item.kind === "texto" ? "Texto" : "Fundo"}</span>
      <strong>{item.label}</strong>
      <span className="hint">{item.note}</span>
    </button>
  );
}
