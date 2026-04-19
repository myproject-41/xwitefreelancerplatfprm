/**
 * Standalone DB setup — run before server starts.
 * Uses direct (non-pooled) connection so DDL works on Neon.
 */
import pg from 'pg'

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL
if (!url) { console.error('No DATABASE_URL set'); process.exit(1) }

const client = new pg.Client({ connectionString: url })
await client.connect()

const patches = [
  { name: 'Add REVISION to EscrowStatus enum',
    sql: `ALTER TYPE "EscrowStatus" ADD VALUE IF NOT EXISTS 'REVISION'` },
  { name: 'Add submissionNote to tasks',
    sql: `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submissionNote" TEXT` },
  { name: 'Add submissionFiles to tasks',
    sql: `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submissionFiles" TEXT[] DEFAULT '{}'` },
  { name: 'Add revisionNote to escrows',
    sql: `ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionNote" TEXT` },
  { name: 'Add revisionImage to escrows',
    sql: `ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionImage" TEXT` },
  { name: 'Add revisionCount to escrows',
    sql: `ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionCount" INTEGER NOT NULL DEFAULT 0` },
  { name: 'Add accountHolderName to wallet_transactions',
    sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "accountHolderName" TEXT` },
  { name: 'Add bankName to wallet_transactions',
    sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "bankName" TEXT` },
  { name: 'Add accountNumber to wallet_transactions',
    sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT` },
  { name: 'Add ifscCode to wallet_transactions',
    sql: `ALTER TABLE "wallet_transactions" ADD COLUMN IF NOT EXISTS "ifscCode" TEXT` },
]

for (const p of patches) {
  try {
    await client.query(p.sql)
    console.log(`✅ ${p.name}`)
  } catch (e) {
    const msg = e?.message ?? ''
    if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('DuplicateObject')) {
      console.log(`⏭  Already applied: ${p.name}`)
    } else {
      console.error(`❌ Failed: ${p.name} — ${msg}`)
    }
  }
}

await client.end()
console.log('DB setup done.')
