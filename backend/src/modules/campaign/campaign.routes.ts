import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/auth.middleware'
import * as C from './campaign.controller'

export const campaignRouter = Router()
campaignRouter.use(authenticate, requireAdmin)

campaignRouter.post('/',                      C.create)
campaignRouter.get('/',                       C.getAll)
campaignRouter.get('/:id',                    C.getOne)
campaignRouter.patch('/:id',                  C.update)
campaignRouter.patch('/:id/status',           C.updateStatus)
campaignRouter.delete('/:id',                 C.remove)
campaignRouter.post('/:id/assign-recruiter',  C.assignRecruiter)
