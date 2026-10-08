import { Prisma, PrismaClient } from "@prisma/client";
import { runtimeDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// DATABASE_URL is canonical; legacy names remain supported so an existing
// Vercel deployment does not lose access until its environment is migrated.
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.PRISMA_DATABASE_URL ||
  process.env.POSTGRES_URL;

// Supabase: run queries through the transaction pooler (see database-url.ts).
const runtimeUrl = runtimeDatabaseUrl(databaseUrl, process.env.DATABASE_SESSION_MODE === "1");

const prismaOptions: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  ...(runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : {}),
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
