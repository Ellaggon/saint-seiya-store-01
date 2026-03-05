export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface UserProps {
  id: string;
  name: string;
  email: string;
  address: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export class User {
  constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get address(): string {
    return this.props.address;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  static create(props: UserProps): User {
    return new User(props);
  }

  updateRole(role: UserRole): User {
    return new User({ ...this.props, role });
  }

  updateStatus(status: UserStatus): User {
    return new User({ ...this.props, status });
  }
}
