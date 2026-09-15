import { Prisma } from '@prisma/client';
import { prisma } from '../database';
import { addJobToQueue } from './QueueManager';
import { logger } from '../utils/logger';
import type { WorkflowStepInput } from '../utils/validators';

/** Creates the real Job for one workflow step (same path as POST /v1/jobs)
 * plus the WorkflowStepRun that links it back to the run. */
async function createStepJob(workflowRunId: string, stepIndex: number, step: WorkflowStepInput) {
  const job = await prisma.job.create({
    data: {
      queueId: step.queueId,
      name: step.name,
      payload: (step.payload ?? {}) as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  });

  const queue = await prisma.queue.findUniqueOrThrow({ where: { id: step.queueId }, select: { name: true } });
  await addJobToQueue(queue.name, job.id, job.payload, { priority: 0, attempts: job.maxAttempts });

  const stepRun = await prisma.workflowStepRun.create({
    data: { workflowRunId, stepIndex, jobId: job.id, status: 'PENDING' },
  });

  logger.info(`Workflow run ${workflowRunId}: step ${stepIndex} started as job ${job.id} (${step.name} -> queue ${queue.name})`);

  return { job, stepRun };
}

/** Starts a run at step 0. Called from POST /v1/workflows/:id/run. */
export async function startWorkflowRun(workflowId: string, steps: WorkflowStepInput[]) {
  const run = await prisma.workflowRun.create({
    data: { workflowId, status: 'RUNNING', currentStepIndex: 0 },
  });

  await createStepJob(run.id, 0, steps[0]);

  return prisma.workflowRun.findUniqueOrThrow({ where: { id: run.id }, include: { steps: true } });
}

/**
 * Real, event-driven advancement - called directly from JobProcessor.ts the
 * moment a job transitions to a terminal status (COMPLETED or FAILED), not
 * on a poll. No-ops for jobs that aren't part of any workflow.
 */
export async function advanceWorkflowForJob(jobId: string, jobStatus: 'COMPLETED' | 'FAILED'): Promise<void> {
  const stepRun = await prisma.workflowStepRun.findUnique({ where: { jobId } });
  if (!stepRun) return;

  await prisma.workflowStepRun.update({
    where: { id: stepRun.id },
    data: { status: jobStatus, finishedAt: new Date() },
  });

  if (jobStatus === 'FAILED') {
    await prisma.workflowRun.update({
      where: { id: stepRun.workflowRunId },
      data: { status: 'FAILED', completedAt: new Date() },
    });
    logger.info(`Workflow run ${stepRun.workflowRunId}: step ${stepRun.stepIndex} failed - run stopped, no further steps.`);
    return;
  }

  const run = await prisma.workflowRun.findUniqueOrThrow({
    where: { id: stepRun.workflowRunId },
    include: { workflow: { select: { steps: true } } },
  });
  const steps = run.workflow.steps as unknown as WorkflowStepInput[];
  const nextIndex = stepRun.stepIndex + 1;

  if (nextIndex < steps.length) {
    await createStepJob(run.id, nextIndex, steps[nextIndex]);
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { currentStepIndex: nextIndex, status: 'RUNNING' },
    });
    logger.info(`Workflow run ${run.id}: advanced to step ${nextIndex} automatically after job ${jobId} completed.`);
  } else {
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    logger.info(`Workflow run ${run.id}: completed - final step (${stepRun.stepIndex}) finished successfully.`);
  }
}
