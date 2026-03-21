import { gapAnalysisQueue } from './queue'
import { generateScorecard } from '../modules/scorecard/scorecard.service'
import { logger } from '../lib/logger'

gapAnalysisQueue.process('analyze', async (job) => {
  const { candidateId } = job.data
  logger.info(`[GapAnalysis] Starting for candidate ${candidateId}`)
  const scorecard = await generateScorecard(candidateId)
  logger.info(`[GapAnalysis] Done — Fit: ${scorecard.technicalFitPercent}%`)
  return { ok: true, candidateId, technicalFitPercent: scorecard.technicalFitPercent }
})

gapAnalysisQueue.on('failed', (job, err) => {
  logger.error(`[GapAnalysis] Failed for candidate ${job.data.candidateId}: ${err.message}`)
})