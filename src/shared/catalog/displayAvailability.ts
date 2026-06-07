export type DisplayAvailabilityCode =
  | "AVAILABLE"
  | "PREORDER_OPEN"
  | "PREORDER_SOLD_OUT"
  | "OUT_OF_STOCK"
  | "UNAVAILABLE";

export interface DisplayAvailability {
  code: DisplayAvailabilityCode;
  label: string;
  schemaAvailability: string;
  canPurchase: boolean;
  canReserve: boolean;
}

interface ResolveDisplayAvailabilityInput {
  status: string;
  stock?: number | null;
  preorder?: {
    isOpen: boolean;
    availableUnits: number;
  } | null;
}

const availabilityMap: Record<DisplayAvailabilityCode, DisplayAvailability> = {
  AVAILABLE: {
    code: "AVAILABLE",
    label: "Disponible",
    schemaAvailability: "https://schema.org/InStock",
    canPurchase: true,
    canReserve: false,
  },
  PREORDER_OPEN: {
    code: "PREORDER_OPEN",
    label: "Preventa abierta",
    schemaAvailability: "https://schema.org/PreOrder",
    canPurchase: false,
    canReserve: true,
  },
  PREORDER_SOLD_OUT: {
    code: "PREORDER_SOLD_OUT",
    label: "Preventa agotada",
    schemaAvailability: "https://schema.org/SoldOut",
    canPurchase: false,
    canReserve: false,
  },
  OUT_OF_STOCK: {
    code: "OUT_OF_STOCK",
    label: "Agotado",
    schemaAvailability: "https://schema.org/OutOfStock",
    canPurchase: false,
    canReserve: false,
  },
  UNAVAILABLE: {
    code: "UNAVAILABLE",
    label: "No disponible",
    schemaAvailability: "https://schema.org/Discontinued",
    canPurchase: false,
    canReserve: false,
  },
};

export const resolveDisplayAvailability = ({
  status,
  stock,
  preorder,
}: ResolveDisplayAvailabilityInput): DisplayAvailability => {
  if (preorder) {
    return preorder.isOpen && preorder.availableUnits > 0
      ? availabilityMap.PREORDER_OPEN
      : availabilityMap.PREORDER_SOLD_OUT;
  }

  if (status === "OUT_OF_STOCK") {
    return availabilityMap.OUT_OF_STOCK;
  }

  if (status === "PUBLISHED") {
    if (stock !== undefined && stock !== null && stock <= 0) {
      return availabilityMap.OUT_OF_STOCK;
    }

    return availabilityMap.AVAILABLE;
  }

  if (status === "PRE_ORDER") {
    return availabilityMap.PREORDER_SOLD_OUT;
  }

  return availabilityMap.UNAVAILABLE;
};
