-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "ai_calls_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ai_calls_used" INTEGER NOT NULL DEFAULT 0;
