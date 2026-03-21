import 'dotenv/config'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import type { Role } from '@prisma/client'

export interface JWTPayload {
  sub:          string
  role:         Role
  candidateId?: string
  iat?:         number
  exp?:         number
}

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  })
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
  })
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { sub: string }
}

export async function blacklistToken(token: string, userId: string, reason: string): Promise<void> {
  const decoded = jwt.decode(token) as JWTPayload | null
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 15 * 60 * 1000)

  await prisma.jWTBlacklist.upsert({
    where:  { token },
    update: {},
    create: { token, userId, reason, expiresAt },
  })
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const record = await prisma.jWTBlacklist.findUnique({ where: { token } })
    return !!record
  } catch {
    return false
  }
}