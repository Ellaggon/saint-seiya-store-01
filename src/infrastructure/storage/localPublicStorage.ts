import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageService } from "../../domain/services/StorageService";

export class LocalPublicStorage implements StorageService {
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
