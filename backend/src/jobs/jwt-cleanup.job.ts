import { jwtCleanupQueue } from './queue'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

async function runCleanup() {
  const [blacklist, refresh] = await Promise.all([
    prisma.jWTBlacklist.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.refreshToken.deleteMany({  where: { expiresAt: { lt: new Date() } } }),
  ])
  logger.info(`[JWTCleanup] Removed ${blacklist.count} blacklisted + ${refresh.count} refresh tokens`)
  return { blacklist: blacklist.count, refresh: refresh.count }
}

jwtCleanupQueue.process('cleanup', runCleanup)

// FIX 8: Run immediately on startup, then every hour
runCleanup().catch(err => logger.warn('[JWTCleanup] Startup run failed:', err.message))
jwtCleanupQueue.schedule(60 * 60 * 1000, 'cleanup')