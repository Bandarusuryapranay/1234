import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware'
import * as C from './admin.controller'

export const adminRouter = Router()
adminRouter.use(authenticate, requireAdmin)

adminRouter.get('/dashboard',                    C.getDashboard)
adminRouter.post('/recruiters',                  C.createRecruiter)
adminRouter.get('/recruiters',                   C.getAllRecruiters)
adminRouter.get('/recruiters/:id',               C.getRecruiterById)
adminRouter.patch('/recruiters/:id',             C.updateRecruiter)
adminRouter.delete('/recruiters/:id',            C.deleteRecruiter)
adminRouter.delete('/recruiters/:id/campaigns/:campaignId', C.removeFromCampaign)
adminRouter.post('/candidates/:id/advance-round',C.advanceRound)
adminRouter.post('/candidates/:id/reject',       C.rejectCandidate)