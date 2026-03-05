import { prisma } from "@/infrastructure/database/prisma";

export class AuthSyncService {
  static async syncUser(supabaseUser: {
    id: string;
    email?: string;
    name?: string;
  }) {
    if (!supabaseUser.email) return null;

    const user = await prisma.user.upsert({
      where: { email: supabaseUser.email },
      update: {
        // Update name if it changed or was empty
        name: supabaseUser.name || undefined,
      },
      create: {
        id: supabaseUser.id, // We can use Supabase ID or let Prisma generate one.
        // Using Supabase ID is better for consistency if we want to link them easily.
        email: supabaseUser.email,
        name: supabaseUser.name || "",
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });

    return user;
  }

  static async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }
}
