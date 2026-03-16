import type { StorageService } from "../../domain/services/StorageService";

export interface UploadCategoryImageRequest {
  file: File;
}

export class UploadCategoryImageUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(request: UploadCategoryImageRequest): Promise<string> {
    const { file } = request;

    // Validate image type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Invalid file type. Allowed: jpg, jpeg, png, webp");
    }

    // Validate max size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 5MB limit");
    }

    const data = new Uint8Array(await file.arrayBuffer());

    return this.storageService.upload(
      {
        data,
        name: file.name,
        type: file.type,
      },
      "categories",
    );
  }
}
