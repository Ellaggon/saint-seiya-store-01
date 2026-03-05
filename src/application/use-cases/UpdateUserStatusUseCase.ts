import type { UserRepository } from "../../domain/repositories/UserRepository";
import type { UpdateUserStatusRequestDTO, UserDTO } from "../dto/user.dto";
import { UserMapper } from "../dto/user.mapper";

export class UpdateUserStatusUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(request: UpdateUserStatusRequestDTO): Promise<UserDTO> {
    const user = await this.userRepository.findById(request.id);

    if (!user) {
      throw new Error(`User with id ${request.id} not found`);
    }

    const updatedUser = user.updateStatus(request.status);
    await this.userRepository.save(updatedUser);

    return UserMapper.toDTO(updatedUser);
  }
}
