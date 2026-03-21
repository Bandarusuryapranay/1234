import 'dotenv/config'
import http from 'http'
import app from './app'
import { prisma } from './lib/prisma'
import { logger } from './lib/logger'
import { initProctoringGateway } from './modules/proctoring/proctoring.gateway'

// Register background jobs (pure Node.js — no Redis needed)
import './jobs/pool-generation.job'
import './jobs/gap-analysis.job'
import './jobs/jwt-cleanup.job'

const PORT = process.env.PORT || 4000

async function bootstrap() {
  await prisma.$connect()
  logger.info('✅ Database connected')

  const httpServer = http.createServer(app)

  initProctoringGateway(httpServer)
  logger.info('✅ WebSocket gateway ready')
  logger.info('✅ Background jobs registered (in-process, no Redis)')

  httpServer.listen(PORT, () => {
    logger.info(`🚀 SmartHire API on port ${PORT} [${process.env.NODE_ENV}]`)
  })
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error', err)
  process.exit(1)
})