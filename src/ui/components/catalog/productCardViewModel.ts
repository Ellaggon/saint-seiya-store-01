import type { CatalogProductDTO } from "@/application/dto/catalog.dto";
import type { PreorderListItemDTO } from "@/application/dto/preorder.dto";
import type { DisplayAvailability } from "@/shared/catalog/displayAvailability";
import { resolveDisplayAvailability } from "@/shared/catalog/displayAvailability";

export interface ProductCardViewModel {
  id: string;
  name: string;
  character: string;
  line: string;
  price: number;
  image: string;
  status: string;
  displayAvailability: DisplayAvailability;
  preorder?: {
    etaLabel?: string | null;
    availableUnits: number;
    totalUnits: number;
    depositAmount: number;
    isOpen: boolean;
  };
}

const placeholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%2309090b'/%3E%3Cpath d='M150 150h100v100h-100z' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='12' fill='%2352525b' font-weight='bold' letter-spacing='0.2em' text-anchor='middle' dominant-baseline='middle'%3EIMAGEN NO DISPONIBLE%3C/text%3E%3C/svg%3E";

const formatDateLabel = (value?: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-BO", {
    month: "long",
    year: "numeric",
  }).format(date);
};

export const toCatalogProductCardProps = (
  product: CatalogProductDTO,
): ProductCardViewModel => {
  const price =
    typeof product.price === "number"
      ? product.price
      : Number.parseFloat(product.price || "0");

  const preorder = product.preorder
    ? {
        etaLabel:
          product.preorder.etaLabel ||
          formatDateLabel(product.preorder.etaStart) ||
          formatDateLabel(product.preorder.releaseDate) ||
          "Llegada por confirmar",
        availableUnits: product.preorder.availableUnits,
        totalUnits: product.preorder.totalUnits,
        depositAmount: product.preorder.depositAmount,
        isOpen: product.preorder.isOpen,
      }
    : undefined;

  return {
    id: product.id,
    name: product.name,
    character: product.character || "Sin personaje",
    line: product.line || "Sin colección",
    price,
    image: product.imageUrl || placeholderImage,
    status: product.status,
    displayAvailability:
      product.displayAvailability ||
      resolveDisplayAvailability({
        status: product.status,
        preorder,
      }),
    preorder,
  };
};

export const toPreorderProductCardProps = (
  item: PreorderListItemDTO,
): ProductCardViewModel => {
  const firstCharacter = item.product.characters?.[0]?.name;

  return {
    id: item.product.id,
    name: item.product.name,
    character: firstCharacter || "Sin personaje",
    line: item.product.collection?.name || "Sin colección",
    price: item.product.price,
    image: item.product.imageUrl || placeholderImage,
    status: item.product.status,
    displayAvailability: resolveDisplayAvailability({
      status: item.product.status,
      preorder: {
        isOpen: item.campaign.isOpen,
        availableUnits: item.campaign.availableUnits,
      },
    }),
    preorder: {
      etaLabel:
        item.campaign.etaLabel ||
        item.campaign.etaStart ||
        item.campaign.releaseDate ||
        "Llegada por confirmar",
      availableUnits: item.campaign.availableUnits,
      totalUnits: item.campaign.totalSlots,
      depositAmount: item.pricing.depositRequired,
      isOpen: item.campaign.isOpen,
    },
  };
};
