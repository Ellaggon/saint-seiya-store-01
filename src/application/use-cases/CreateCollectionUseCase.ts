import { Collection } from "../../domain/entities/Collection";
import type { CollectionRepository } from "../../domain/repositories/CollectionRepository";
import type {
  CreateCollectionRequestDTO,
  CollectionDTO,
} from "../dto/catalog.dto";
import { CatalogMapper } from "../dto/catalog.mapper";
import { slugify } from "../../lib/utils";

export class CreateCollectionUseCase {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  async execute(request: CreateCollectionRequestDTO): Promise<CollectionDTO> {
    const slug = slugify(request.name);

    // Check if slug already exists (basic uniqueness check)
    const existing = await this.collectionRepository.findBySlug(slug);
    if (existing) {
      throw new Error(`Collection with slug ${slug} already exists`);
    }

    const collection = Collection.create({
      id: crypto.randomUUID(),
      name: request.name,
      slug: slug,
    });

    await this.collectionRepository.create(collection);
    return CatalogMapper.collectionToDTO(collection);
  }
}
