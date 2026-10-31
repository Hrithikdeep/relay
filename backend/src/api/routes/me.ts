import { Router } from 'express';
import { prisma } from '../../database';
import { clerkAuth } from '../middleware/clerkAuth';
import { UnauthorizedError } from '../../utils/errors';

export const meRouter = Router();

meRouter.get('/', clerkAuth, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedError();
    }

    const workspace = user.workspaceId
      ? await prisma.workspace.findUnique({ where: { id: user.workspaceId }, select: { name: true } })
      : null;

    res.json({
      userId: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      workspaceName: workspace?.name ?? null,
    });
  } catch (error) {
    next(error);
  }
});
