import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { error: 'Too many login attempts. Try again in 15 minutes.' },
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      500,
  message:  { error: 'Too many requests.' },
})

export const strikeEventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      60,
  message:  { error: 'Rate limit exceeded on proctoring events.' },
})
