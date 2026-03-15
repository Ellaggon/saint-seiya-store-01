import { prisma } from "./prisma";
import type { UserRepository } from "../../domain/repositories/UserRepository";
import { User, UserRole, UserStatus } from "../../domain/entities/User";

export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const prismaUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!prismaUser) return null;

    return this.mapToDomain(prismaUser);
  }

  async findByEmail(email: string): Promise<User | null> {
    const prismaUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!prismaUser) return null;

    return this.mapToDomain(prismaUser);
  }

  async findAll(): Promise<User[]> {
    const prismaUsers = await prisma.user.findMany();
    return prismaUsers.map((u: any) => this.mapToDomain(u));
  }

  async save(user: User): Promise<void> {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role as any,
        status: user.status as any,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role as any,
        status: user.status as any,
        createdAt: user.createdAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  private mapToDomain(prismaUser: any): User {
    return User.create({
      id: prismaUser.id,
      name: prismaUser.name,
      email: prismaUser.email,
      address: prismaUser.address,
      role: prismaUser.role as UserRole,
      status: prismaUser.status as UserStatus,
      createdAt: prismaUser.createdAt,
    });
  }
}
