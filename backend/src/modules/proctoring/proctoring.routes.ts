import { Router } from 'express'
import { authenticate, requireCandidate } from '../../middlewares/auth.middleware'
import { strikeEventLimiter } from '../../middlewares/rateLimiter.middleware'
import * as C from './proctoring.controller'

export const proctoringRouter = Router()
proctoringRouter.use(authenticate, requireCandidate)

proctoringRouter.post('/enroll',        C.enrollCandidate)
proctoringRouter.post('/session/start',  C.startSession)
proctoringRouter.post('/violation-log',  C.logProctoringViolation)

// FIX 9: rate limit on violation endpoint — max 60/min per candidate
proctoringRouter.post('/violation',        strikeEventLimiter, C.reportViolation)
proctoringRouter.post('/mediapipe-batch',                      C.batchMediapipeEvents)
proctoringRouter.post('/background-voice',                     C.backgroundVoice)
proctoringRouter.post('/recording',                            C.saveRecording)
proctoringRouter.get('/cloudinary-signature',                 C.getCloudinarySignature)