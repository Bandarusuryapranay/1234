import type { Request, Response, NextFunction } from 'express'
import * as QuestionService from './question.service'
import { GeneratePoolDto, ApproveQuestionDto } from './question.dto'

export async function generatePool(req: Request, res: Response, next: NextFunction) {
  try {
    const { campaignId } = GeneratePoolDto.parse(req.body)
    const result = await QuestionService.triggerPoolGeneration(campaignId)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getPoolPreview(req: Request, res: Response, next: NextFunction) {
  try {
    const pools = await QuestionService.getPoolPreview(req.params.campaignId)
    res.json(pools)
  } catch (err) { next(err) }
}

export async function approveQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { questionId, approved } = ApproveQuestionDto.parse(req.body)
    const question = await QuestionService.approveQuestion(questionId, approved)
    res.json(question)
  } catch (err) { next(err) }
}

// GET /api/questions/topics
// Returns all available aptitude and DSA topics for the frontend picker
export async function getTopics(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(QuestionService.getAvailableTopics())
  } catch (err) { next(err) }
}