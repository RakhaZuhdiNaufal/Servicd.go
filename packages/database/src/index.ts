import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // 'query' mencetak tiap SQL; berguna saat men-debug, tapi bikin dev server berisik dan lambat.
  // Nyalakan lagi dengan PRISMA_LOG_QUERY=1 kalau perlu melihat query yang jalan.
  log:
    process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG_QUERY === '1'
      ? ['query', 'error', 'warn']
      : ['error', 'warn']
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
