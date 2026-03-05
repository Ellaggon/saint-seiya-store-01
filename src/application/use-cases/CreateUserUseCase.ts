import { User } from "../../domain/entities/User";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { CreateUserRequestDTO, UserDTO } from "../dto/user.dto";
import { UserMapper } from "../dto/user.mapper";

export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(request: CreateUserRequestDTO): Promise<UserDTO> {
    const user = User.create({
      id: crypto.randomUUID(),
      name: request.name,
      email: request.email,
      address: request.address,
      role: request.role,
      status: request.status,
      createdAt: new Date(),
    });

    await this.userRepository.save(user);

    return UserMapper.toDTO(user);
  }
}
