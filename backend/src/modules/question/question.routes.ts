import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware'
import * as C from './question.controller'

export const questionRouter = Router()

// Topics endpoint is public to authenticated admins
questionRouter.get('/topics',                authenticate, requireAdmin, C.getTopics)
questionRouter.post('/generate',             authenticate, requireAdmin, C.generatePool)
questionRouter.get('/preview/:campaignId',   authenticate, requireAdmin, C.getPoolPreview)
questionRouter.patch('/approve',             authenticate, requireAdmin, C.approveQuestion)