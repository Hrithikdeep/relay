import { Router } from 'express';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { createWorkerSchema, workerHeartbeatSchema } from '../../utils/validators';
import { NotFoundError } from '../../utils/errors';

export const workersRouter = Router();

workersRouter.use(authenticate);

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

    const activeJobCount = await prisma.job.count({
      where: { workerId: worker.id, status: 'ACTIVE' },
    });

    res.status(200).json({ ...worker, activeJobCount });
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
