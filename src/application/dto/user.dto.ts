import type { UserRole, UserStatus } from "../../domain/entities/User";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  address: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface CreateUserRequestDTO {
  name: string;
  email: string;
  address: string;
  role: UserRole;
  status: UserStatus;
}

export interface UpdateUserRequestDTO {
  id: string;
  name?: string;
  email?: string;
  address?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserRoleRequestDTO {
  id: string;
  role: UserRole;
}

export interface UpdateUserStatusRequestDTO {
  id: string;
  status: UserStatus;
}
