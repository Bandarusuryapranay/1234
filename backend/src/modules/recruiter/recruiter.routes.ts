import { Router } from 'express'
import { authenticate, requireRecruiter } from '../../middlewares/auth.middleware'
import * as C from './recruiter.controller'

export const recruiterRouter = Router()
recruiterRouter.use(authenticate, requireRecruiter)

// Dashboard
recruiterRouter.get('/dashboard/stats',                              C.getDashboardStats)

// Campaigns
recruiterRouter.get('/campaigns',                                    C.getMyCampaigns)

// Candidates (campaign-scoped)
recruiterRouter.get('/campaigns/:campaignId/candidates',             C.getCandidates)
recruiterRouter.post('/campaigns/:campaignId/candidates',            C.addCandidate)
recruiterRouter.post('/campaigns/:campaignId/candidates/bulk',       C.addCandidatesBulk)

// Live Monitor
recruiterRouter.get('/campaigns/:campaignId/monitor',                C.getLiveMonitor)

// Bulk grant access — must be BEFORE individual routes to avoid :candidateId capturing "bulk"
recruiterRouter.post('/candidates/bulk/grant',                       C.grantBulkPermission)

// Candidate actions (individual)
recruiterRouter.put('/candidates/:candidateId',                      C.editCandidate)
recruiterRouter.delete('/candidates/:candidateId',                   C.deleteCandidate)
recruiterRouter.patch('/candidates/:candidateId/status',             C.updateCandidateStatus)
recruiterRouter.post('/candidates/:candidateId/grant',               C.grantPermission)

// Scorecard (recruiter view — delegates to scorecard module for generate/download/forward)
recruiterRouter.get('/candidates/:candidateId/scorecard',            C.getCandidateScorecard)
recruiterRouter.patch('/candidates/:candidateId/notes',              C.saveRecruiterNotes)

// Proctoring manual override
recruiterRouter.patch('/attempts/:attemptId/reduce-strike',          C.reduceStrike)