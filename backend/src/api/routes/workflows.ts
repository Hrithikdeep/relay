import { Router } from 'express';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { createWorkflowSchema } from '../../utils/validators';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { startWorkflowRun } from '../../core/WorkflowEngine';

export const workflowsRouter = Router();

workflowsRouter.use(authenticate);

workflowsRouter.post('/', async (req, res, next) => {
  try {
    const input = createWorkflowSchema.parse(req.body);
    const workspaceId = req.workspace!.id;

    const sortedSteps = [...input.steps].sort((a, b) => a.order - b.order);

    const queueIds = [...new Set(sortedSteps.map((s) => s.queueId))];
    const realQueues = await prisma.queue.findMany({
      where: { id: { in: queueIds }, workspaceId },
      select: { id: true },
    });
    const realQueueIds = new Set(realQueues.map((q) => q.id));
    const missing = queueIds.filter((id) => !realQueueIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestError(`Queue(s) not found in this workspace: ${missing.join(', ')}`);
    }

    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        name: input.name,
        description: input.description,
        steps: sortedSteps,
      },
    });

    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
});

workflowsRouter.get('/', async (req, res, next) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: workflows });
  } catch (error) {
    next(error);
  }
});

workflowsRouter.get('/runs/:id', async (req, res, next) => {
  try {
    const run = await prisma.workflowRun.findFirst({
      where: { id: req.params.id, workflow: { workspaceId: req.workspace!.id } },
      include: {
        workflow: { select: { id: true, name: true, steps: true } },
        steps: { orderBy: { stepIndex: 'asc' }, include: { job: true } },
      },
    });

    if (!run) {
      throw new NotFoundError('Workflow run not found');
    }

    res.status(200).json(run);
  } catch (error) {
    next(error);
  }
});

workflowsRouter.get('/:id', async (req, res, next) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    res.status(200).json(workflow);
  } catch (error) {
    next(error);
  }
});

workflowsRouter.delete('/:id', async (req, res, next) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    const runningCount = await prisma.workflowRun.count({
      where: { workflowId: workflow.id, status: 'RUNNING' },
    });
    if (runningCount > 0) {
      throw new BadRequestError('Cannot delete a workflow with runs currently in progress');
    }

    await prisma.workflow.delete({ where: { id: workflow.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

workflowsRouter.post('/:id/run', async (req, res, next) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    const steps = workflow.steps as unknown as Array<{ order: number; queueId: string; name: string; payload?: Record<string, unknown> }>;
    if (steps.length === 0) {
      throw new BadRequestError('Workflow has no steps');
    }

    const run = await startWorkflowRun(workflow.id, steps);

    res.status(201).json(run);
  } catch (error) {
    next(error);
  }
});

workflowsRouter.get('/:id/runs', async (req, res, next) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!workflow) {
      throw new NotFoundError('Workflow not found');
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    const [runs, total] = await Promise.all([
      prisma.workflowRun.findMany({
        where: { workflowId: workflow.id },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.workflowRun.count({ where: { workflowId: workflow.id } }),
    ]);

    res.status(200).json({
      data: runs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    next(error);
  }
});

export default workflowsRouter;
