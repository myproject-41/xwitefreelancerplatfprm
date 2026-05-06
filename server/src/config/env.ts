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
  FRONTEND_URL_2: z.string().optional(),
  BASE_URL: z.string().optional(),
  ALLOW_INSECURE_TLS: z.enum(['true', 'false']).optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('; ')

  throw new Error(`Invalid environment configuration: ${message}`)
}

export const env = parsed.data

// ─── Razorpay key sanity checks (warnings only — never block server boot) ──
// Production safety is enforced inside wallet.service.ts where the keys are
// actually used. Throwing here would put the whole server in a restart loop
// and cascade 502s to every endpoint, including /api/auth/login.
if (env.RAZORPAY_KEY_ID) {
  const isLiveKey = env.RAZORPAY_KEY_ID.startsWith('rzp_live_')
  const isTestKey = env.RAZORPAY_KEY_ID.startsWith('rzp_test_')

  if (!isLiveKey && !isTestKey) {
    console.warn('[env] RAZORPAY_KEY_ID does not match expected rzp_live_* / rzp_test_* format')
  }
  if (env.NODE_ENV === 'production' && isTestKey) {
    console.warn('[env] WARNING: Test Razorpay key in production — payments will use test mode')
  }
  if (env.NODE_ENV !== 'production' && isLiveKey) {
    console.warn('[env] WARNING: Live Razorpay key in non-production environment — real money will move!')
  }
  if (env.NODE_ENV === 'production' && !env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn('[env] WARNING: RAZORPAY_WEBHOOK_SECRET not set — webhooks will be rejected')
  }
}
