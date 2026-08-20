import { Prisma, PrismaClient } from "@prisma/client";

const prismaOptions = {
  log: [{ emit: "event", level: "error" }],
} satisfies Prisma.PrismaClientOptions;

type PrismaClientWithLogging = PrismaClient<typeof prismaOptions>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithLogging | undefined;
  prismaSchemaDriftLoggerAttached: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient<typeof prismaOptions>(prismaOptions);

if (!globalForPrisma.prismaSchemaDriftLoggerAttached) {
  prisma.$on("error", (event) => {
    const code = event.message.match(/\bP202[12]\b/)?.[0];
    if (!code) return;

    console.error(
      JSON.stringify({
        event: "prisma_schema_drift",
        severity: "critical",
        prismaCode: code,
        message: event.message,
      }),
    );
  });
  globalForPrisma.prismaSchemaDriftLoggerAttached = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
