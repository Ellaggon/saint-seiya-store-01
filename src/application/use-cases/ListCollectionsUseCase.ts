import type { CollectionRepository } from "../../domain/repositories/CollectionRepository";
import type { CollectionDTO } from "../dto/catalog.dto";
import { CatalogMapper } from "../dto/catalog.mapper";

export class ListCollectionsUseCase {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  async execute(): Promise<CollectionDTO[]> {
    const collections = await this.collectionRepository.findAll();
    return CatalogMapper.collectionListToDTO(collections);
  }
}
