-- Add REVISION to EscrowStatus enum (was missing from initial schema)
ALTER TYPE "EscrowStatus" ADD VALUE IF NOT EXISTS 'REVISION';

-- Add submissionNote and submissionFiles to Task table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submissionNote" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submissionFiles" TEXT[] DEFAULT '{}';

-- Add revision fields to Escrow table
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionNote" TEXT;
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionImage" TEXT;
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionCount" INTEGER NOT NULL DEFAULT 0;
