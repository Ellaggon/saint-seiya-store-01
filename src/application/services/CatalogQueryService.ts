import type { ProductFilters } from "@/domain/repositories/ProductRepository";
import type {
  CatalogMetadataDTO,
  CatalogProductsResponseDTO,
} from "@/application/dto/catalog.dto";
import type { CatalogQueryRepository } from "@/application/repositories/CatalogQueryRepository";

interface CachedMetadata {
  filters: CatalogMetadataDTO;
  expires: number;
}

const METADATA_TTL = 10 * 60 * 1000; // 10 minutes

let metadataCache: CachedMetadata | null = null;

export class CatalogQueryService {
  constructor(private readonly repository: CatalogQueryRepository) {}

  async getCatalogProducts(
    filters?: ProductFilters,
  ): Promise<CatalogProductsResponseDTO> {
    return this.repository.listCatalogProducts(filters);
  }

  async getCatalogMetadata(): Promise<CatalogMetadataDTO> {
    const now = Date.now();

    if (metadataCache && metadataCache.expires > now) {
      return metadataCache.filters;
    }

    const filters = await this.repository.getCatalogMetadata();

    metadataCache = { filters, expires: now + METADATA_TTL };

    return filters;
  }
}
