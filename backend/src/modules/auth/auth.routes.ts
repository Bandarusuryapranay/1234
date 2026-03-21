import { Router } from 'express'
import { authenticate } from '../../middlewares/auth.middleware'
import * as AuthController from './auth.controller'

export const authRouter = Router()

// ── Public routes (no JWT needed) ────────────────────────────
authRouter.post('/login',   AuthController.login)
authRouter.post('/refresh', AuthController.refresh)

// ── Protected routes (JWT required) ──────────────────────────
authRouter.post('/logout',          authenticate, AuthController.logout)
authRouter.post('/change-password', authenticate, AuthController.changePassword)
authRouter.get('/me',               authenticate, AuthController.getMe)
