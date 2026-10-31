import { JobStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { addJobToQueue } from '../../core/QueueManager';
import { prisma } from '../../database';
import { getErrorFingerprint } from '../../ai/analyzer/ErrorAnalyzer';
import { authenticateAny } from '../middleware/auth';
import { workspaceRateLimit } from '../middleware/rateLimit';
import { createJobSchema, listJobsQuerySchema } from '../../utils/validators';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export const jobsRouter = Router();

jobsRouter.use(authenticateAny);
jobsRouter.use(workspaceRateLimit);

jobsRouter.post('/', async (req, res, next) => {
  try {
    const input = createJobSchema.parse(req.body);

    const queue = await prisma.queue.findFirst({
      where: { id: input.queueId, workspaceId: req.workspace!.id },
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const job = await prisma.job.create({
      data: {
        queueId: queue.id,
        name: input.name,
        payload: input.payload,
        priority: input.priority,
        maxAttempts: input.maxAttempts,
        scheduledAt: input.scheduledAt,
        status: input.scheduledAt ? 'SCHEDULED' : 'PENDING',
      },
    });

    const delay = input.scheduledAt
      ? Math.max(0, input.scheduledAt.getTime() - Date.now())
      : undefined;

    await addJobToQueue(queue.name, job.id, job.payload, {
      priority: job.priority,
      attempts: job.maxAttempts,
      delay,
    });

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

jobsRouter.get('/', async (req, res, next) => {
  try {
    const query = listJobsQuerySchema.parse(req.query);

    const where: Prisma.JobWhereInput = {
      AND: [
        { queue: { workspaceId: req.workspace!.id } },
        ...(query.queueId ? [{ queueId: query.queueId }] : []),
        ...(query.status ? [{ status: query.status }] : []),
        ...(query.search
          ? [
              {
                OR: [
                  { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                  { id: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                  {
                    queue: {
                      name: { contains: query.search, mode: Prisma.QueryMode.insensitive },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    res.status(200).json({
      data: jobs,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

jobsRouter.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, queue: { workspaceId: req.workspace!.id } },
      include: { executionLogs: true, predictions: true },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    res.status(200).json(job);
  } catch (error) {
    next(error);
  }
});

// Real error-analysis data for one job: the AiErrorPattern its last error
// maps to (same fingerprint the analyzer stores under) plus how many other
// jobs in the workspace failed with the same error. recommendation,
// isTransient and fixParameters are not persisted anywhere, so they can't be
// returned - only what AiErrorPattern actually stores.
const SIMILAR_JOB_SCAN_LIMIT = 2000;

jobsRouter.get('/:id/analysis', async (req, res, next) => {
  try {
    const workspaceId = req.workspace!.id;
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, queue: { workspaceId } },
      select: { id: true, error: true },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (!job.error) {
      res.status(200).json({ analyzed: false, pattern: null, similarJobs: 0 });
      return;
    }

    const signature = getErrorFingerprint(job.error);

    const [pattern, candidates] = await Promise.all([
      prisma.aiErrorPattern.findUnique({
        where: { workspaceId_signature: { workspaceId, signature } },
      }),
      prisma.job.findMany({
        where: { queue: { workspaceId }, id: { not: job.id }, error: { not: null } },
        select: { error: true },
        orderBy: { updatedAt: 'desc' },
        take: SIMILAR_JOB_SCAN_LIMIT,
      }),
    ]);

    const similarJobs = candidates.filter((c) => c.error && getErrorFingerprint(c.error) === signature).length;

    // Confidence 0 with type "unknown" is the analyzer's fallback result
    // (AI off, capped or errored), not a real analysis.
    const analyzed = !!pattern && !(pattern.confidence === 0 && pattern.errorType === 'unknown');

    res.status(200).json({
      analyzed,
      pattern:
        analyzed && pattern
          ? {
              errorType: pattern.errorType,
              rootCause: pattern.pattern,
              confidence: pattern.confidence,
              suggestedFix: pattern.suggestedFix,
              occurrenceCount: pattern.occurrenceCount,
              lastSeenAt: pattern.lastSeenAt,
              isResolved: pattern.isResolved,
            }
          : null,
      similarJobs,
    });
  } catch (error) {
    next(error);
  }
});

jobsRouter.delete('/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, queue: { workspaceId: req.workspace!.id } },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    const cancelled = await prisma.job.update({
      where: { id: job.id },
      data: { status: 'CANCELLED' },
    });

    res.status(200).json(cancelled);
  } catch (error) {
    next(error);
  }
});

const DELETABLE_STATUSES: JobStatus[] = ['COMPLETED', 'FAILED', 'CANCELLED'];

// Genuinely removes the row (and, via schema cascade, its executionLogs and
// predictions) - unlike DELETE /:id above, which only soft-cancels.
jobsRouter.delete('/:id/permanent', async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, queue: { workspaceId: req.workspace!.id } },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (!DELETABLE_STATUSES.includes(job.status)) {
      throw new BadRequestError('Cannot delete a job that is still pending or running');
    }

    await prisma.job.delete({ where: { id: job.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

jobsRouter.post('/:id/replay', async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, queue: { workspaceId: req.workspace!.id } },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status !== 'FAILED') {
      throw new BadRequestError('Only failed jobs can be replayed');
    }

    const replayed = await prisma.job.create({
      data: {
        queueId: job.queueId,
        name: job.name,
        payload: job.payload as Prisma.InputJsonValue,
        priority: job.priority,
        maxAttempts: job.maxAttempts,
        status: 'PENDING',
      },
    });

    res.status(201).json(replayed);
  } catch (error) {
    next(error);
  }
});
