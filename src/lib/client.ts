"use client";

import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const actor = window.localStorage.getItem("renascendo.actor")?.trim();
  if (actor) headers.set("x-actor", actor);
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await response.text();
  let data: { error?: string; fields?: Record<string, string> } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string; fields?: Record<string, string> };
    } catch {
      throw new ApiError("O servidor devolveu uma resposta inválida.", response.status);
    }
  }
  if (!response.ok) throw new ApiError(data.error || "Não foi possível concluir a operação.", response.status, data.fields);
  return data as T;
}

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(url));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }
    void reload();
  }, [reload, url]);

  return { data, error, loading, reload, setData };
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Renascendo`;
  }, [title]);
}

export function flash(message: string) {
  sessionStorage.setItem("renascendo.toast", message);
}

export function consumeFlash() {
  const message = sessionStorage.getItem("renascendo.toast");
  if (message) sessionStorage.removeItem("renascendo.toast");
  return message;
}

export function compressImage(file: File, max = 640) {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Envie uma imagem JPG, PNG ou WebP."));
  if (file.size > 12 * 1024 * 1024) return Promise.reject(new Error("A imagem passa de 12 MB. Escolha um arquivo menor."));
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Este formato não pôde ser lido. Use JPG ou PNG."));
    };
    image.src = url;
  });
}

export function newKey() {
  return crypto.randomUUID();
}
