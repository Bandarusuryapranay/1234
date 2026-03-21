import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import * as AttemptService from './attempt.service'
import {
  StartAttemptDto, SubmitMCQDto, SubmitCodingDto,
  SubmitInterviewDto, SubmitLiveCodingCodeDto, SubmitLiveCodingExplainDto,
  CompleteAttemptDto,
} from './attempt.dto'

export const attemptRouter = Router()

// Multer for audio upload (live coding explanation)
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const input  = StartAttemptDto.parse(req.body)
    const result = await AttemptService.startAttempt(req.user!.candidateId!, input)
    res.status(201).json(result)
  } catch (err) { next(err) }
}

async function getQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await AttemptService.getAttemptQuestions(req.params.attemptId))
  } catch (err) { next(err) }
}

async function submitMCQ(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitMCQDto.parse(req.body)
    res.json(await AttemptService.submitMCQAnswer(input))
  } catch (err) { next(err) }
}

async function submitCoding(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitCodingDto.parse(req.body)
    res.json(await AttemptService.submitCodingAnswer(input))
  } catch (err) { next(err) }
}

async function submitInterview(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitInterviewDto.parse(req.body)
    res.json(await AttemptService.submitInterviewAnswer(input))
  } catch (err) { next(err) }
}

// LIVE_CODING Phase 1: candidate submits their code
async function submitLiveCodingCode(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitLiveCodingCodeDto.parse(req.body)
    res.json(await AttemptService.submitLiveCodingCode(input))
  } catch (err) { next(err) }
}

async function submitLiveCodingExplain(req: Request, res: Response, next: NextFunction) {
  try {
    const { attemptId, answerId, questionId, audioUrl } = SubmitLiveCodingExplainDto.parse(req.body)

    const result = await AttemptService.submitLiveCodingExplanation({
      attemptId,
      answerId,
      questionId,
      audioUrl,
    })

    res.json(result)
  } catch (err) { next(err) }
}

async function complete(req: Request, res: Response, next: NextFunction) {
  try {
    const { attemptId } = CompleteAttemptDto.parse(req.body)
    res.json(await AttemptService.completeAttempt(attemptId, req.user!.candidateId!))
  } catch (err) { next(err) }
}

async function runCoding(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitCodingDto.parse(req.body)
    res.json(await AttemptService.runCodingTestCases(input))
  } catch (err) { next(err) }
}

import { authenticate, requireRole } from '../../middlewares/auth.middleware'

attemptRouter.use(authenticate)
attemptRouter.use(requireRole('CANDIDATE'))

attemptRouter.post('/start', start)
attemptRouter.get('/:attemptId/questions', getQuestions)
attemptRouter.post('/run/coding', runCoding)
attemptRouter.post('/submit/mcq', submitMCQ)
attemptRouter.post('/submit/coding', submitCoding)
attemptRouter.post('/submit/interview', submitInterview)
attemptRouter.post('/live-coding/code', submitLiveCodingCode)
attemptRouter.post('/live-coding/explain', submitLiveCodingExplain)
attemptRouter.post('/complete', complete)