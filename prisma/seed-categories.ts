import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Sanctuario", slug: "sanctuary" },
    { name: "Poseidon", slug: "poseidon" },
    { name: "Hades", slug: "hades" },
    { name: "Soul of Gold", slug: "soul-of-gold" },
    { name: "Asgard", slug: "asgard" },
    { name: "Omega", slug: "omega" },
    { name: "Lost Canvas", slug: "lost-canvas" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log("Sagas (Categorías) inicializadas correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
