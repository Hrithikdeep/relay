import { Router } from 'express';
import { prisma } from '../../database';
import { authenticateAny } from '../middleware/auth';
import { workspaceRateLimit } from '../middleware/rateLimit';
import { createWorkerSchema, workerHeartbeatSchema } from '../../utils/validators';
import { NotFoundError } from '../../utils/errors';
import { startOfTodayInTimeZone } from '../../utils/dayStart';

export const workersRouter = Router();

workersRouter.use(authenticateAny);
workersRouter.use(workspaceRateLimit);

workersRouter.post('/', async (req, res, next) => {
  try {
    const input = createWorkerSchema.parse(req.body);

    const worker = await prisma.worker.create({
      data: {
        workspaceId: req.workspace!.id,
        name: input.name,
        hostname: input.hostname,
        concurrency: input.concurrency,
        version: input.version,
        status: 'ONLINE',
        lastHeartbeatAt: new Date(),
      },
    });

    res.status(201).json(worker);
  } catch (error) {
    next(error);
  }
});

workersRouter.get('/', async (req, res, next) => {
  try {
    const workers = await prisma.worker.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: workers });
  } catch (error) {
    next(error);
  }
});

workersRouter.get('/:id', async (req, res, next) => {
  try {
    const worker = await prisma.worker.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!worker) {
      throw new NotFoundError('Worker not found');
    }

    const workspaceId = req.workspace!.id;
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { timezone: true },
    });
    const todayStart = startOfTodayInTimeZone(workspace.timezone);

    const [activeJobCount, completedToday] = await Promise.all([
      prisma.job.count({
        where: { workerId: worker.id, status: 'ACTIVE', queue: { workspaceId } },
      }),
      prisma.job.count({
        where: {
          workerId: worker.id,
          status: 'COMPLETED',
          completedAt: { gte: todayStart },
          queue: { workspaceId },
        },
      }),
    ]);

    res.status(200).json({ ...worker, activeJobCount, completedToday });
  } catch (error) {
    next(error);
  }
});

workersRouter.patch('/:id/heartbeat', async (req, res, next) => {
  try {
    const input = workerHeartbeatSchema.parse(req.body);

    const worker = await prisma.worker.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!worker) {
      throw new NotFoundError('Worker not found');
    }

    const updated = await prisma.worker.update({
      where: { id: worker.id },
      data: {
        status: input.status ?? 'ONLINE',
        lastHeartbeatAt: new Date(),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

workersRouter.delete('/:id', async (req, res, next) => {
  try {
    const worker = await prisma.worker.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!worker) {
      throw new NotFoundError('Worker not found');
    }

    await prisma.worker.delete({ where: { id: worker.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
