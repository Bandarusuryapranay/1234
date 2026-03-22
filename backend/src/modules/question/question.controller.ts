import type { Request, Response, NextFunction } from 'express'
import * as QuestionService from './question.service'
import { GeneratePoolDto, ApproveQuestionDto, BulkApproveDto } from './question.dto'

export async function generatePool(req: Request, res: Response, next: NextFunction) {
  try {
    const { campaignId } = GeneratePoolDto.parse(req.body)
    res.json(await QuestionService.triggerPoolGeneration(campaignId))
  } catch (err) { next(err) }
}

export async function getPoolPreview(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await QuestionService.getPoolPreview(req.params.campaignId))
  } catch (err) { next(err) }
}

export async function approveQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { questionId, approved } = ApproveQuestionDto.parse(req.body)
    res.json(await QuestionService.approveQuestion(questionId, approved))
  } catch (err) { next(err) }
}

// PATCH /api/questions/bulk-approve
// Approve or reject ALL questions in a pool at once
export async function bulkApprove(req: Request, res: Response, next: NextFunction) {
  try {
    const { poolId, approve } = BulkApproveDto.parse(req.body)
    const result = approve
      ? await QuestionService.approveAllInPool(poolId)
      : await QuestionService.rejectAllInPool(poolId)
    res.json(result)
  } catch (err) { next(err) }
}

// GET /api/questions/approval-status/:campaignId
// Returns per-round approval counts + whether threshold is met
export async function getApprovalStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await QuestionService.getApprovalStatus(req.params.campaignId))
  } catch (err) { next(err) }
}

export async function getTopics(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(QuestionService.getAvailableTopics())
  } catch (err) { next(err) }
}