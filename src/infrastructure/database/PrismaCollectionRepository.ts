import { prisma } from "./prisma";
import { Collection } from "../../domain/entities/Collection";
import type { CollectionRepository } from "../../domain/repositories/CollectionRepository";

export class PrismaCollectionRepository implements CollectionRepository {
  async findAll(): Promise<Collection[]> {
    const rawCollections = await (prisma as any).collection.findMany({
      orderBy: { name: "asc" },
    });

    return rawCollections.map((c: any) =>
      Collection.create({
        id: c.id,
        name: c.name,
        slug: c.slug,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }),
    );
  }

  async findBySlug(slug: string): Promise<Collection | null> {
    const c = await (prisma as any).collection.findUnique({
      where: { slug },
    });

    if (!c) return null;

    return Collection.create({
      id: c.id,
      name: c.name,
      slug: c.slug,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });
  }

  async create(collection: Collection): Promise<void> {
    await (prisma as any).collection.create({
      data: {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
      },
    });
  }
}
