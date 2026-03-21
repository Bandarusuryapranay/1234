import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export async function roundOrderGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.body
    if (!roundId) return next()

    const candidateId = req.user!.candidateId!

    const round = await prisma.pipelineRound.findUniqueOrThrow({
      where: { id: roundId },
    })

    // If this is round 1, always allow
    if (round.order === 1) return next()

    // Find the previous round
    const prevRound = await prisma.pipelineRound.findFirst({
      where: { campaignId: round.campaignId, order: round.order - 1 },
    })

    if (!prevRound) return next()

    // Check if candidate has a COMPLETED attempt for the previous round
    const prevAttempt = await prisma.candidateAttempt.findFirst({
      where: { candidateId, roundId: prevRound.id, status: 'COMPLETED' },
    })

    if (!prevAttempt) {
      return res.status(400).json({
        error: `You must complete Round ${prevRound.order} (${prevRound.roundType}) before starting Round ${round.order}.`,
        code:  'ROUND_ORDER_VIOLATION',
      })
    }

    // Check pass/fail gating if failAction = AUTO_REJECT
    const cfg = prevRound.roundConfig as any
    if (cfg.failAction === 'AUTO_REJECT' && prevAttempt.passed === false) {
      return res.status(403).json({
        error: `You did not pass Round ${prevRound.order}. You are not eligible to continue.`,
        code:  'ROUND_FAILED',
      })
    }

    next()
  } catch (err) { next(err) }
}