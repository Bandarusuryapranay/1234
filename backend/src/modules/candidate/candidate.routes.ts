import { Router } from 'express'
import { authenticate, requireCandidate } from '../../middlewares/auth.middleware'
import { resumeUpload } from '../../utils/file-upload.util'
import * as C from './candidate.controller'

export const candidateRouter = Router()
candidateRouter.use(authenticate, requireCandidate)

candidateRouter.get('/profile',          C.getProfile)
candidateRouter.get('/onboarding',       C.getOnboardingStatus)
candidateRouter.post('/resume', resumeUpload.single('resume'), C.uploadResume)
candidateRouter.post('/identity',        C.saveIdentity)
