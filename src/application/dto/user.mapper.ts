import type { User } from "../../domain/entities/User";
import type { UserDTO } from "./user.dto";

export class UserMapper {
  static toDTO(user: User): UserDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }

  static toDTOList(users: User[]): UserDTO[] {
    return users.map((user) => this.toDTO(user));
  }
}
