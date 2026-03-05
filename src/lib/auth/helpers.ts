import type { User } from "@prisma/client";

export class AuthHelpers {
  static requireAuthenticated(user: User | null | undefined): User {
    if (!user) {
      throw new Error("Unauthorized: Authentication required");
    }
    return user;
  }

  static requireAdmin(user: User | null | undefined): User {
    const authenticatedUser = this.requireAuthenticated(user);
    if (authenticatedUser.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }
    return authenticatedUser;
  }
}
