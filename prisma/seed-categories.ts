import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Myth Cloth EX", slug: "myth-cloth-ex" },
    { name: "Myth Cloth Classic", slug: "myth-cloth-classic" },
    { name: "Crown", slug: "crown" },
    { name: "D.D. Panoramation", slug: "dd-panoramation" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log("Categorías inicializadas correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
