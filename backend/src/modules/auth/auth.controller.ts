import type { Request, Response, NextFunction } from 'express'
import * as AuthService from './auth.service'
import { LoginDto, RefreshDto, ChangePasswordDto } from './auth.dto'

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = LoginDto.parse(req.body)
    const result = await AuthService.login(input)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = RefreshDto.parse(req.body)
    const result = await AuthService.refreshAccessToken(refreshToken)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.headers.authorization!.slice(7)
    const { refreshToken } = req.body
    await AuthService.logout(req.user!.userId, accessToken, refreshToken)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/change-password
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ChangePasswordDto.parse(req.body)
    const accessToken = req.headers.authorization!.slice(7)
    await AuthService.changePassword(req.user!.userId, input, accessToken)
    res.json({ ok: true, message: 'Password changed. Please log in again.' })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/me
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await AuthService.getMe(req.user!.userId)
    res.json(user)
  } catch (err) {
    next(err)
  }
}
