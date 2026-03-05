export enum ProductStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  PRE_ORDER = "PRE_ORDER",
  OUT_OF_STOCK = "OUT_OF_STOCK",
}

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number; // Decimal implementation in domain logic, stored as number in simple TS
  categoryId: string;
  height: number;
  material: string;
  imageUrl: string;
  stock: number;
  status: ProductStatus;
}

export class Product {
  constructor(private readonly props: ProductProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): number {
    return this.props.price;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get height(): number {
    return this.props.height;
  }

  get material(): string {
    return this.props.material;
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  get stock(): number {
    return this.props.stock;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  static create(props: ProductProps): Product {
    return new Product(props);
  }
}
