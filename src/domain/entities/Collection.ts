export interface CollectionProps {
  id: string;
  name: string;
  slug: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Collection {
  constructor(private readonly props: CollectionProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  static create(props: CollectionProps): Collection {
    return new Collection(props);
  }
}
