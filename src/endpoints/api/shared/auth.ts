import { ApplicationError } from "@/application/errors/ApplicationError";

type AuthenticatedUser = NonNullable<App.Locals["user"]>;

export const requireUser = (locals: App.Locals): AuthenticatedUser => {
  if (!locals.user) {
    throw ApplicationError.unauthorized();
  }

  return locals.user;
};

export const requireAdmin = (locals: App.Locals): AuthenticatedUser => {
  const user = requireUser(locals);

  if (user.role !== "ADMIN") {
    throw ApplicationError.forbidden();
  }

  return user;
};
