import { Router } from 'express'
import { authenticate, requireRecruiter } from '../../middlewares/auth.middleware'
import * as C from './scorecard.controller'

export const scorecardRouter = Router()
scorecardRouter.use(authenticate)

// FIX 7: /generate now queues the job instead of blocking HTTP
scorecardRouter.post('/:candidateId/generate',         requireRecruiter, C.generate)
scorecardRouter.get('/:candidateId',                   requireRecruiter, C.getOne)
scorecardRouter.patch('/:candidateId/note',            requireRecruiter, C.addNote)
scorecardRouter.get('/:candidateId/download',          requireRecruiter, C.downloadReport)
scorecardRouter.post('/:candidateId/forward-to-admin', requireRecruiter, C.forwardToAdmin)
scorecardRouter.get('/campaign/:campaignId/export-excel', requireRecruiter, C.exportExcel)