import type { Collection } from "../entities/Collection";

export interface CollectionRepository {
  findAll(): Promise<Collection[]>;
  findBySlug(slug: string): Promise<Collection | null>;
  create(collection: Collection): Promise<void>;
}
