import { prisma } from "./prisma";
import type { ProductStatus as PrismaProductStatus } from "@prisma/client";
import { Product, ProductStatus } from "../../domain/entities/Product";
import type {
  AdminProductData,
  AdminProductInput,
  ProductImageInput,
  ProductDeletionMedia,
  ProductRepository,
} from "../../domain/repositories/ProductRepository";
import {
  allocateCategorySlug,
  allocateCollectionSlug,
  allocateProductSlug,
} from "@/lib/uniqueSlug";
import { productImageUrl } from "@/application/services/productImageUrl";
import { ApplicationError } from "@/application/errors/ApplicationError";

const productStatusToPrisma: Record<ProductStatus, PrismaProductStatus> = {
  [ProductStatus.DRAFT]: "DRAFT",
  [ProductStatus.PUBLISHED]: "PUBLISHED",
  [ProductStatus.PRE_ORDER]: "PRE_ORDER",
  [ProductStatus.OUT_OF_STOCK]: "OUT_OF_STOCK",
  [ProductStatus.ARCHIVED]: "ARCHIVED",
};

const normalizeProductImages = (input: AdminProductInput): ProductImageInput[] => {
  const source = input.images;
  if (!source) return [];
  if (source.length === 0 || source.length > 12) {
    throw new Error("A product must have between 1 and 12 images");
  }

  const uniqueIds = new Set<string>();
  return source.map((image, index) => {
    if (!image.id || !image.storageKey || uniqueIds.has(image.id)) {
      throw new Error("Invalid product image payload");
    }
    uniqueIds.add(image.id);
    return {
      ...image,
      url: productImageUrl(image.storageKey),
      altText: image.altText.trim() || input.name,
      sortOrder: index,
    };
  });
};

export class PrismaProductRepository implements ProductRepository {
  // slug helpers live in @/lib/uniqueSlug

  private toAdminProductData(product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: unknown;
    categoryId: string;
    collectionId: string;
    height: unknown;
    material: string | null;
    imageUrl: string;
    stock: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    category?: { id: string; name: string; slug: string } | null;
    images?: {
      id: string;
      storageKey: string;
      altText: string;
      sortOrder: number;
      width: number | null;
      height: number | null;
    }[];
  }): AdminProductData {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      categoryId: product.categoryId,
      collectionId: product.collectionId,
      height: Number(product.height),
      material: product.material,
      imageUrl: product.imageUrl,
      images: (product.images ?? []).map((image) => ({
        id: image.id,
        url: productImageUrl(image.storageKey),
        storageKey: image.storageKey,
        altText: image.altText,
        sortOrder: image.sortOrder,
        width: image.width,
        height: image.height,
      })),
      stock: product.stock,
      status: product.status as ProductStatus,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      category: product.category ?? null,
    };
  }

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
    const include = {
      category: { select: { name: true } },
      collection: { select: { name: true } },
      characters: {
        select: {
          character: { select: { name: true } },
        },
      },
      images: {
        where: { deletedAt: null, status: "READY" },
        orderBy: { sortOrder: "asc" },
      },
    } as const;
    const p = await prisma.product.findUnique({
      where: { id },
      include,
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
      images: p.images.map((image) => ({
        id: image.id,
        url: productImageUrl(image.storageKey),
        storageKey: image.storageKey,
        altText: image.altText,
        sortOrder: image.sortOrder,
        width: image.width,
        height: image.height,
      })),
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
        in: [ProductStatus.PUBLISHED],
      },
    };

    if (
      filters?.status &&
      Object.values(ProductStatus).includes(filters.status as ProductStatus) &&
      filters.status !== ProductStatus.PRE_ORDER
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
        in: [ProductStatus.PUBLISHED],
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

    const categories = await prisma.category.findMany({
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
    });
    const collections = await prisma.collection.findMany({
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
    });
    const characters = await prisma.character.findMany({
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
    });

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

  async listAdminProducts(): Promise<AdminProductData[]> {
    const query = {
      where: { deletedAt: null },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { deletedAt: null, status: "READY" },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    } as const;
    const products = await prisma.product.findMany(query);

    return products.map((product) => this.toAdminProductData(product));
  }

  async findAdminProductById(id: string): Promise<AdminProductData | null> {
    const query = {
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          where: { deletedAt: null, status: "READY" },
          orderBy: { sortOrder: "asc" },
        },
      },
    } as const;
    const product = await prisma.product.findUnique(query);

    return product ? this.toAdminProductData(product) : null;
  }

  async createAdminProduct(input: AdminProductInput): Promise<AdminProductData> {
    const slug = await allocateProductSlug(input.name);
    const images = normalizeProductImages(input);

    const product = await prisma.product.create({
      data: {
        id: input.id,
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        categoryId: input.categoryId,
        collectionId: input.collectionId,
        height: input.height,
        material: input.material ?? undefined,
        imageUrl: images[0]?.url ?? input.imageUrl,
        stock: input.stock,
        status: productStatusToPrisma[input.status],
        images: {
          create: images.map((image) => ({
            id: image.id,
            storageKey: image.storageKey,
            altText: image.altText,
            sortOrder: image.sortOrder,
            width: image.width ?? undefined,
            height: image.height ?? undefined,
            byteSize: image.byteSize ?? undefined,
            mimeType: image.mimeType ?? undefined,
            checksum: image.checksum ?? undefined,
          })),
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    return this.toAdminProductData(product);
  }

  async updateAdminProduct(
    input: AdminProductInput & { id: string },
  ): Promise<AdminProductData> {
    const slug = await allocateProductSlug(input.name, input.id);
    const images = normalizeProductImages(input);

    const product = await prisma.product.update({
      where: { id: input.id },
      data: {
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        categoryId: input.categoryId,
        collectionId: input.collectionId,
        height: input.height,
        material: input.material,
        imageUrl: images[0]?.url ?? input.imageUrl,
        stock: input.stock ?? 0,
        status: productStatusToPrisma[input.status],
        ...(input.images
          ? {
              images: {
                deleteMany: {},
                create: images.map((image) => ({
                  id: image.id,
                  storageKey: image.storageKey,
                  altText: image.altText,
                  sortOrder: image.sortOrder,
                  width: image.width ?? undefined,
                  height: image.height ?? undefined,
                  byteSize: image.byteSize ?? undefined,
                  mimeType: image.mimeType ?? undefined,
                  checksum: image.checksum ?? undefined,
                })),
              },
            }
          : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    return this.toAdminProductData(product);
  }

  async archive(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async delete(id: string): Promise<ProductDeletionMedia> {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: {
          id: true,
          imageUrl: true,
          images: {
            select: { storageKey: true },
          },
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
      });

      if (!product) {
        throw ApplicationError.validation(
          "La figura no existe o ya fue eliminada.",
        );
      }

      if (product._count.orderItems > 0) {
        throw ApplicationError.validation(
          "No se puede eliminar esta figura porque ya aparece en pedidos. Cámbiala a estado Archivado para ocultarla del catálogo sin perder el historial.",
        );
      }

      const reservationCount = await tx.preorderReservation.count({
        where: { campaign: { productId: id } },
      });
      if (reservationCount > 0) {
        throw ApplicationError.validation(
          "No se puede eliminar esta figura porque tiene reservas de preventa. Cámbiala a estado Archivado para ocultarla del catálogo sin perder el historial.",
        );
      }

      const storageKeys = [
        product.imageUrl,
        ...product.images.map((image) => image.storageKey),
      ];

      const campaignIds = (
        await tx.preorderCampaign.findMany({
          where: { productId: id },
          select: { id: true },
        })
      ).map((campaign) => campaign.id);

      if (campaignIds.length > 0) {
        await tx.preorderCampaign.deleteMany({
          where: { id: { in: campaignIds } },
        });
      }

      await tx.reservation.deleteMany({ where: { productId: id } });
      await tx.inventory.deleteMany({ where: { productId: id } });
      await tx.productCharacter.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });

      return { storageKeys };
    });
  }

  async countOrderItems(productId: string): Promise<number> {
    return prisma.orderItem.count({ where: { productId } });
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
    const slug = await allocateCollectionSlug(collection.name, collection.id);

    await prisma.collection.upsert({
      where: { id: collection.id },
      update: {
        name: collection.name,
        slug,
        deletedAt: collection.deletedAt,
      },
      create: {
        id: collection.id,
        name: collection.name,
        slug,
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
    const slug = await allocateCategorySlug(category.name, category.id);

    await prisma.category.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        slug,
        imageUrl: category.imageUrl,
        deletedAt: category.deletedAt,
      },
      create: {
        id: category.id,
        name: category.name,
        slug,
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
