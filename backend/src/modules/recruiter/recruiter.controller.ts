import type { Request, Response, NextFunction } from 'express'
import * as RecruiterService from './recruiter.service'

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.getDashboardStats(req.user!.userId, req.user!.role))
  } catch (err) { next(err) }
}

export async function getMyCampaigns(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.getMyCampaigns(req.user!.userId, req.user!.role))
  } catch (err) { next(err) }
}

export async function getCandidates(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.getCandidates(req.params.campaignId))
  } catch (err) { next(err) }
}

export async function grantPermission(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.grantPermission(req.params.candidateId))
  } catch (err) { next(err) }
}

export async function grantBulkPermission(req: Request, res: Response, next: NextFunction) {
  try {
    const { candidateIds } = req.body
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ message: 'candidateIds must be a non-empty array' })
    }
    res.json(await RecruiterService.grantBulkPermission(candidateIds))
  } catch (err) { next(err) }
}

export async function updateCandidateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.updateCandidateStatus(req.params.candidateId, req.body.status))
  } catch (err) { next(err) }
}

export async function getLiveMonitor(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.getLiveMonitor(req.params.campaignId))
  } catch (err) { next(err) }
}

export async function addCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const candidate = await RecruiterService.addCandidate(req.params.campaignId, req.body)
    res.status(201).json(candidate)
  } catch (err) { next(err) }
}

export async function editCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.editCandidate(req.params.candidateId, req.body))
  } catch (err) { next(err) }
}

export async function deleteCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.deleteCandidate(req.params.candidateId))
  } catch (err) { next(err) }
}

export async function addCandidatesBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await RecruiterService.addCandidatesBulk(req.params.campaignId, req.body.candidates)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getCandidateScorecard(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.getCandidateScorecard(req.params.candidateId))
  } catch (err) { next(err) }
}

export async function saveRecruiterNotes(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.saveRecruiterNotes(req.params.candidateId, req.body))
  } catch (err) { next(err) }
}

export async function reduceStrike(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await RecruiterService.reduceStrike(req.params.attemptId))
  } catch (err) { next(err) }
}