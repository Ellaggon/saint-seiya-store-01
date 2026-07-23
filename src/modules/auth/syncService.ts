import { prisma } from "@/infrastructure/database/prisma";
import type { User } from "@prisma/client";

interface SyncUserInput {
  id: string;
  email?: string;
  name?: string;
}

interface CacheEntry {
  value: User;
  expires: number;
}

const USER_CACHE_TTL_MS = 60_000;
const userCache = new Map<string, CacheEntry>();

export class AuthSyncService {
  static async findOrCreateUser(input: SyncUserInput) {
    const cached = userCache.get(input.id);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: input.id },
    });

    if (existingUser) {
      userCache.set(input.id, {
        value: existingUser,
        expires: Date.now() + USER_CACHE_TTL_MS,
      });
      return existingUser;
    }

    if (input.email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUserByEmail) {
        userCache.set(input.id, {
          value: existingUserByEmail,
          expires: Date.now() + USER_CACHE_TTL_MS,
        });
        return existingUserByEmail;
      }
    }

    try {
      const created = await prisma.user.create({
        data: {
          id: input.id,
          email: input.email ?? "",
          name: input.name ?? "",
          role: "CUSTOMER",
          status: "ACTIVE",
        },
      });
      userCache.set(input.id, {
        value: created,
        expires: Date.now() + USER_CACHE_TTL_MS,
      });
      return created;
    } catch (error) {
      if (!input.email) throw error;

      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUserByEmail) {
        userCache.set(input.id, {
          value: existingUserByEmail,
          expires: Date.now() + USER_CACHE_TTL_MS,
        });
        return existingUserByEmail;
      }

      throw error;
    }
  }
}
