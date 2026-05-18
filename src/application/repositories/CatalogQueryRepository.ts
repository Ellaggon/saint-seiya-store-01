import type {
  CatalogMetadataDTO,
  CatalogProductsResponseDTO,
} from "@/application/dto/catalog.dto";
import type { ProductFilters } from "@/domain/repositories/ProductRepository";

export interface CatalogQueryRepository {
  listCatalogProducts(
    filters?: ProductFilters,
  ): Promise<CatalogProductsResponseDTO>;
  getCatalogMetadata(): Promise<CatalogMetadataDTO>;
}
