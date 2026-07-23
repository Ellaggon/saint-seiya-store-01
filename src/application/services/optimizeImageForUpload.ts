export type OptimizedImage = {
  data: Uint8Array;
  name: string;
  type: string;
};

export type OptimizeImageOptions = {
  maxEdge?: number;
  quality?: number;
};

/**
 * Server-side image resize/re-encode with sharp when available.
 * Falls back to the original bytes if sharp fails or is unavailable.
 */
export async function optimizeImageForUpload(
  file: {
    data: Uint8Array;
    name: string;
    type: string;
  },
  options: OptimizeImageOptions = {},
): Promise<OptimizedImage> {
  const maxEdge = options.maxEdge ?? 1920;
  const quality = options.quality ?? 78;

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;

    const pipeline = sharp(file.data, { failOn: "none" }).rotate();
    const metadata = await pipeline.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const longest = Math.max(width, height);

    let output = pipeline;
    if (longest > maxEdge) {
      output = output.resize({
        width: width >= height ? maxEdge : undefined,
        height: height > width ? maxEdge : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const optimized = await output
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    if (optimized.byteLength >= file.data.byteLength) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return {
      data: new Uint8Array(optimized),
      name: `${baseName}.jpg`,
      type: "image/jpeg",
    };
  } catch (error) {
    console.warn("[optimizeImageForUpload] Falling back to original bytes:", error);
    return file;
  }
}
