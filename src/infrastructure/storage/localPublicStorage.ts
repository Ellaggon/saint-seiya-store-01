import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProductImageStorageService } from "../../domain/services/StorageService";

export class LocalPublicStorage implements ProductImageStorageService {
  async upload(
    file: {
      data: Uint8Array;
      name: string;
      type: string;
    },
    folder: string,
  ): Promise<string> {
    const extension = safeExtension(file.name, file.type);
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), file.data);

    return `/uploads/${folder}/${fileName}`;
  }

  async uploadAtKey(
    file: { data: Uint8Array; name: string; type: string },
    key: string,
  ): Promise<string> {
    const segments = key.split("/").filter(Boolean);
    const filename = segments.pop() || `${crypto.randomUUID()}.${safeExtension(file.name, file.type)}`;
    const folder = segments.join("/");
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), file.data);
    return `/uploads/${folder}/${filename}`;
  }

  async createPresignedUpload(): Promise<string> {
    throw new Error("Direct product-media uploads require Cloudflare R2");
  }

  async head(): Promise<{ contentType?: string; contentLength?: number; eTag?: string }> {
    throw new Error("Object inspection is unavailable for local public storage");
  }

  async delete(): Promise<void> {
    // Local fallback is intentionally non-destructive; generated files are development-only.
  }

  publicUrlForKey(key: string): string {
    return key.startsWith("/") ? key : `/uploads/${key}`;
  }
}

const safeExtension = (name: string, type: string): string => {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension && ["jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension;
  }

  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
};
