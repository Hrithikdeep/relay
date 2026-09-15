-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('PENDING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "execution_log_status" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'RETRIED');

-- CreateEnum
CREATE TYPE "worker_status" AS ENUM ('ONLINE', 'IDLE', 'BUSY', 'OFFLINE');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "result" JSONB,
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_execution_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "worker_id" TEXT,
    "attempt" INTEGER NOT NULL,
    "status" "execution_log_status" NOT NULL,
    "message" TEXT,
    "stack_trace" TEXT,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT,
    "status" "worker_status" NOT NULL DEFAULT 'OFFLINE',
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "version" TEXT,
    "last_heartbeat_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_error_patterns" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "queue_id" TEXT,
    "signature" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL,
    "suggested_fix" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_error_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_predictions" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "predicted_duration_ms" INTEGER,
    "failure_probability" DOUBLE PRECISION NOT NULL,
    "recommended_retries" INTEGER,
    "model_version" TEXT NOT NULL,
    "reasoning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_api_key_key" ON "workspaces"("api_key");

-- CreateIndex
CREATE INDEX "queues_workspace_id_idx" ON "queues"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "queues_workspace_id_name_key" ON "queues"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "jobs_queue_id_idx" ON "jobs"("queue_id");

-- CreateIndex
CREATE INDEX "jobs_worker_id_idx" ON "jobs"("worker_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_scheduled_at_idx" ON "jobs"("scheduled_at");

-- CreateIndex
CREATE INDEX "job_execution_logs_job_id_idx" ON "job_execution_logs"("job_id");

-- CreateIndex
CREATE INDEX "job_execution_logs_worker_id_idx" ON "job_execution_logs"("worker_id");

-- CreateIndex
CREATE INDEX "workers_workspace_id_idx" ON "workers"("workspace_id");

-- CreateIndex
CREATE INDEX "webhooks_workspace_id_idx" ON "webhooks"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_error_patterns_workspace_id_idx" ON "ai_error_patterns"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_error_patterns_queue_id_idx" ON "ai_error_patterns"("queue_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_error_patterns_workspace_id_signature_key" ON "ai_error_patterns"("workspace_id", "signature");

-- CreateIndex
CREATE INDEX "job_predictions_job_id_idx" ON "job_predictions"("job_id");

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution_logs" ADD CONSTRAINT "job_execution_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_execution_logs" ADD CONSTRAINT "job_execution_logs_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_error_patterns" ADD CONSTRAINT "ai_error_patterns_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_error_patterns" ADD CONSTRAINT "ai_error_patterns_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_predictions" ADD CONSTRAINT "job_predictions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
