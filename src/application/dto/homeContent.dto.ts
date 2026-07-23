export type HomeHeroContent = {
  backgroundImageUrl: string;
  title: string;
  secondaryTitle: string;
  subtitle: string;
  backgroundPosition?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type HomeFeatureContent = {
  imageUrl: string;
  name: string;
  collectionLabel: string;
};

export type HomeFeaturedCollectionContent = {
  imageUrl: string;
  collectionSlug: string;
  /** Cached display name so the public home page avoids an extra DB query. */
  collectionName?: string;
};

export type HomePageContent = {
  hero: HomeHeroContent;
  feature: HomeFeatureContent;
  featuredCollections: [
    HomeFeaturedCollectionContent,
    HomeFeaturedCollectionContent,
    HomeFeaturedCollectionContent,
  ];
};

export const DEFAULT_HOME_CONTENT: HomePageContent = {
  hero: {
    backgroundImageUrl: "/assets/home/poseidon-hero.jpg",
    title: "Poseidon",
    secondaryTitle: "Sea Emperor Poseidon Royal Mantle",
    subtitle: "Disponible ahora en el Santuario.",
    backgroundPosition: "center 35%",
    ctaLabel: "Ver preventa",
    ctaHref: "/preorders",
  },
  feature: {
    imageUrl: "/assets/home/tamashii-myth-cloth-ex-pegasus.jpg",
    name: "Pegasus Seiya",
    collectionLabel: "Myth Cloth EX",
  },
  featuredCollections: [
    {
      imageUrl: "/assets/home/collection-myth-cloth-ex.jpg",
      collectionSlug: "myth-cloth-ex",
      collectionName: "Myth Cloth EX",
    },
    {
      imageUrl: "/assets/home/collection-soul-of-gold.jpg",
      collectionSlug: "myth-cloth-classic",
      collectionName: "Myth Cloth Classic",
    },
    {
      imageUrl: "/assets/home/collection-vintage-80s.jpg",
      collectionSlug: "crown",
      collectionName: "Crown",
    },
  ],
};

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const asFeaturedCard = (
  value: unknown,
  fallback: HomeFeaturedCollectionContent,
): HomeFeaturedCollectionContent => {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    imageUrl: asString(record.imageUrl, fallback.imageUrl),
    collectionSlug: asString(record.collectionSlug, fallback.collectionSlug),
    collectionName:
      typeof record.collectionName === "string" && record.collectionName.trim()
        ? record.collectionName.trim()
        : fallback.collectionName,
  };
};

export const normalizeHomeContent = (raw: unknown): HomePageContent => {
  const record =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const hero =
    typeof record.hero === "object" && record.hero !== null
      ? (record.hero as Record<string, unknown>)
      : {};
  const feature =
    typeof record.feature === "object" && record.feature !== null
      ? (record.feature as Record<string, unknown>)
      : {};
  const cards = Array.isArray(record.featuredCollections)
    ? record.featuredCollections
    : [];

  return {
    hero: {
      backgroundImageUrl: asString(
        hero.backgroundImageUrl,
        DEFAULT_HOME_CONTENT.hero.backgroundImageUrl,
      ),
      title: asString(hero.title, DEFAULT_HOME_CONTENT.hero.title),
      secondaryTitle: asString(
        hero.secondaryTitle,
        DEFAULT_HOME_CONTENT.hero.secondaryTitle,
      ),
      subtitle: asString(hero.subtitle, DEFAULT_HOME_CONTENT.hero.subtitle),
      backgroundPosition: asString(
        hero.backgroundPosition,
        DEFAULT_HOME_CONTENT.hero.backgroundPosition ?? "center 35%",
      ),
      ctaLabel: asString(
        hero.ctaLabel,
        DEFAULT_HOME_CONTENT.hero.ctaLabel ?? "Ver preventa",
      ),
      ctaHref: asString(
        hero.ctaHref,
        DEFAULT_HOME_CONTENT.hero.ctaHref ?? "/preorders",
      ),
    },
    feature: {
      imageUrl: asString(
        feature.imageUrl,
        DEFAULT_HOME_CONTENT.feature.imageUrl,
      ),
      name: asString(feature.name, DEFAULT_HOME_CONTENT.feature.name),
      collectionLabel: asString(
        feature.collectionLabel,
        DEFAULT_HOME_CONTENT.feature.collectionLabel,
      ),
    },
    featuredCollections: [
      asFeaturedCard(cards[0], DEFAULT_HOME_CONTENT.featuredCollections[0]),
      asFeaturedCard(cards[1], DEFAULT_HOME_CONTENT.featuredCollections[1]),
      asFeaturedCard(cards[2], DEFAULT_HOME_CONTENT.featuredCollections[2]),
    ],
  };
};

export const parseHomeContentFromForm = (
  formData: FormData,
): HomePageContent => {
  return normalizeHomeContent({
    hero: {
      backgroundImageUrl: formData.get("hero.backgroundImageUrl"),
      title: formData.get("hero.title"),
      secondaryTitle: formData.get("hero.secondaryTitle"),
      subtitle: formData.get("hero.subtitle"),
      backgroundPosition: formData.get("hero.backgroundPosition"),
      ctaLabel: formData.get("hero.ctaLabel"),
      ctaHref: formData.get("hero.ctaHref"),
    },
    feature: {
      imageUrl: formData.get("feature.imageUrl"),
      name: formData.get("feature.name"),
      collectionLabel: formData.get("feature.collectionLabel"),
    },
    featuredCollections: [0, 1, 2].map((index) => ({
      imageUrl: formData.get(`featuredCollections.${index}.imageUrl`),
      collectionSlug: formData.get(
        `featuredCollections.${index}.collectionSlug`,
      ),
    })),
  });
};
