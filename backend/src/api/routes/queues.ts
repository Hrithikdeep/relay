import { Router } from 'express';
import { pauseQueue, resumeQueue } from '../../core/QueueManager';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { createQueueSchema } from '../../utils/validators';
import { ConflictError, NotFoundError } from '../../utils/errors';

export const queuesRouter = Router();

queuesRouter.use(authenticate);

queuesRouter.post('/', async (req, res, next) => {
  try {
    const input = createQueueSchema.parse(req.body);

    const existing = await prisma.queue.findUnique({
      where: { workspaceId_name: { workspaceId: req.workspace!.id, name: input.name } },
    });

    if (existing) {
      throw new ConflictError(`Queue "${input.name}" already exists`);
    }

    const queue = await prisma.queue.create({
      data: {
        workspaceId: req.workspace!.id,
        name: input.name,
        description: input.description,
        concurrency: input.concurrency,
      },
    });

    res.status(201).json(queue);
  } catch (error) {
    next(error);
  }
});

queuesRouter.get('/', async (req, res, next) => {
  try {
    const queues = await prisma.queue.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: queues });
  } catch (error) {
    next(error);
  }
});

queuesRouter.get('/:id/stats', async (req, res, next) => {
  try {
    const queue = await prisma.queue.findFirst({
      where: {
        workspaceId: req.workspace!.id,
        OR: [{ id: req.params.id }, { name: req.params.id }],
      },
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    const counts = await prisma.job.groupBy({
      by: ['status'],
      where: { queueId: queue.id },
      _count: { _all: true },
    });

    const stats = counts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    res.status(200).json({
      queueId: queue.id,
      name: queue.name,
      isPaused: queue.isPaused,
      stats,
    });
  } catch (error) {
    next(error);
  }
});

queuesRouter.post('/:name/pause', async (req, res, next) => {
  try {
    const queue = await prisma.queue.findFirst({
      where: {
        workspaceId: req.workspace!.id,
        OR: [{ id: req.params.name }, { name: req.params.name }],
      },
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    await pauseQueue(queue.name);

    const updated = await prisma.queue.update({
      where: { id: queue.id },
      data: { isPaused: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

queuesRouter.post('/:name/resume', async (req, res, next) => {
  try {
    const queue = await prisma.queue.findFirst({
      where: {
        workspaceId: req.workspace!.id,
        OR: [{ id: req.params.name }, { name: req.params.name }],
      },
    });

    if (!queue) {
      throw new NotFoundError('Queue not found');
    }

    await resumeQueue(queue.name);

    const updated = await prisma.queue.update({
      where: { id: queue.id },
      data: { isPaused: false },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});
