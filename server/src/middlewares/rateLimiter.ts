import { Request } from 'express'
import rateLimit from 'express-rate-limit'

function buildLimiter(
  windowMs: number,
  max: number,
  message: string,
  skip?: (req: Request) => boolean,
) {
  return rateLimit({
    windowMs,
    max,
    skip,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  })
}

export const generalApiLimiter = buildLimiter(
  15 * 60 * 1000,
  600,
  'Too many requests, please try again in a few minutes.',
  (req) => req.originalUrl === '/api/wallet/webhook'
)

export const authLimiter = buildLimiter(
  15 * 60 * 1000,
  25,
  'Too many authentication attempts, please try again later.'
)

export const uploadLimiter = buildLimiter(
  15 * 60 * 1000,
  60,
  'Too many uploads, please slow down and try again later.'
)
