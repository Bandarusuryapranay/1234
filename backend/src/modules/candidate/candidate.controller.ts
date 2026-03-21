import type { Request, Response, NextFunction } from 'express'
import * as CandidateService from './candidate.service'

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await CandidateService.getMyProfile(req.user!.candidateId!))
  } catch (err) { next(err) }
}

export async function uploadResume(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const result = await CandidateService.uploadResume(
      req.user!.candidateId!,
      req.file.buffer,
      req.file.mimetype,
    )
    res.json(result)
  } catch (err) { next(err) }
}

export async function getOnboardingStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await CandidateService.getOnboardingStatus(req.user!.candidateId!))
  } catch (err) { next(err) }
}

export async function saveIdentity(req: Request, res: Response, next: NextFunction) {
  try {
    const { descriptor, photoUrl } = req.body
    res.json(await CandidateService.saveIdentity(req.user!.candidateId!, descriptor, photoUrl))
  } catch (err) { next(err) }
}
