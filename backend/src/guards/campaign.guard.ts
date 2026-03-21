import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export async function campaignGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const candidateId = req.user!.candidateId!
    const campaignId  = req.params.campaignId || req.body.campaignId
    if (!campaignId) return next()
    const candidate = await prisma.candidateProfile.findUnique({ where: { id: candidateId } })
    if (!candidate || candidate.campaignId !== campaignId) {
      return res.status(403).json({ error: 'You do not belong to this campaign' })
    }
    next()
  } catch (err) { next(err) }
}
