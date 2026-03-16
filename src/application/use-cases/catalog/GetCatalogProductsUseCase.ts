import type { CatalogQueryService } from "../../services/CatalogQueryService";
import type { ProductFilters } from "../../../domain/repositories/ProductRepository";
import type { CatalogProductDTO } from "../../dto/catalog.dto";

export class GetCatalogProductsUseCase {
  constructor(private readonly catalogQueryService: CatalogQueryService) {}

  async execute(filters?: ProductFilters): Promise<CatalogProductDTO[]> {
    return this.catalogQueryService.getCatalogProducts(filters);
  }
}
