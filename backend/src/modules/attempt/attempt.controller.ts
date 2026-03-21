import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import * as AttemptService from './attempt.service'
import {
  StartAttemptDto, SubmitMCQDto, SubmitCodingDto,
  SubmitInterviewDto, SubmitLiveCodingCodeDto, SubmitLiveCodingExplainDto,
  CompleteAttemptDto,
} from './attempt.dto'

// Multer for audio upload (live coding explanation)
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

export async function start(req: Request, res: Response, next: NextFunction) {
  try {
    const input  = StartAttemptDto.parse(req.body)
    const result = await AttemptService.startAttempt(req.user!.candidateId!, input)
    res.status(201).json(result)
  } catch (err) { next(err) }
}

export async function getQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await AttemptService.getAttemptQuestions(req.params.attemptId))
  } catch (err) { next(err) }
}

export async function submitMCQ(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitMCQDto.parse(req.body)
    res.json(await AttemptService.submitMCQAnswer(input))
  } catch (err) { next(err) }
}

export async function submitCoding(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitCodingDto.parse(req.body)
    res.json(await AttemptService.submitCodingAnswer(input))
  } catch (err) { next(err) }
}

export async function submitInterview(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitInterviewDto.parse(req.body)
    res.json(await AttemptService.submitInterviewAnswer(input))
  } catch (err) { next(err) }
}

// LIVE_CODING Phase 1: candidate submits their code
export async function submitLiveCodingCode(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SubmitLiveCodingCodeDto.parse(req.body)
    res.json(await AttemptService.submitLiveCodingCode(input))
  } catch (err) { next(err) }
}

// LIVE_CODING Phase 2: candidate submits audio explanation
// Receives: multipart/form-data with fields attemptId, answerId, questionId + file 'audio'
export const submitLiveCodingExplain = [
  audioUpload.single('audio'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { attemptId, answerId, questionId } = SubmitLiveCodingExplainDto.parse(req.body)

      if (!req.file) {
        return res.status(400).json({ error: 'Audio file is required' })
      }

      const result = await AttemptService.submitLiveCodingExplanation({
        attemptId,
        answerId,
        questionId,
        audioBuffer: req.file.buffer,
      })

      res.json(result)
    } catch (err) { next(err) }
  },
]

export async function complete(req: Request, res: Response, next: NextFunction) {
  try {
    const { attemptId } = CompleteAttemptDto.parse(req.body)
    res.json(await AttemptService.completeAttempt(attemptId, req.user!.candidateId!))
  } catch (err) { next(err) }
}