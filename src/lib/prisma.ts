import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// DATABASE_URL is the single canonical Prisma/PostgreSQL connection string.
const databaseUrl = process.env.DATABASE_URL;

const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  ...(databaseUrl
    ? {
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      }
    : {}),
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
