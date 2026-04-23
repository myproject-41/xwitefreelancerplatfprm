import dotenv from 'dotenv'
import path from 'path'
import { z } from 'zod'

// Load .env from root folder during local development.
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') })
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().default(''),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  FRONTEND_URL: z.string().optional(),
  BASE_URL: z.string().optional(),
  ALLOW_INSECURE_TLS: z.enum(['true', 'false']).optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production' && !data.FRONTEND_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'FRONTEND_URL is required in production',
      path: ['FRONTEND_URL'],
    })
  }
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ')

  throw new Error(`Invalid environment configuration: ${message}`)
}

export const env = parsed.data
