"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { IconCamera, IconTrash, IconUpload } from "@/components/icons";
import { Avatar, Spinner } from "@/components/ui/primitives";
import { formatBytes, processImage } from "@/lib/image";

type PhotoPickerProps = {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  name: string;
  label?: string;
  hint?: string;
  error?: string | null;
  size?: number;
  shape?: "circle" | "square";
  disabled?: boolean;
  /** Redimensiona para este lado (px). Menor = banco mais leve. */
  outputSize?: number;
};

/**
 * Upload de foto com pré-visualização, drag & drop, validação e
 * compressão automática antes de enviar ao servidor.
 */
export function PhotoPicker({
  value,
  onChange,
  name,
  label = "Foto",
  hint = "JPG, PNG ou WEBP. A imagem é recortada e otimizada automaticamente.",
  error,
  size = 104,
  shape = "circle",
  disabled = false,
  outputSize = 640,
}: PhotoPickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayError = error ?? localError;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setBusy(true);
    setLocalError(null);
    try {
      const processed = await processImage(file, outputSize);
      onChange(processed.dataUrl);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Falha ao processar a imagem.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    void handleFiles(event.dataTransfer.files);
  }

  const rounded = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative grid place-items-center overflow-hidden border-2 border-dashed transition ${rounded} ${
          dragging ? "border-brand-400 bg-brand-50" : "border-line bg-surface-alt"
        }`}
        style={{ width: size, height: size }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={`Pré-visualização: ${name}`} className={`h-full w-full object-cover ${rounded}`} />
        ) : (
          <span className="grid place-items-center text-ink-300">
            <IconCamera size={Math.round(size / 3.4)} />
          </span>
        )}
        {busy ? (
          <span className={`absolute inset-0 grid place-items-center bg-white/75 ${rounded}`}>
            <Spinner size={22} className="text-brand-600" />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <span className="label mb-1.5 block">{label}</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void handleFiles(event.target.files)}
            disabled={disabled || busy}
          />
          <label
            htmlFor={inputId}
            className={`btn btn-outline btn-sm ${disabled || busy ? "pointer-events-none opacity-55" : "cursor-pointer"}`}
          >
            <IconUpload size={15} />
            {value ? "Trocar foto" : "Enviar foto"}
          </label>
          {value ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-danger hover:bg-danger-soft"
              onClick={() => {
                onChange(null);
                setLocalError(null);
              }}
              disabled={disabled || busy}
            >
              <IconTrash size={15} />
              Remover
            </button>
          ) : null}
        </div>
        {displayError ? (
          <p className="mt-1.5 text-xs font-medium text-danger" role="alert">
            {displayError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs leading-snug text-ink-400">
            {hint}
            {value ? (
              <>
                {" "}
                · <span className="font-medium text-success">foto carregada ({formatBytes(Math.round(value.length * 0.75))})</span>
              </>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}

/** Avatar pequeno com opção de troca rápida — usado em listas de cantores. */
export function MiniPhotoPicker({
  value,
  onChange,
  name,
  disabled,
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  name: string;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const processed = await processImage(file, 420, 0.82);
      onChange(processed.dataUrl);
    } catch {
      // silêncio: o campo principal exibe o erro detalhado
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <Avatar src={value} name={name || "?"} size="md" />
      {busy ? (
        <span className="absolute inset-0 grid place-items-center rounded-full bg-white/70">
          <Spinner size={18} className="text-brand-600" />
        </span>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
        disabled={disabled || busy}
      />
      <label
        htmlFor={inputId}
        title={value ? "Trocar foto" : "Adicionar foto"}
        className={`absolute -bottom-0.5 -right-0.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md transition hover:bg-brand-500 ${
          disabled || busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <IconCamera size={13} />
      </label>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          title="Remover foto"
          className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-white text-danger shadow-md transition hover:bg-danger-soft"
          disabled={disabled || busy}
        >
          <IconTrash size={11} />
        </button>
      ) : null}
    </div>
  );
}
