import type { CatalogProductDTO } from "@/application/dto/catalog.dto";
import type { PreorderListItemDTO } from "@/application/dto/preorder.dto";

export interface ProductCardViewModel {
  id: string;
  name: string;
  character: string;
  line: string;
  price: number;
  image: string;
  status: string;
  preorder?: {
    etaLabel?: string | null;
    availableUnits: number;
    totalUnits: number;
    depositAmount: number;
    isOpen: boolean;
  };
}

const placeholderImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%2309090b'/%3E%3Cpath d='M150 150h100v100h-100z' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='12' fill='%2352525b' font-weight='bold' letter-spacing='0.2em' text-anchor='middle' dominant-baseline='middle'%3EIMAGE UNAVAILABLE%3C/text%3E%3C/svg%3E";

export const toCatalogProductCardProps = (
  product: CatalogProductDTO,
): ProductCardViewModel => ({
  id: product.id,
  name: product.name,
  character: product.character || "UNKNOWN",
  line: product.line || "UNKNOWN LINE",
  price:
    typeof product.price === "number"
      ? product.price
      : Number.parseFloat(product.price || "0"),
  image: product.imageUrl || placeholderImage,
  status: product.status,
});

export const toPreorderProductCardProps = (
  item: PreorderListItemDTO,
): ProductCardViewModel => {
  const firstCharacter = item.product.characters?.[0]?.name;

  return {
    id: item.product.id,
    name: item.product.name,
    character: firstCharacter || "UNKNOWN",
    line: item.product.collection?.name || "UNKNOWN LINE",
    price: item.product.price,
    image: item.product.imageUrl || placeholderImage,
    status: item.product.status,
    preorder: {
      etaLabel:
        item.campaign.etaLabel ||
        item.campaign.etaStart ||
        item.campaign.releaseDate ||
        "ETA PENDING",
      availableUnits: item.campaign.availableUnits,
      totalUnits: item.campaign.totalSlots,
      depositAmount: item.pricing.depositRequired,
      isOpen: item.campaign.isOpen,
    },
  };
};
