import { prisma } from "./prisma";
import { Product, ProductStatus } from "../../domain/entities/Product";
import type { ProductRepository } from "../../domain/repositories/ProductRepository";

export class PrismaProductRepository implements ProductRepository {
  async save(product: Product): Promise<void> {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId,
        collectionId: product.collectionId,
        height: product.height,
        material: product.material,
        imageUrl: product.imageUrl,
        stock: product.stock,
        status: product.status as any,
      },
      create: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId,
        collectionId: product.collectionId,
        height: product.height,
        material: product.material,
        imageUrl: product.imageUrl,
        stock: product.stock,
        status: product.status as any,
        slug: product.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      },
    });
  }

  async findById(id: string): Promise<Product | null> {
    const p = await (prisma.product as any).findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        collection: { select: { name: true } },
        characters: {
          select: {
            character: { select: { name: true } },
          },
        },
      },
    });

    if (!p) return null;

    return Product.create({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      categoryId: p.categoryId,
      collectionId: p.collectionId,
      height: Number(p.height),
      material: p.material || "",
      imageUrl: p.imageUrl,
      stock: p.stock || 0,
      status: p.status as ProductStatus,
      line: p.collection?.name,
      character: p.characters?.[0]?.character?.name || undefined,
      category: p.category?.name,
      characters:
        p.characters?.map((entry: any) => entry.character?.name).filter(Boolean) ||
        [],
    });
  }

  async findAll(): Promise<Product[]> {
    const products = await (prisma.product as any).findMany({
      where: { deletedAt: null },
    });

    return products.map((p: any) =>
      Product.create({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        categoryId: p.categoryId,
        collectionId: p.collectionId,
        height: Number(p.height),
        material: p.material || "",
        imageUrl: p.imageUrl,
        stock: p.stock || 0,
        status: p.status as ProductStatus,
      }),
    );
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    const products = await (prisma.product as any).findMany({
      where: { categoryId, deletedAt: null },
    });

    return products.map((p: any) =>
      Product.create({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        categoryId: p.categoryId,
        collectionId: p.collectionId,
        height: Number(p.height),
        material: p.material || "",
        imageUrl: p.imageUrl,
        stock: p.stock || 0,
        status: p.status as ProductStatus,
      }),
    );
  }

  async findByCollection(collectionId: string): Promise<Product[]> {
    const products = await (prisma.product as any).findMany({
      where: { collectionId, deletedAt: null },
    });

    return products.map((p: any) =>
      Product.create({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        categoryId: p.categoryId,
        collectionId: p.collectionId,
        height: Number(p.height),
        material: p.material || "",
        imageUrl: p.imageUrl,
        stock: p.stock || 0,
        status: p.status as ProductStatus,
      }),
    );
  }

  async listPublishedProducts(
    filters?: import("../../domain/repositories/ProductRepository").ProductFilters,
  ): Promise<Product[]> {
    const whereClause: any = {
      deletedAt: null,
      status: {
        in: [ProductStatus.PUBLISHED, ProductStatus.PRE_ORDER],
      },
    };

    if (
      filters?.status &&
      Object.values(ProductStatus).includes(filters.status as ProductStatus)
    ) {
      whereClause.status = filters.status;
    }

    if (filters?.category) {
      whereClause.category = { slug: filters.category };
    }

    if (filters?.collection) {
      whereClause.collection = { slug: filters.collection };
    }

    if (filters?.character) {
      whereClause.characters = {
        some: {
          character: { slug: filters.character },
        },
      };
    }

    const products = await (prisma.product as any).findMany({
      where: whereClause,
      include: {
        category: true,
        collection: true,
        characters: {
          include: {
            character: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return products.map((p: any) =>
      Product.create({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        categoryId: p.categoryId,
        collectionId: p.collectionId,
        height: Number(p.height),
        material: p.material || "",
        imageUrl: p.imageUrl,
        stock: p.stock || 0,
        status: p.status as ProductStatus,
        line: p.collection?.name, // Use collection for line based on mock data analysis
        character: p.characters?.[0]?.character?.name || undefined, // Map first character
      }),
    );
  }

  async getCatalogFilters(
    filters?: import("../../domain/repositories/ProductRepository").ProductFilters,
  ): Promise<
    import("../../domain/repositories/ProductRepository").CatalogMetadata
  > {
    const baseWhere: any = {
      deletedAt: null,
      status: {
        in: [ProductStatus.PUBLISHED, ProductStatus.PRE_ORDER],
      },
    };

    // Helper to build where clause excluding current field to allow selecting other options in same facet
    const getWhereForFacet = (
      excludeKey?: keyof import("../../domain/repositories/ProductRepository").ProductFilters,
    ) => {
      const facetWhere = { ...baseWhere };
      if (!excludeKey || excludeKey !== "category") {
        if (filters?.category) facetWhere.category = { slug: filters.category };
      }
      if (!excludeKey || excludeKey !== "collection") {
        if (filters?.collection)
          facetWhere.collection = { slug: filters.collection };
      }
      if (!excludeKey || excludeKey !== "character") {
        if (filters?.character) {
          facetWhere.characters = {
            some: { character: { slug: filters.character } },
          };
        }
      }
      if (!excludeKey || excludeKey !== "status") {
        if (filters?.status) facetWhere.status = filters.status;
      }
      return facetWhere;
    };

    const [categories, collections, characters] = await Promise.all([
      prisma.category.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
          _count: {
            select: { products: { where: getWhereForFacet("category") } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.collection.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: { products: { where: getWhereForFacet("collection") } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.character.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          _count: {
            select: {
              products: { where: { product: getWhereForFacet("character") } },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      categories: (categories as any).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
        _count: { products: c._count?.products ?? 0 },
      })),
      collections: (collections as any).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        _count: { products: c._count?.products ?? 0 },
      })),
      characters: (characters as any).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        _count: { products: c._count?.products ?? 0 },
      })),
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Collection Management
  async findAllCollections(): Promise<
    import("../../domain/repositories/ProductRepository").CollectionData[]
  > {
    return prisma.collection.findMany({
      orderBy: { name: "asc" },
    });
  }

  async findCollectionById(
    id: string,
  ): Promise<
    import("../../domain/repositories/ProductRepository").CollectionData | null
  > {
    return prisma.collection.findUnique({
      where: { id },
    });
  }

  async saveCollection(
    collection: import("../../domain/repositories/ProductRepository").CollectionData,
  ): Promise<void> {
    await prisma.collection.upsert({
      where: { id: collection.id },
      update: {
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        deletedAt: collection.deletedAt,
      },
      create: {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        deletedAt: collection.deletedAt,
      },
    });
  }

  async deleteCollection(id: string): Promise<void> {
    await prisma.collection.delete({
      where: { id },
    });
  }

  async archiveCollection(id: string): Promise<void> {
    await prisma.collection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Category Management
  async findAllCategories(): Promise<
    import("../../domain/repositories/ProductRepository").CategoryData[]
  > {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  async findCategoryById(
    id: string,
  ): Promise<
    import("../../domain/repositories/ProductRepository").CategoryData | null
  > {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  async saveCategory(
    category: import("../../domain/repositories/ProductRepository").CategoryData,
  ): Promise<void> {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        deletedAt: category.deletedAt,
      },
      create: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        deletedAt: category.deletedAt,
      },
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await prisma.category.delete({
      where: { id },
    });
  }

  async archiveCategory(id: string): Promise<void> {
    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
