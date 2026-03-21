import type { Request, Response, NextFunction } from 'express'
import * as AdminService        from './admin.service'
import { adminManualAdvance, adminReject } from '../attempt/round-advancement.service'

export async function createRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await AdminService.createRecruiter(req.body))
  } catch (err) { next(err) }
}

export async function getAllRecruiters(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await AdminService.getAllRecruiters())
  } catch (err) { next(err) }
}

export async function getRecruiterById(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await AdminService.getRecruiterById(req.params.id))
  } catch (err) { next(err) }
}

export async function updateRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await AdminService.updateRecruiter(req.params.id, req.body))
  } catch (err) { next(err) }
}

export async function removeFromCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await AdminService.removeRecruiterFromCampaign(req.params.id, req.params.campaignId))
  } catch (err) { next(err) }
}

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await AdminService.getDashboardStats(req.user!.userId))
  } catch (err) { next(err) }
}

// POST /api/admin/candidates/:id/advance-round
export async function advanceRound(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminManualAdvance(req.params.id, req.user!.userId)
    res.json(result)
  } catch (err) { next(err) }
}

// POST /api/admin/candidates/:id/reject
export async function rejectCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminReject(req.params.id, req.user!.userId, req.body.reason)
    res.json(result)
  } catch (err) { next(err) }
}

export async function deleteRecruiter(req: Request, res: Response, next: NextFunction) {
  try {
    await AdminService.deleteRecruiter(req.params.id)
    res.json({ ok: true })
  } catch (err) { next(err) }
}