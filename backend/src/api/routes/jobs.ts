import { JobStatus, Prisma } from '@prisma/client';
import { Router } from 'express';
import { addJobToQueue } from '../../core/QueueManager';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { createJobSchema, listJobsQuerySchema } from '../../utils/validators';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export const jobsRouter = Router();

jobsRouter.use(authenticate);

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
