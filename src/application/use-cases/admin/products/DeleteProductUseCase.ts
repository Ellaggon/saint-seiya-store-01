import { ApplicationError } from "@/application/errors/ApplicationError";
import { collectProductStorageKeys } from "@/application/services/productImageUrl";
import type { ProductRepository } from "@/domain/repositories/ProductRepository";
import type { ProductImageStorageService } from "@/domain/services/StorageService";

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export class DeleteProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly storage: ProductImageStorageService,
  ) {}

  async execute(id: string): Promise<void> {
    if (!id || !isUuid(id)) {
      throw ApplicationError.validation("El ID del producto es inválido");
    }

    const media = await this.productRepository.delete(id);
    const knownKeys = collectProductStorageKeys(id, media.storageKeys);
    const prefixKeys = await this.listProductObjects(id);
    const keys = [...new Set([...knownKeys, ...prefixKeys])];

    if (!keys.length) return;

    try {
      await this.storage.deleteMany(keys);
    } catch (error) {
      console.warn("[Product delete] database row removed but R2 cleanup failed", {
        productId: id,
        keys,
        error,
      });
    }
  }

  private async listProductObjects(productId: string): Promise<string[]> {
    try {
      return await this.storage.listKeysByPrefix(`products/${productId}/`);
    } catch (error) {
      console.warn("[Product delete] unable to list R2 objects for product", {
        productId,
        error,
      });
      return [];
    }
  }
}
