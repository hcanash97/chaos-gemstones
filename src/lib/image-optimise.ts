// Client-side image optimisation: resize to max 1600px, convert to WebP,
// quality-step down until under target size.
export type OptimiseResult = {
  blob: Blob;
  fileName: string;
  originalBytes: number;
  finalBytes: number;
  quality: number;
};

const MAX_EDGE = 1600;
const TARGET_BYTES = 400 * 1024;
const START_QUALITY = 0.85;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.05;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/webp",
      quality,
    );
  });
}

export async function optimiseImage(file: File): Promise<OptimiseResult> {
  // Skip non-images (SVGs etc.) — return as-is.
  if (!file.type.startsWith("image/")) {
    return { blob: file, fileName: file.name, originalBytes: file.size, finalBytes: file.size, quality: 1 };
  }
  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");
  ctx.drawImage(img, 0, 0, w, h);

  let quality = START_QUALITY;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    blob = await canvasToBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return {
    blob,
    fileName: `${baseName}.webp`,
    originalBytes: file.size,
    finalBytes: blob.size,
    quality,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}