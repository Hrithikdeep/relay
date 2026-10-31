import { Prisma } from '@prisma/client';
import { Job as BullJob } from 'bullmq';
import { analyzeAndStorePattern, applyAutoFix, classifyJob } from '../ai';
import { prisma } from '../database';
import { triggerWebhooks } from '../services/WebhookService';
import { advanceWorkflowForJob } from './WorkflowEngine';
import { logger } from '../utils/logger';
import { redactPaths } from '../utils/redact';

export type JobHandler = (payload: unknown, bullJob: BullJob) => Promise<unknown>;

const jobHandlers = new Map<string, JobHandler>();

export function registerJobHandler(name: string, handler: JobHandler): void {
  jobHandlers.set(name, handler);
}

async function defaultHandler(payload: unknown, jobName: string): Promise<unknown> {
  if (jobName.includes('force-fail')) {
    throw new Error('Forced failure for testing');
  }

  return { received: payload };
}

export type ResolveWorkerId = (workspaceId: string) => Promise<string>;

export async function processJob(bullJob: BullJob, resolveWorkerId?: ResolveWorkerId): Promise<unknown> {
  const jobId = bullJob.id;

  if (!jobId) {
    throw new Error('BullMQ job is missing an id');
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      queue: {
        select: {
          workspaceId: true,
          workspace: {
            select: { aiJobClassificationEnabled: true, aiErrorAnalysisEnabled: true },
          },
        },
      },
    },
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found in database`);
  }

  if (job.status === 'CANCELLED') {
    logger.info(`Skipping cancelled job: ${job.name} (${jobId})`);
    return null;
  }

  if (job.queue.workspace.aiJobClassificationEnabled) {
    classifyJob(job.name, job.payload, undefined, job.queue.workspaceId)
      .then(async (classification) => {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            aiClassification: classification as unknown as Prisma.InputJsonValue,
            // A confidence of 0 is the stored fallback (AI off, capped or
            // errored), not a classification that actually happened.
            aiClassifiedAt: classification.confidence > 0 ? new Date() : null,
          },
        });

        logger.info(
          `Job classified: ${job.name} (${jobId}) → ${classification.category} (confidence ${classification.confidence})`
        );
      })
      .catch((classifyError) => {
        logger.error(`Job classification failed for ${job.name} (${jobId}):`, classifyError);
      });
  } else {
    logger.info(
      `Skipping AI classification for ${job.name} (${jobId}) - aiJobClassificationEnabled is off for workspace ${job.queue.workspaceId}`
    );
  }

  const startedAt = new Date();
  const attempt = job.attempts + 1;

  let workerId = job.workerId;
  if (resolveWorkerId) {
    try {
      workerId = await resolveWorkerId(job.queue.workspaceId);
    } catch (workerError) {
      logger.error(`Could not resolve worker for job ${jobId}:`, workerError);
    }
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'ACTIVE',
      attempts: attempt,
      startedAt,
      workerId,
    },
  });

  const executionLog = await prisma.jobExecutionLog.create({
    data: {
      jobId,
      workerId,
      attempt,
      status: 'STARTED',
      startedAt,
    },
  });

  const registeredHandler = jobHandlers.get(job.name);

  try {
    const result = registeredHandler
      ? await registeredHandler(job.payload, bullJob)
      : await defaultHandler(job.payload, job.name);
    const finishedAt = new Date();

    const completedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: finishedAt,
        result: (result ?? null) as Prisma.InputJsonValue,
        error: null,
      },
    });

    await prisma.jobExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: 'SUCCEEDED',
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    });

    logger.info(`Job completed: ${job.name} (${jobId})`);

    await triggerWebhooks(job.queue.workspaceId, 'job.completed', completedJob);

    try {
      await advanceWorkflowForJob(jobId, 'COMPLETED');
    } catch (workflowError) {
      logger.error(`Workflow advancement failed for completed job ${jobId}:`, workflowError);
    }

    return result;
  } catch (error) {
    const finishedAt = new Date();
    // Redacted once, here, so the stored job/log rows, API responses, webhook
    // payloads and the text sent to the AI analyzer never carry the server's
    // filesystem paths.
    const message = redactPaths(error instanceof Error ? error.message : String(error));
    const stackTrace = error instanceof Error && error.stack ? redactPaths(error.stack) : undefined;
    const isFinalAttempt = attempt >= job.maxAttempts;

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: isFinalAttempt ? 'FAILED' : 'PENDING',
        error: message,
        failedAt: isFinalAttempt ? finishedAt : null,
      },
    });

    await prisma.jobExecutionLog.update({
      where: { id: executionLog.id },
      data: {
        status: 'FAILED',
        message,
        stackTrace,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    });

    logger.error(`Job failed: ${job.name} (${jobId}) - ${message}`);

    if (job.queue.workspace.aiErrorAnalysisEnabled) {
      try {
        const { analysis } = await analyzeAndStorePattern(
          job.name,
          message,
          stackTrace,
          attempt,
          job.queue.workspaceId,
          job.queueId
        );

        if (analysis.confidence > 0) {
          await prisma.job.update({ where: { id: jobId }, data: { aiAnalyzedAt: new Date() } });
        }

        const autoFix = await applyAutoFix(jobId, analysis);

        if (autoFix.applied) {
          logger.info(`Auto-fix applied for job ${jobId}: ${autoFix.reason}`);
        }
      } catch (analysisError) {
        logger.error(`AI error analysis/auto-fix pipeline failed for job ${jobId}:`, analysisError);
      }
    } else {
      logger.info(
        `Skipping AI error analysis for job ${jobId} - aiErrorAnalysisEnabled is off for workspace ${job.queue.workspaceId}`
      );
    }

    if (isFinalAttempt) {
      await triggerWebhooks(job.queue.workspaceId, 'job.failed', updatedJob);

      try {
        await advanceWorkflowForJob(jobId, 'FAILED');
      } catch (workflowError) {
        logger.error(`Workflow advancement failed for failed job ${jobId}:`, workflowError);
      }
    }

    throw error;
  }
}
