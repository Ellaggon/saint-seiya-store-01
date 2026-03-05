import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UserDTO } from "../dto/user.dto";
import { UserMapper } from "../dto/user.mapper";

export class ListUsersUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<UserDTO[]> {
    const users = await this.userRepository.findAll();
    return UserMapper.toDTOList(users);
  }
}
