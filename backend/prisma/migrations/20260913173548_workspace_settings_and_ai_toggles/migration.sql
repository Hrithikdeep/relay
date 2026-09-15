-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "ai_error_analysis_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ai_job_classification_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ai_predictive_monitoring_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "default_backoff_ms" INTEGER NOT NULL DEFAULT 600,
ADD COLUMN     "default_max_attempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "default_timeout_seconds" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ALTER COLUMN "name" DROP NOT NULL;
