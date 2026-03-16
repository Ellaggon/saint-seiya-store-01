import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const collections = [
    { name: "Myth Cloth EX", slug: "myth-cloth-ex" },
    { name: "Myth Cloth Classic", slug: "myth-cloth-classic" },
    { name: "Crown", slug: "crown" },
    { name: "D.D. Panoramation", slug: "dd-panoramation" },
  ];

  for (const coll of collections) {
    await prisma.collection.upsert({
      where: { name: coll.name },
      update: {},
      create: coll,
    });
  }

  console.log("Colecciones inicializadas correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
