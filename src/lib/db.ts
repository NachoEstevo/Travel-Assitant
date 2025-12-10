import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  db: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Reuse pool if available
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({ connectionString });
  }

  const adapter = new PrismaPg(globalForPrisma.pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });
}

// Lazy-load the database client
let _db: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!_db) {
    _db = globalForPrisma.db ?? createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.db = _db;
    }
  }
  return _db;
}

// For backwards compatibility - but this will throw at build time
// Use getDb() for lazy loading
export const db = {
  get searchQuery() { return getDb().searchQuery; },
  get flightResult() { return getDb().flightResult; },
  get session() { return getDb().session; },
  get scheduledTask() { return getDb().scheduledTask; },
  get notification() { return getDb().notification; },
  get chatMessage() { return getDb().chatMessage; },
  get priceHistory() { return getDb().priceHistory; },
  get priceAlert() { return getDb().priceAlert; },
  $transaction: (...args: Parameters<PrismaClient['$transaction']>) => getDb().$transaction(...args),
  $connect: () => getDb().$connect(),
  $disconnect: () => getDb().$disconnect(),
} as unknown as PrismaClient;

// Alias for compatibility
export const prisma = db;
