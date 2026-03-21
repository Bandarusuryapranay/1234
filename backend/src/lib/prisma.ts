import { PrismaClient, Prisma } from '@prisma/client' // Add Prisma import
import { logger } from './logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Create the client
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// FIX: Use a type assertion to allow the $on method
if (process.env.NODE_ENV === 'development') {
  // We cast to 'any' or the specific Prisma.Kits type to satisfy the compiler
  (prisma as any).$on('query', (e: Prisma.QueryEvent) => {
    if (e.duration > 500) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`)
    }
  })
}