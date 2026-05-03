-- Add estimatedDays to proposals table
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "estimatedDays" INTEGER;

-- Add estimatedDays to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimatedDays" INTEGER;
