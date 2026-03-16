import type { CatalogQueryService } from "../../services/CatalogQueryService";
import type { ProductFilters } from "../../../domain/repositories/ProductRepository";
import type { CatalogMetadataDTO, CatalogProductDTO } from "../../dto/catalog.dto";

export class GetCatalogPageDataUseCase {
  constructor(private readonly catalogQueryService: CatalogQueryService) {}

  async execute(filters?: ProductFilters): Promise<{ products: CatalogProductDTO[]; filters: CatalogMetadataDTO }> {
    const products = await this.catalogQueryService.getCatalogProducts(filters);
    const filtersData = await this.catalogQueryService.getCatalogMetadata();
    
    return {
      products,
      filters: filtersData,
    };
  }
}
