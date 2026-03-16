import type { CatalogQueryService } from "../../services/CatalogQueryService";
import type { CatalogMetadataDTO } from "../../dto/catalog.dto";

export class GetCatalogMetadataUseCase {
  constructor(private readonly catalogQueryService: CatalogQueryService) {}

  async execute(): Promise<CatalogMetadataDTO> {
    return this.catalogQueryService.getCatalogMetadata();
  }
}
