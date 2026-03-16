export interface CategoryProps {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
}

export class Category {
  constructor(private readonly props: CategoryProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get imageUrl(): string | undefined {
    return this.props.imageUrl;
  }

  static create(props: CategoryProps): Category {
    return new Category(props);
  }
}
