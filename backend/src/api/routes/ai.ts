import { Router } from 'express';
import { runPredictions } from '../../ai';
import { addJobToQueue } from '../../core/QueueManager';
import { prisma } from '../../database';
import { logger } from '../../utils/logger';
import { naturalLanguageJobSchema } from '../../utils/validators';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

const KEYWORD_TO_QUEUE: Array<{ keyword: string; queueName: string }> = [
  { keyword: 'email', queueName: 'emails' },
  { keyword: 'payment', queueName: 'payments' },
  { keyword: 'image', queueName: 'image-processing' },
  { keyword: 'analytics', queueName: 'analytics' },
];

function inferQueueName(description: string): string | null {
  const lower = description.toLowerCase();
  const match = KEYWORD_TO_QUEUE.find(({ keyword }) => lower.includes(keyword));
  return match ? match.queueName : null;
}

router.get('/error-patterns', async (req, res, next) => {
  try {
    const patterns = await prisma.aiErrorPattern.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { lastSeenAt: 'desc' },
    });

    res.status(200).json({ data: patterns });
  } catch (error) {
    next(error);
  }
});

router.get('/predictions', async (req, res, next) => {
  try {
    if (!req.workspace!.aiPredictiveMonitoringEnabled) {
      res.status(200).json({ data: [] });
      return;
    }

    const predictions = await runPredictions(req.workspace!.id);

    res.status(200).json({ data: predictions });
  } catch (error) {
    next(error);
  }
});

router.get('/insights', async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;

    const [totalJobs, failedJobs, completedJobs, errorPatternsLearned, durationAgg] = await Promise.all([
      prisma.job.count({ where: { queue: { workspaceId } } }),
      prisma.job.count({ where: { queue: { workspaceId }, status: 'FAILED' } }),
      prisma.job.count({ where: { queue: { workspaceId }, status: 'COMPLETED' } }),
      prisma.aiErrorPattern.count({ where: { workspaceId } }),
      prisma.jobExecutionLog.aggregate({
        where: { status: 'SUCCEEDED', job: { queue: { workspaceId } } },
        _avg: { durationMs: true },
      }),
    ]);

    const terminalJobs = completedJobs + failedJobs;
    const successRate = terminalJobs > 0 ? completedJobs / terminalJobs : 1;
    const avgDurationMs = Math.round(durationAgg._avg.durationMs ?? 0);
    const healthScore = Math.round(successRate * 100);

    res.status(200).json({
      healthScore,
      stats: {
        totalJobs,
        failedJobs,
        successRate: Number(successRate.toFixed(4)),
        avgDurationMs,
        errorPatternsLearned,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/jobs/natural-language', async (req, res, next) => {
  try {
    const { description } = naturalLanguageJobSchema.parse(req.body);

    const queueName = inferQueueName(description);

    if (!queueName) {
      throw new BadRequestError(
        `Could not infer a queue from the description. Supported keywords: ${KEYWORD_TO_QUEUE.map((k) => k.keyword).join(', ')}`
      );
    }

    const queue = await prisma.queue.findFirst({
      where: { workspaceId: req.workspace!.id, name: queueName },
    });

    if (!queue) {
      throw new NotFoundError(`Queue "${queueName}" does not exist in this workspace`);
    }

    const job = await prisma.job.create({
      data: {
        queueId: queue.id,
        name: description.trim().slice(0, 100),
        payload: { description },
        status: 'PENDING',
      },
    });

    await addJobToQueue(queue.name, job.id, job.payload, {
      priority: job.priority,
      attempts: job.maxAttempts,
    });

    logger.info(`Natural-language job created: "${description}" → queue "${queue.name}"`);

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

export default router;
