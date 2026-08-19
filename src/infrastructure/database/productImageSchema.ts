import { prisma } from "./prisma";

const isMissingProductImageTable = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("ProductImage") && (
    message.includes("does not exist") ||
    message.includes("doesn't exist") ||
    message.includes("P2021")
  );
};

export const isProductImageSchemaAvailable = async (): Promise<boolean> => {
  try {
    await prisma.productImage.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    if (isMissingProductImageTable(error)) return false;
    throw error;
  }
};
