import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export async function noDoubleSubmitGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const { attemptId } = req.body
    if (!attemptId) return next()

    const attempt = await prisma.candidateAttempt.findUnique({
      where: { id: attemptId },
    })

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' })
    }

    if (attempt.status === 'COMPLETED') {
      return res.status(409).json({ error: 'This round has already been submitted.', code: 'ALREADY_SUBMITTED' })
    }

    if (attempt.status === 'TERMINATED') {
      return res.status(403).json({ error: 'This session was terminated.', code: 'SESSION_TERMINATED' })
    }

    if (attempt.status === 'TIMED_OUT') {
      return res.status(403).json({ error: 'This attempt timed out.', code: 'TIMED_OUT' })
    }

    // Verify the attempt belongs to this candidate
    if (attempt.candidateId !== req.user!.candidateId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    next()
  } catch (err) { next(err) }
}