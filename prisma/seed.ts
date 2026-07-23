import {
  PrismaClient,
  PreorderCampaignStatus,
  PreorderDepositType,
  ProductStatus,
} from "@prisma/client";
import { DEFAULT_HOME_CONTENT } from "../src/application/dto/homeContent.dto";

const prisma = new PrismaClient();

const tamashiiImage = (path: string) => `https://tamashiiweb.com${path}`;

const categories = [
  {
    name: "Sanctuary",
    slug: "sanctuary",
    imageUrl: tamashiiImage("/storage/images/products/imported/item_0000001720_01.jpg"),
  },
  {
    name: "Poseidon",
    slug: "poseidon",
    imageUrl: tamashiiImage("/storage/images/products/imported/item_0000015543_orYg6Djm_02.jpg"),
  },
  {
    name: "Hades",
    slug: "hades",
    imageUrl: tamashiiImage("/storage/images/products/imported/item_0000015695_g2RWhpOr_02.jpg"),
  },
  {
    name: "Asgard",
    slug: "asgard",
    imageUrl: tamashiiImage("/storage/images/products/thumbnail/c16e5190-e2b9-4683-bf02-e4857e16bb3f.webp"),
  },
  {
    name: "Soul of Gold",
    slug: "soul-of-gold",
    imageUrl: tamashiiImage("/storage/images/products/imported/item_0000015540_7pCGVba4_02.jpg"),
  },
  {
    name: "Omega",
    slug: "omega",
    imageUrl: tamashiiImage("/storage/images/products/imported/item_0000001720_10.jpg"),
  },
];

const collections = [
  {
    name: "Myth Cloth EX",
    slug: "myth-cloth-ex",
  },
  {
    name: "Myth Cloth Classic",
    slug: "myth-cloth-classic",
  },
  {
    name: "Crown",
    slug: "crown",
  },
  {
    name: "D.D. Panoramation",
    slug: "dd-panoramation",
  },
];

const catalogProducts = [
  {
    name: "Pegasus Seiya New Bronze Cloth EX",
    slug: "pegasus-seiya-new-bronze-cloth-ex-seed",
    description:
      "Figura articulada de Seiya con armadura New Bronze Cloth, piezas metálicas, manos intercambiables y presencia limpia para vitrinas centradas en la saga del Santuario.",
    price: "690.00",
    categorySlug: "sanctuary",
    collectionSlug: "myth-cloth-ex",
    characterNames: ["Pegasus Seiya"],
    height: "16.00",
    material: "PVC, ABS y die-cast",
    stock: 8,
    imageUrl: tamashiiImage("/storage/images/products/imported/item_0000001720_01.jpg"),
    status: ProductStatus.PUBLISHED,
  },
  {
    name: "Andromeda Shun Final Bronze Cloth Original Color",
    slug: "andromeda-shun-final-bronze-original-color-seed",
    description:
      "Edición de Shun con paleta original, cadenas de Andrómeda para poses defensivas y ofensivas, y terminaciones pensadas para coleccionistas de los caballeros de bronce.",
    price: "740.00",
    categorySlug: "hades",
    collectionSlug: "myth-cloth-ex",
    characterNames: ["Andromeda Shun"],
    height: "16.00",
    material: "PVC, ABS y die-cast",
    stock: 6,
    imageUrl: tamashiiImage("/storage/images/products/thumbnail/7dd76a21-d4ea-4bae-a59b-86fb3589eadc.webp"),
    status: ProductStatus.PUBLISHED,
  },
  {
    name: "Sea Emperor Poseidon Original Color Edition",
    slug: "sea-emperor-poseidon-original-color-edition-seed",
    description:
      "Representación ceremonial de Poseidon con escala imponente, túnica real y armadura marina para una vitrina enfocada en el arco de los Generales Marinos.",
    price: "980.00",
    categorySlug: "poseidon",
    collectionSlug: "myth-cloth-ex",
    characterNames: ["Poseidon"],
    height: "18.00",
    material: "PVC, ABS, tela y die-cast",
    stock: 4,
    imageUrl: tamashiiImage("/storage/images/products/imported/item_0000015543_orYg6Djm_02.jpg"),
    status: ProductStatus.PUBLISHED,
  },
  {
    name: "Alpha Dubhe Siegfried 40th Anniversary Ver.",
    slug: "alpha-dubhe-siegfried-40th-anniversary-seed",
    description:
      "Guerrero divino de Asgard con armadura Alpha Robe, capa de exhibición y acabados conmemorativos para acompañar vitrinas nórdicas.",
    price: "890.00",
    categorySlug: "asgard",
    collectionSlug: "myth-cloth-ex",
    characterNames: ["Alpha Dubhe Siegfried"],
    height: "18.00",
    material: "PVC, ABS, tela y die-cast",
    stock: 5,
    imageUrl: tamashiiImage("/storage/images/products/thumbnail/c16e5190-e2b9-4683-bf02-e4857e16bb3f.webp"),
    status: ProductStatus.PUBLISHED,
  },
  {
    name: "Libra Shiryu Inheritor of the Gold Cloth",
    slug: "libra-shiryu-inheritor-gold-cloth-seed",
    description:
      "Shiryu portando la armadura de Libra, con presencia dorada, opciones de pose de combate y acabado brillante para colecciones Soul of Gold.",
    price: "930.00",
    categorySlug: "soul-of-gold",
    collectionSlug: "myth-cloth-ex",
    characterNames: ["Dragon Shiryu", "Libra Shiryu"],
    height: "17.00",
    material: "PVC, ABS y die-cast",
    stock: 3,
    imageUrl: tamashiiImage("/storage/images/products/thumbnail/EOYKuTFrcnV7Gccurhk0fy0D0HwTMPgOCKv4iVDf.jpg"),
    status: ProductStatus.PUBLISHED,
  },
];

const preorderProducts = [
  {
    product: {
      name: "Pegasus Seiya Final Bronze Cloth Original Color",
      slug: "pegasus-seiya-final-bronze-original-color-preorder-seed",
      description:
        "Preventa para Seiya con armadura final en color original, rostros alternativos y piezas de acción para recrear el cierre de la batalla contra Hades.",
      price: "760.00",
      categorySlug: "hades",
      collectionSlug: "myth-cloth-ex",
      characterNames: ["Pegasus Seiya"],
      height: "16.00",
      material: "PVC, ABS y die-cast",
      stock: 0,
      imageUrl: tamashiiImage("/storage/images/products/imported/item_0000015695_g2RWhpOr_02.jpg"),
      status: ProductStatus.PRE_ORDER,
    },
    campaign: {
      id: "00000000-0000-4000-8000-000000000101",
      totalSlots: 18,
      depositType: PreorderDepositType.PERCENT,
      depositValue: "30.00",
      allowFullPayment: true,
      opensAt: "2026-07-20T00:00:00.000Z",
      closesAt: "2026-10-15T23:59:59.000Z",
      releaseDate: "2026-12-20T00:00:00.000Z",
      etaStart: "2027-01-10T00:00:00.000Z",
      etaEnd: "2027-01-31T00:00:00.000Z",
      etaLabel: "Llegada estimada enero 2027",
      terms:
        "El abono confirma la reserva. El saldo se solicita cuando el producto llegue a tienda.",
      arrivalNotes:
        "Cupo limitado sujeto a confirmación del distribuidor. Se avisará por correo al recibir stock.",
    },
  },
  {
    product: {
      name: "Sea Emperor Poseidon Royal Mantle Ver.",
      slug: "sea-emperor-poseidon-royal-mantle-preorder-seed",
      description:
        "Preventa de Poseidon con manto real, tridente y acabado ceremonial para completar la línea de los mares.",
      price: "1050.00",
      categorySlug: "poseidon",
      collectionSlug: "myth-cloth-ex",
      characterNames: ["Poseidon"],
      height: "18.00",
      material: "PVC, ABS, tela y die-cast",
      stock: 0,
      imageUrl: tamashiiImage("/storage/images/products/imported/item_0000015671_ZId22lP6_02.jpg"),
      status: ProductStatus.PRE_ORDER,
    },
    campaign: {
      id: "00000000-0000-4000-8000-000000000102",
      totalSlots: 12,
      depositType: PreorderDepositType.FIXED,
      depositValue: "250.00",
      allowFullPayment: true,
      opensAt: "2026-07-20T00:00:00.000Z",
      closesAt: "2026-09-30T23:59:59.000Z",
      releaseDate: "2026-11-25T00:00:00.000Z",
      etaStart: "2026-12-15T00:00:00.000Z",
      etaEnd: "2027-01-10T00:00:00.000Z",
      etaLabel: "Llegada estimada diciembre 2026",
      terms:
        "Reserva con abono fijo. El saldo se calcula sobre el precio final publicado en la ficha.",
      arrivalNotes:
        "Producto de alto volumen; puede enviarse en lote separado para proteger empaque y accesorios.",
    },
  },
  {
    product: {
      name: "Epsilon Alioth Fenrir EX",
      slug: "epsilon-alioth-fenrir-ex-preorder-seed",
      description:
        "Preventa de Fenrir de Asgard con armadura Epsilon Robe, rostro serio y presencia nórdica para vitrinas de Guerreros Divinos.",
      price: "870.00",
      categorySlug: "asgard",
      collectionSlug: "myth-cloth-ex",
      characterNames: ["Epsilon Alioth Fenrir"],
      height: "17.00",
      material: "PVC, ABS y die-cast",
      stock: 0,
      imageUrl: tamashiiImage("/storage/images/products/thumbnail/vB2jYx3HI0lIaCH5UvU1wftu3pTmG6JJHtRdYfXy.jpg"),
      status: ProductStatus.PRE_ORDER,
    },
    campaign: {
      id: "00000000-0000-4000-8000-000000000103",
      totalSlots: 10,
      depositType: PreorderDepositType.PERCENT,
      depositValue: "35.00",
      allowFullPayment: false,
      opensAt: "2026-07-20T00:00:00.000Z",
      closesAt: "2026-10-05T23:59:59.000Z",
      releaseDate: "2027-02-15T00:00:00.000Z",
      etaStart: "2027-03-05T00:00:00.000Z",
      etaEnd: "2027-03-28T00:00:00.000Z",
      etaLabel: "Llegada estimada marzo 2027",
      terms:
        "Preventa con abono porcentual. No admite pago completo hasta confirmación de arribo.",
      arrivalNotes:
        "La asignación se respeta por orden de reserva confirmada.",
    },
  },
  {
    product: {
      name: "Leo Ikki Inheritor of the Gold Cloth",
      slug: "leo-ikki-inheritor-gold-cloth-preorder-seed",
      description:
        "Preventa de Ikki heredero de la armadura de Leo, con brillo dorado y configuración de combate para escenas de impacto.",
      price: "940.00",
      categorySlug: "soul-of-gold",
      collectionSlug: "myth-cloth-ex",
      characterNames: ["Phoenix Ikki", "Leo Ikki"],
      height: "17.00",
      material: "PVC, ABS y die-cast",
      stock: 0,
      imageUrl: tamashiiImage("/storage/images/products/imported/item_0000015540_7pCGVba4_02.jpg"),
      status: ProductStatus.PRE_ORDER,
    },
    campaign: {
      id: "00000000-0000-4000-8000-000000000104",
      totalSlots: 15,
      depositType: PreorderDepositType.PERCENT,
      depositValue: "30.00",
      allowFullPayment: true,
      opensAt: "2026-07-20T00:00:00.000Z",
      closesAt: "2026-11-01T23:59:59.000Z",
      releaseDate: "2027-01-20T00:00:00.000Z",
      etaStart: "2027-02-01T00:00:00.000Z",
      etaEnd: "2027-02-20T00:00:00.000Z",
      etaLabel: "Llegada estimada febrero 2027",
      terms:
        "El abono bloquea una unidad. Cambios de precio internacional se comunicarán antes del saldo.",
      arrivalNotes:
        "Incluye control de estado al llegar a tienda antes de habilitar retiro o envío.",
    },
  },
  {
    product: {
      name: "Pegasus Koga Omega Cloth",
      slug: "pegasus-koga-omega-cloth-preorder-seed",
      description:
        "Preventa inspirada en Saint Seiya Omega, pensada para coleccionistas que buscan ampliar la vitrina más allá de la línea clásica.",
      price: "620.00",
      categorySlug: "omega",
      collectionSlug: "myth-cloth-classic",
      characterNames: ["Pegasus Koga"],
      height: "15.00",
      material: "PVC y ABS",
      stock: 0,
      imageUrl: tamashiiImage("/storage/images/products/imported/item_0000001720_10.jpg"),
      status: ProductStatus.PRE_ORDER,
    },
    campaign: {
      id: "00000000-0000-4000-8000-000000000105",
      totalSlots: 20,
      depositType: PreorderDepositType.FIXED,
      depositValue: "180.00",
      allowFullPayment: true,
      opensAt: "2026-07-20T00:00:00.000Z",
      closesAt: "2026-08-31T23:59:59.000Z",
      releaseDate: "2026-11-10T00:00:00.000Z",
      etaStart: "2026-12-01T00:00:00.000Z",
      etaEnd: "2026-12-18T00:00:00.000Z",
      etaLabel: "Llegada estimada diciembre 2026",
      terms:
        "El abono se descuenta del total. La reserva vence si no se confirma el comprobante dentro del plazo indicado.",
      arrivalNotes:
        "Producto recomendado para completar una selección juvenil de Omega junto a figuras clásicas.",
    },
  },
];

const slugifyCharacter = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function upsertCategory(category: (typeof categories)[number]) {
  return prisma.category.upsert({
    where: { slug: category.slug },
    update: {
      name: category.name,
      imageUrl: category.imageUrl,
      deletedAt: null,
    },
    create: category,
  });
}

async function upsertCollection(collection: (typeof collections)[number]) {
  return prisma.collection.upsert({
    where: { slug: collection.slug },
    update: {
      name: collection.name,
      deletedAt: null,
    },
    create: collection,
  });
}

async function upsertCharacter(name: string) {
  return prisma.character.upsert({
    where: { slug: slugifyCharacter(name) },
    update: { name },
    create: {
      name,
      slug: slugifyCharacter(name),
    },
  });
}

type SeedProduct = (typeof catalogProducts)[number] | (typeof preorderProducts)[number]["product"];

async function upsertProduct(product: SeedProduct) {
  const category = await prisma.category.findUniqueOrThrow({
    where: { slug: product.categorySlug },
  });
  const collection = await prisma.collection.findUniqueOrThrow({
    where: { slug: product.collectionSlug },
  });

  const savedProduct = await prisma.product.upsert({
    where: { slug: product.slug },
    update: {
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: category.id,
      collectionId: collection.id,
      height: product.height,
      material: product.material,
      stock: product.stock,
      imageUrl: product.imageUrl,
      status: product.status,
      deletedAt: null,
    },
    create: {
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      categoryId: category.id,
      collectionId: collection.id,
      height: product.height,
      material: product.material,
      stock: product.stock,
      imageUrl: product.imageUrl,
      status: product.status,
    },
  });

  await prisma.productCharacter.deleteMany({
    where: { productId: savedProduct.id },
  });

  for (const characterName of product.characterNames) {
    const character = await upsertCharacter(characterName);
    await prisma.productCharacter.create({
      data: {
        productId: savedProduct.id,
        characterId: character.id,
      },
    });
  }

  await prisma.inventory.upsert({
    where: {
      id: `seed-inventory-${product.slug}`,
    },
    update: {
      productId: savedProduct.id,
      quantity: product.stock,
      location: "SANCTUARY_MAIN_VAULT",
    },
    create: {
      id: `seed-inventory-${product.slug}`,
      productId: savedProduct.id,
      quantity: product.stock,
      location: "SANCTUARY_MAIN_VAULT",
    },
  });

  return savedProduct;
}

async function main() {
  for (const category of categories) {
    await upsertCategory(category);
  }

  for (const collection of collections) {
    await upsertCollection(collection);
  }

  await prisma.homeContent.upsert({
    where: { id: "home" },
    create: {
      id: "home",
      content: DEFAULT_HOME_CONTENT,
    },
    update: {},
  });

  const seededCatalogProducts = [];
  for (const product of catalogProducts) {
    const savedProduct = await upsertProduct(product);
    seededCatalogProducts.push({ ...product, id: savedProduct.id });
  }

  const seededPreorders = [];
  for (const preorder of preorderProducts) {
    const savedProduct = await upsertProduct(preorder.product);
    const savedCampaign = await prisma.preorderCampaign.upsert({
      where: { id: preorder.campaign.id },
      update: {
        productId: savedProduct.id,
        status: PreorderCampaignStatus.ACTIVE,
        totalSlots: preorder.campaign.totalSlots,
        depositType: preorder.campaign.depositType,
        depositValue: preorder.campaign.depositValue,
        allowFullPayment: preorder.campaign.allowFullPayment,
        opensAt: new Date(preorder.campaign.opensAt),
        closesAt: new Date(preorder.campaign.closesAt),
        releaseDate: new Date(preorder.campaign.releaseDate),
        etaStart: new Date(preorder.campaign.etaStart),
        etaEnd: new Date(preorder.campaign.etaEnd),
        etaLabel: preorder.campaign.etaLabel,
        terms: preorder.campaign.terms,
        arrivalNotes: preorder.campaign.arrivalNotes,
        deletedAt: null,
      },
      create: {
        id: preorder.campaign.id,
        productId: savedProduct.id,
        status: PreorderCampaignStatus.ACTIVE,
        totalSlots: preorder.campaign.totalSlots,
        depositType: preorder.campaign.depositType,
        depositValue: preorder.campaign.depositValue,
        allowFullPayment: preorder.campaign.allowFullPayment,
        opensAt: new Date(preorder.campaign.opensAt),
        closesAt: new Date(preorder.campaign.closesAt),
        releaseDate: new Date(preorder.campaign.releaseDate),
        etaStart: new Date(preorder.campaign.etaStart),
        etaEnd: new Date(preorder.campaign.etaEnd),
        etaLabel: preorder.campaign.etaLabel,
        terms: preorder.campaign.terms,
        arrivalNotes: preorder.campaign.arrivalNotes,
      },
    });

    seededPreorders.push({
      product: { ...preorder.product, id: savedProduct.id },
      campaign: { ...preorder.campaign, id: savedCampaign.id, status: savedCampaign.status },
    });
  }

  console.log(
    JSON.stringify(
      {
        report: {
          categories: categories.length,
          collections: collections.length,
          catalogProducts: seededCatalogProducts.length,
          preorderProducts: seededPreorders.length,
          homeContent: true,
          mode: "idempotent-upsert",
        },
        catalogProducts: seededCatalogProducts,
        preorderProducts: seededPreorders,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
