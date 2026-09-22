/**
 * Processamento de imagens no navegador: valida, recorta em quadrado,
 * redimensiona e devolve um data URL leve para armazenar no banco.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export type ProcessedImage = {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
};

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
    return "Formato não suportado. Use JPG, PNG ou WEBP.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Arquivo muito grande. Envie uma imagem de até 15 MB.";
  }
  return null;
}

function loadImage(file: File): Promise<{ width: number; height: number; source: CanvasImageSource }> {
  return new Promise((resolve, reject) => {
    // createImageBitmap respeita a orientação EXIF (fotos de celular).
    if (typeof createImageBitmap === "function") {
      createImageBitmap(file, { imageOrientation: "from-image" })
        .then((bitmap) => resolve({ width: bitmap.width, height: bitmap.height, source: bitmap }))
        .catch(() => fallback());
      return;
    }
    fallback();

    function fallback() {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight, source: image });
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler a imagem selecionada."));
      };
      image.src = url;
    }
  });
}

/** Recorta no centro (cover) e redimensiona para um quadrado de `size` px. */
export async function processImage(file: File, size = 640, quality = 0.86): Promise<ProcessedImage> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const { width, height, source } = await loadImage(file);
  if (!width || !height) throw new Error("A imagem selecionada está vazia ou corrompida.");

  const side = Math.min(width, height);
  const sx = Math.max(0, (width - side) / 2);
  const sy = Math.max(0, (height - side) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas não suportado neste navegador.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(source, sx, sy, side, side, 0, 0, size, size);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const bytes = Math.round((dataUrl.length - "data:image/jpeg;base64,".length) * 0.75);

  if (typeof source !== "undefined" && "close" in source) {
    (source as ImageBitmap).close();
  }

  return { dataUrl, width: size, height: size, bytes };
}

/** Estimativa legível do tamanho em KB/MB. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
