import { Router } from 'express';
import { prisma } from '../../database';
import { authenticateAny } from '../middleware/auth';
import { workspaceRateLimit } from '../middleware/rateLimit';
import { updateWorkspaceSchema } from '../../utils/validators';
import { computeAiUsage } from '../../ai/usage';

export const workspaceRouter = Router();

workspaceRouter.use(authenticateAny);
workspaceRouter.use(workspaceRateLimit);

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
  aiCallsUsed: true,
  aiCallsPeriodStart: true,
  createdAt: true,
} as const;

// The raw counter columns are internal; clients get the computed monthly view.
function toResponse<T extends { aiCallsUsed: number; aiCallsPeriodStart: Date }>(workspace: T) {
  const { aiCallsUsed, aiCallsPeriodStart, ...rest } = workspace;
  return { ...rest, aiUsage: computeAiUsage(aiCallsUsed, aiCallsPeriodStart) };
}

workspaceRouter.get('/', async (req, res, next) => {
  try {
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: req.workspace!.id },
      select: WORKSPACE_SELECT,
    });

    res.status(200).json(toResponse(workspace));
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

    res.status(200).json(toResponse(workspace));
  } catch (error) {
    next(error);
  }
});

export default workspaceRouter;
