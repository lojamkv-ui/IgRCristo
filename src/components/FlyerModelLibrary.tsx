"use client";

import { useEffect, useRef } from "react";
import { drawFlyer, FLYER_SIZES, type FlyerBaseInput } from "@/lib/draw-flyer";
import { FLYER_MODELS, type FlyerModel, type FlyerModelId } from "@/lib/flyer-models";

const THUMB_WIDTH = 216;

/**
 * Biblioteca de modelos: cada cartão é um canvas de verdade, desenhado pelo
 * mesmo renderizador do flyer final, apenas em escala reduzida.
 * Assim a secretaria vê o resultado com o tema e o texto atuais.
 */
export function FlyerModelLibrary({
  base,
  modelId,
  onSelect,
}: {
  base: FlyerBaseInput;
  modelId: FlyerModelId;
  onSelect: (id: FlyerModelId) => void;
}) {
  return (
    <div className="model-grid">
      {FLYER_MODELS.map((model) => (
        <ModelThumb key={model.id} base={base} model={model} active={model.id === modelId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ModelThumb({
  base,
  model,
  active,
  onSelect,
}: {
  base: FlyerBaseInput;
  model: FlyerModel;
  active: boolean;
  onSelect: (id: FlyerModelId) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { w, h } = FLYER_SIZES.feed;
  const height = Math.round((THUMB_WIDTH * h) / w);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = THUMB_WIDTH;
    canvas.height = height;
    ctx.setTransform(THUMB_WIDTH / w, 0, 0, height / h, 0, 0);
    drawFlyer(ctx, { ...base, format: "feed", model });
  }, [base, model, height, w, h]);

  return (
    <button
      type="button"
      className={`model-card ${active ? "active" : ""}`}
      onClick={() => onSelect(model.id)}
      aria-pressed={active}
      title={model.note}
    >
      <canvas ref={canvasRef} className="model-thumb" style={{ aspectRatio: "4 / 5" }} aria-label={`Modelo ${model.label}`} />
      <span className="model-label">{model.label}</span>
      <span className="model-note">{model.note}</span>
    </button>
  );
}
