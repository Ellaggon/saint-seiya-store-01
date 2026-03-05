import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UpdateUserRoleRequestDTO, UserDTO } from "../dto/user.dto";
import { UserMapper } from "../dto/user.mapper";

export class UpdateUserRoleUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(request: UpdateUserRoleRequestDTO): Promise<UserDTO> {
    const user = await this.userRepository.findById(request.id);

    if (!user) {
      throw new Error(`User with id ${request.id} not found`);
    }

    const updatedUser = user.updateRole(request.role);
    await this.userRepository.save(updatedUser);

    return UserMapper.toDTO(updatedUser);
  }
}
