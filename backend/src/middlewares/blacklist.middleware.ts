import type { Request, Response, NextFunction } from 'express'
import { isTokenBlacklisted } from '../lib/jwt'

export async function blacklistCheck(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()
  const token = authHeader.slice(7)
  const blacklisted = await isTokenBlacklisted(token)
  if (blacklisted) {
    return res.status(401).json({ error: 'Session revoked', code: 'TOKEN_REVOKED' })
  }
  next()
}
