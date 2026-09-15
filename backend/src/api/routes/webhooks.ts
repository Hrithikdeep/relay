import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { createWebhookSchema } from '../../utils/validators';
import { NotFoundError } from '../../utils/errors';

export const webhooksRouter = Router();

webhooksRouter.use(authenticate);

webhooksRouter.post('/', async (req, res, next) => {
  try {
    const input = createWebhookSchema.parse(req.body);

    const webhook = await prisma.webhook.create({
      data: {
        workspaceId: req.workspace!.id,
        url: input.url,
        events: input.events,
        secret: input.secret ?? crypto.randomBytes(24).toString('hex'),
      },
    });

    res.status(201).json(webhook);
  } catch (error) {
    next(error);
  }
});

webhooksRouter.get('/', async (req, res, next) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: webhooks });
  } catch (error) {
    next(error);
  }
});

webhooksRouter.delete('/:id', async (req, res, next) => {
  try {
    const webhook = await prisma.webhook.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    await prisma.webhook.delete({ where: { id: webhook.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
