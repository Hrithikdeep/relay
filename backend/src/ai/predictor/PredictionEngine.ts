import { prisma } from '../../database';
import { logger } from '../../utils/logger';

export type PredictionType = 'error_surge' | 'capacity_overload';

export interface Prediction {
  type: PredictionType;
  description: string;
  confidence: number;
  predictedOccurrenceAt: Date;
  recommendedAction: string;
}

const ERROR_SURGE_THRESHOLD = 0.2;
const CAPACITY_OVERLOAD_THRESHOLD = 100;
const PREDICTION_INTERVAL_MS = 5 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function failureRate(logs: { status: string }[]): number {
  if (logs.length === 0) {
    return 0;
  }
  const failed = logs.filter((log) => log.status === 'FAILED').length;
  return failed / logs.length;
}

/**
 * Compares the failure rate of the last hour against the hour before it.
 * If it jumped by more than ERROR_SURGE_THRESHOLD (percentage points), predicts a surge.
 */
async function predictErrorSurge(workspaceId: string): Promise<Prediction | null> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const [recentLogs, priorLogs] = await Promise.all([
    prisma.jobExecutionLog.findMany({
      where: {
        status: { in: ['SUCCEEDED', 'FAILED'] },
        job: { queue: { workspaceId } },
        createdAt: { gte: oneHourAgo },
      },
      select: { status: true },
    }),
    prisma.jobExecutionLog.findMany({
      where: {
        status: { in: ['SUCCEEDED', 'FAILED'] },
        job: { queue: { workspaceId } },
        createdAt: { gte: twoHoursAgo, lt: oneHourAgo },
      },
      select: { status: true },
    }),
  ]);

  if (recentLogs.length === 0 || priorLogs.length === 0) {
    return null;
  }

  const recentRate = failureRate(recentLogs);
  const priorRate = failureRate(priorLogs);
  const increase = recentRate - priorRate;

  if (increase <= ERROR_SURGE_THRESHOLD) {
    return null;
  }

  return {
    type: 'error_surge',
    description: `Failure rate jumped from ${(priorRate * 100).toFixed(1)}% to ${(recentRate * 100).toFixed(1)}% over the last hour`,
    confidence: clamp(increase, 0, 1),
    predictedOccurrenceAt: new Date(now.getTime() + 30 * 60 * 1000),
    recommendedAction: 'Investigate recent job failures and consider pausing affected queues.',
  };
}

/**
 * If more than CAPACITY_OVERLOAD_THRESHOLD jobs are pending, predicts a capacity overload.
 */
async function predictCapacityOverload(workspaceId: string): Promise<Prediction | null> {
  const pendingCount = await prisma.job.count({
    where: {
      status: 'PENDING',
      queue: { workspaceId },
    },
  });

  if (pendingCount <= CAPACITY_OVERLOAD_THRESHOLD) {
    return null;
  }

  return {
    type: 'capacity_overload',
    description: `${pendingCount} jobs are pending, exceeding the ${CAPACITY_OVERLOAD_THRESHOLD}-job capacity threshold`,
    confidence: clamp(pendingCount / (CAPACITY_OVERLOAD_THRESHOLD * 2), 0, 1),
    predictedOccurrenceAt: new Date(),
    recommendedAction: 'Scale up worker concurrency or add additional workers to drain the backlog.',
  };
}

export async function runPredictions(workspaceId: string): Promise<Prediction[]> {
  const [errorSurge, capacityOverload] = await Promise.all([
    predictErrorSurge(workspaceId),
    predictCapacityOverload(workspaceId),
  ]);

  const predictions = [errorSurge, capacityOverload].filter(
    (prediction): prediction is Prediction => prediction !== null
  );

  if (predictions.length > 0) {
    logger.info(
      `Predictions generated for workspace ${workspaceId}: ${predictions.map((p) => p.type).join(', ')}`
    );
  }

  return predictions;
}

export function startPredictionScheduler(workspaceId: string): NodeJS.Timeout {
  runPredictions(workspaceId).catch((error) => {
    logger.error(`Prediction run failed for workspace ${workspaceId}:`, error);
  });

  return setInterval(() => {
    runPredictions(workspaceId).catch((error) => {
      logger.error(`Prediction run failed for workspace ${workspaceId}:`, error);
    });
  }, PREDICTION_INTERVAL_MS);
}
