/*
  Warnings:

  - The `portfolioUrls` column on the `freelancer_profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Proficiency" AS ENUM ('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE');

-- CreateEnum
CREATE TYPE "NoticeperiodType" AS ENUM ('IMMEDIATELY', 'ONE_WEEK', 'TWO_WEEKS', 'ONE_MONTH', 'MORE_THAN_ONE_MONTH');

-- AlterTable
ALTER TABLE "client_profiles" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "taskCategories" TEXT[],
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "workPreference" TEXT;

-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "hiringSkills" TEXT[],
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "workType" TEXT[],
ALTER COLUMN "employeeCount" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "freelancer_profiles" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "fixedPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "languages" JSONB,
ADD COLUMN     "minBudget" DOUBLE PRECISION,
ADD COLUMN     "noticePeriod" "NoticeperiodType",
ADD COLUMN     "portfolioFiles" TEXT[],
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "portfolioUrls",
ADD COLUMN     "portfolioUrls" JSONB;
