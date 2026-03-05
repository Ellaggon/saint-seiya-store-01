export interface ProductCharacterProps {
  id: string;
  productId: string;
  characterId: string;
}

export class ProductCharacter {
  constructor(private readonly props: ProductCharacterProps) {}

  get id(): string {
    return this.props.id;
  }

  get productId(): string {
    return this.props.productId;
  }

  get characterId(): string {
    return this.props.characterId;
  }

  static create(props: ProductCharacterProps): ProductCharacter {
    return new ProductCharacter(props);
  }
}
