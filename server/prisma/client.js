import { PrismaClient } from '@prisma/client';

// Singleton — reuse across hot reloads in dev
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
