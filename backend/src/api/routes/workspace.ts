import { Router } from 'express';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { updateWorkspaceSchema } from '../../utils/validators';

export const workspaceRouter = Router();

workspaceRouter.use(authenticate);

// Never select/return apiKey - this endpoint is reachable with the same key
// it would be exposing.
const WORKSPACE_SELECT = {
  id: true,
  name: true,
  timezone: true,
  defaultMaxAttempts: true,
  defaultBackoffMs: true,
  defaultTimeoutSeconds: true,
  aiJobClassificationEnabled: true,
  aiErrorAnalysisEnabled: true,
  aiPredictiveMonitoringEnabled: true,
  createdAt: true,
} as const;

workspaceRouter.get('/', async (req, res, next) => {
  try {
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: req.workspace!.id },
      select: WORKSPACE_SELECT,
    });

    res.status(200).json(workspace);
  } catch (error) {
    next(error);
  }
});

workspaceRouter.patch('/', async (req, res, next) => {
  try {
    const input = updateWorkspaceSchema.parse(req.body);

    const workspace = await prisma.workspace.update({
      where: { id: req.workspace!.id },
      data: input,
      select: WORKSPACE_SELECT,
    });

    res.status(200).json(workspace);
  } catch (error) {
    next(error);
  }
});

export default workspaceRouter;
