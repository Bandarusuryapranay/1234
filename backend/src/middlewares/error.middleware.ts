import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { logger } from '../lib/logger'

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      fields: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already exists', field: err.meta?.target })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' })
    }
  }

  // Custom thrown errors { status, message, code }
  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code && { code: err.code }),
    })
  }

  // JWT
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' })
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ error: 'Token expired' })

  // Unknown
  logger.error(`Unhandled error: ${req.method} ${req.path}`, err)
  res.status(500).json({ error: 'Internal server error' })
}
