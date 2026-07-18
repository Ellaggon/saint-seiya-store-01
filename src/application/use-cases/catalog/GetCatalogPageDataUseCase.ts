import type { CatalogQueryService } from "../../services/CatalogQueryService";
import type { ProductFilters } from "../../../domain/repositories/ProductRepository";
import type {
  CatalogMetadataDTO,
  CatalogProductsResponseDTO,
} from "../../dto/catalog.dto";

export class GetCatalogPageDataUseCase {
  constructor(private readonly catalogQueryService: CatalogQueryService) {}

  async execute(
    filters?: ProductFilters,
  ): Promise<{ products: CatalogProductsResponseDTO; filters: CatalogMetadataDTO }> {
    const [products, filtersData] = await Promise.all([
      this.catalogQueryService.getCatalogProducts(filters),
      this.catalogQueryService.getCatalogMetadata(),
    ]);
    
    return {
      products,
      filters: filtersData,
    };
  }
}
