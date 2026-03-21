import type { Request, Response, NextFunction } from 'express'
import * as ProctoringService from './proctoring.service'

export async function reportViolation(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization!.slice(7)
    const result = await ProctoringService.recordViolation({
      ...req.body,
      candidateId:  req.user!.candidateId!,
      currentToken: token,
    })
    res.json(result)
  } catch (err) { next(err) }
}

export async function batchMediapipeEvents(req: Request, res: Response, next: NextFunction) {
  try {
    await ProctoringService.appendMediapipeLog(req.body.attemptId, req.body.events)
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function backgroundVoice(req: Request, res: Response, next: NextFunction) {
  try {
    await ProctoringService.appendBackgroundVoice(req.body.attemptId, req.body)
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function saveRecording(req: Request, res: Response, next: NextFunction) {
  try {
    await ProctoringService.saveRecording(req.body.attemptId, req.body)
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function enrollCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const { descriptor, photo } = req.body
    res.json(await ProctoringService.enrollCandidate(req.user!.candidateId!, descriptor, photo))
  } catch (err) { next(err) }
}

export async function logProctoringViolation(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ProctoringService.logProctoringViolation({
      ...req.body,
      candidateId: req.user!.candidateId!,
    })
    res.json(result)
  } catch (err) { next(err) }
}

export async function startSession(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await ProctoringService.createSession(req.user!.candidateId!))
  } catch (err) { next(err) }
}

export async function getCloudinarySignature(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ProctoringService.getCloudinarySignature(req.query)
    res.json(result)
  } catch (err) { next(err) }
}
