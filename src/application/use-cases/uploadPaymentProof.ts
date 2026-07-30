import type { StorageService } from "@/domain/services/StorageService";
import { optimizeImageForUpload } from "@/application/services/optimizeImageForUpload";

export interface UploadPaymentProofRequest {
  file: File;
}

export class UploadPaymentProofUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(request: UploadPaymentProofRequest): Promise<string> {
    const { file } = request;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipo de archivo inválido. Usa jpg, png, webp o pdf");
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("El archivo supera el límite de 8MB");
    }

    const data = new Uint8Array(await file.arrayBuffer());

    if (file.type === "application/pdf") {
      return this.storageService.upload(
        { data, name: file.name || "comprobante.pdf", type: file.type },
        "payment-proofs",
      );
    }

    const optimized = await optimizeImageForUpload(
      {
        data,
        name: file.name,
        type: file.type,
      },
      { maxEdge: 1600, quality: 78 },
    );

    return this.storageService.upload(optimized, "payment-proofs");
  }
}
