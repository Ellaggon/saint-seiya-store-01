import type { StorageService } from "../../domain/services/StorageService";
import { optimizeImageForUpload } from "../services/optimizeImageForUpload";

export interface UploadCategoryImageRequest {
  file: File;
}

export class UploadCategoryImageUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(request: UploadCategoryImageRequest): Promise<string> {
    const { file } = request;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Allowed: jpg, jpeg, png, webp");
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 5MB limit");
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const optimized = await optimizeImageForUpload(
      {
        data,
        name: file.name,
        type: file.type,
      },
      { maxEdge: 1920, quality: 78 },
    );

    return this.storageService.upload(optimized, "categories");
  }
}
