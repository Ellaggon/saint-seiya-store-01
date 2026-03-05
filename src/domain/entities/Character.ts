export interface CharacterProps {
  id: string;
  name: string;
}

export class Character {
  constructor(private readonly props: CharacterProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  static create(props: CharacterProps): Character {
    return new Character(props);
  }
}
