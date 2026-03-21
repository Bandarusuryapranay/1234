import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { authLimiter, apiLimiter } from './middlewares/rateLimiter.middleware'
import { errorHandler } from './middlewares/error.middleware'

import { authRouter }       from './modules/auth/auth.routes'
import { adminRouter }      from './modules/admin/admin.routes'
import { campaignRouter }   from './modules/campaign/campaign.routes'
import { questionRouter }   from './modules/question/question.routes'
import { recruiterRouter }  from './modules/recruiter/recruiter.routes'
import { candidateRouter }  from './modules/candidate/candidate.routes'
import { attemptRouter }    from './modules/attempt/attempt.routes'
import { proctoringRouter } from './modules/proctoring/proctoring.routes'
import { scorecardRouter }  from './modules/scorecard/scorecard.routes'

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }))

app.use('/api/auth',       authLimiter, authRouter)
app.use('/api',            apiLimiter)
app.use('/api/admin',      adminRouter)
app.use('/api/campaigns',  campaignRouter)
app.use('/api/questions',  questionRouter)
app.use('/api/recruiter',  recruiterRouter)
app.use('/api/candidate',  candidateRouter)
app.use('/api/attempt',    attemptRouter)
app.use('/api/proctoring', proctoringRouter)
app.use('/api/scorecard',  scorecardRouter)

app.use(errorHandler)

export default app
