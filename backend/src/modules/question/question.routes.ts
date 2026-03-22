import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware'
import * as C from './question.controller'

export const questionRouter = Router()

questionRouter.get('/topics',                        authenticate, requireAdmin, C.getTopics)
questionRouter.post('/generate',                     authenticate, requireAdmin, C.generatePool)
questionRouter.get('/preview/:campaignId',           authenticate, requireAdmin, C.getPoolPreview)
questionRouter.patch('/approve',                     authenticate, requireAdmin, C.approveQuestion)
questionRouter.patch('/bulk-approve',                authenticate, requireAdmin, C.bulkApprove)
questionRouter.get('/approval-status/:campaignId',   authenticate, requireAdmin, C.getApprovalStatus)