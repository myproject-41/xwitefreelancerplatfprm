-- Add submissionNote to Task table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "submissionNote" TEXT;

-- Add revisionNote to Escrow table
ALTER TABLE "escrows" ADD COLUMN IF NOT EXISTS "revisionNote" TEXT;
