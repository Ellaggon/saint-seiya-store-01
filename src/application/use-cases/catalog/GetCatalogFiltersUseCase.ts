import type {
  ProductRepository,
  ProductFilters,
} from "../../../domain/repositories/ProductRepository";
import type { CatalogMetadataDTO } from "../../dto/catalog.dto";

export class GetCatalogFiltersUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(filters?: ProductFilters): Promise<CatalogMetadataDTO> {
    const metadata = await this.productRepository.getCatalogFilters(filters);

    return {
      categories: metadata.categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        count: c._count?.products ?? 0,
      })),
      collections: metadata.collections.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count?.products ?? 0,
      })),
      characters: metadata.characters.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count?.products ?? 0,
      })),
    };
  }
}
