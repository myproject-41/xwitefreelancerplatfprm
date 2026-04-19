import { prisma } from './db'
import { logger } from './logger'

/**
 * Idempotent DB patches — runs on every server start.
 * All statements use IF NOT EXISTS guards so they're safe to re-run.
 */
export async function runDbSetup() {
  const patches: Array<{ name: string; sql: string }> = [
    {
      name: 'Add REVISION to EscrowStatus enum',
      sql: `ALTER TYPE "EscrowStatus" ADD VALUE IF NOT EXISTS 'REVISION'`,
    },
    {
      name: 'Add submissionNote to tasks',
      sql: `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submissionNote" TEXT`,
    },
    {
      name: 'Add submissionFiles to tasks',
      sql: `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submissionFiles" TEXT[] DEFAULT '{}'`,
    },
    {
      name: 'Add revisionNote to escrows',
      sql: `ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionNote" TEXT`,
    },
    {
      name: 'Add revisionImage to escrows',
      sql: `ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionImage" TEXT`,
    },
    {
      name: 'Add revisionCount to escrows',
      sql: `ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionCount" INTEGER NOT NULL DEFAULT 0`,
    },
    {
      name: 'Add accountHolderName to wallet_transactions',
      sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "accountHolderName" TEXT`,
    },
    {
      name: 'Add bankName to wallet_transactions',
      sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "bankName" TEXT`,
    },
    {
      name: 'Add accountNumber to wallet_transactions',
      sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT`,
    },
    {
      name: 'Add ifscCode to wallet_transactions',
      sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "ifscCode" TEXT`,
    },
  ]

  for (const patch of patches) {
    try {
      await prisma.$executeRawUnsafe(patch.sql)
      logger.info(`DB patch OK: ${patch.name}`)
    } catch (err: any) {
      // "already exists" errors are harmless — log as debug, not error
      const msg: string = err?.message ?? ''
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate column') ||
        msg.includes('DuplicateObject')
      ) {
        logger.info(`DB patch skipped (already applied): ${patch.name}`)
      } else {
        logger.warn(`DB patch warning for "${patch.name}": ${msg}`)
      }
    }
  }

  logger.info('DB setup complete')
}
