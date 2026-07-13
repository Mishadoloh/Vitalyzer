import { PrismaClient } from '@prisma/client';

const neonDatabaseUrl =
  process.env.NEON_POSTGRES_PRISMA_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.NEON_POSTGRES_URL;

process.env.DATABASE_URL = process.env.VERCEL ? neonDatabaseUrl || process.env.DATABASE_URL : process.env.DATABASE_URL || neonDatabaseUrl;

// Standard Next.js dev-mode singleton to avoid exhausting DB connections
// on every hot-reload of a route module.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
