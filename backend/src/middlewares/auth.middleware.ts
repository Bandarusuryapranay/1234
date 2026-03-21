import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, isTokenBlacklisted } from '../lib/jwt'
import type { Role } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        role: Role
        candidateId?: string
      }
    }
  }
}

// ─── Authenticate ─────────────────────────────────────────────
// Verifies JWT, checks blacklist, attaches req.user

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing' })
  }

  const token = authHeader.slice(7)

  try {
    // Check blacklist FIRST — catches terminated candidates immediately
    const blacklisted = await isTokenBlacklisted(token)
    if (blacklisted) {
      return res.status(401).json({
        error: 'Session has been revoked',
        code: 'TOKEN_REVOKED',
      })
    }

    const payload = verifyAccessToken(token)

    req.user = {
      userId: payload.sub,
      role: payload.role,
      candidateId: payload.candidateId,
    }

    // Fallback: if candidateId is missing from token but user is a candidate, look it up
    if (!req.user.candidateId && req.user.role === 'CANDIDATE') {
      const { prisma } = await import('../lib/prisma')
      const profile = await prisma.candidateProfile.findUnique({
        where: { userId: payload.sub },
        select: { id: true }
      })
      if (profile) req.user.candidateId = profile.id
    }

    next()
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ─── Role Guard ───────────────────────────────────────────────

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

// Convenience
export const requireAdmin     = requireRole('ADMIN')
export const requireRecruiter = requireRole('RECRUITER', 'ADMIN')
export const requireCandidate = requireRole('CANDIDATE')
