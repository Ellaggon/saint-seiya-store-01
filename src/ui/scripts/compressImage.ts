export type CompressImageOptions = {
  maxEdge?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    image.src = url;
  });

/**
 * Compress/resize an image in the browser before upload.
 * Falls back to the original file if canvas encoding fails.
 */
export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const maxEdge = options.maxEdge ?? 1920;
  const quality = options.quality ?? 0.78;
  const mimeType = options.mimeType ?? "image/jpeg";

  try {
    const image = await loadImage(file);
    const longest = Math.max(image.width, image.height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    // Skip work when already small enough and under ~400KB.
    if (scale === 1 && file.size <= 400_000 && file.type === mimeType) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob || blob.size >= file.size) return file;

    const extension = mimeType === "image/webp" ? "webp" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${extension}`, { type: mimeType });
  } catch {
    return file;
  }
}
