import { prisma } from "@/infrastructure/database/prisma";
import { slugify } from "@/lib/utils";

type ExistsFn = (slug: string) => Promise<boolean>;

/**
 * First available slug from a name: `seiya`, then `seiya1`, `seiya2`, …
 */
export const allocateUniqueSlug = async (
  baseName: string,
  exists: ExistsFn,
): Promise<string> => {
  const base = slugify(baseName) || "item";
  let slug = base;
  let counter = 1;

  while (await exists(slug)) {
    slug = `${base}${counter}`;
    counter += 1;
  }

  return slug;
};

export const allocateProductSlug = (
  name: string,
  excludeId?: string,
): Promise<string> =>
  allocateUniqueSlug(name, async (slug) => {
    const row = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    return Boolean(row && row.id !== excludeId);
  });

export const allocateCollectionSlug = (
  name: string,
  excludeId?: string,
): Promise<string> =>
  allocateUniqueSlug(name, async (slug) => {
    const row = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true },
    });
    return Boolean(row && row.id !== excludeId);
  });

export const allocateCategorySlug = (
  name: string,
  excludeId?: string,
): Promise<string> =>
  allocateUniqueSlug(name, async (slug) => {
    const row = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    return Boolean(row && row.id !== excludeId);
  });
