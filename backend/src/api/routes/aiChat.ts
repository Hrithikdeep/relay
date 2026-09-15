import { Router } from 'express';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { chatConfirmSchema, chatMessageSchema } from '../../utils/validators';
import { NotFoundError } from '../../utils/errors';
import { confirmChatTool, startChatTurn } from '../../ai/chat/agent';
import { logger } from '../../utils/logger';

export const aiChatRouter = Router();

aiChatRouter.use(authenticate);

function startSse(res: import('express').Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
}

aiChatRouter.post('/chat', async (req, res, next) => {
  try {
    const input = chatMessageSchema.parse(req.body);
    startSse(res);

    await startChatTurn(res, req.workspace!.id, input.conversationId, input.message);
    res.end();
  } catch (error) {
    if (res.headersSent) {
      logger.error('Chat turn failed mid-stream:', error);
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Internal error during chat turn.' })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

aiChatRouter.post('/chat/confirm', async (req, res, next) => {
  try {
    const input = chatConfirmSchema.parse(req.body);
    startSse(res);

    await confirmChatTool(res, req.workspace!.id, input.conversationId, input.toolCallId, input.approved);
    res.end();
  } catch (error) {
    if (res.headersSent) {
      logger.error('Chat confirmation failed mid-stream:', error);
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Internal error during confirmation.' })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

aiChatRouter.get('/conversations', async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { workspaceId: req.workspace!.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });

    res.status(200).json({ data: conversations });
  } catch (error) {
    next(error);
  }
});

aiChatRouter.get('/conversations/:id', async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspace!.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
});

export default aiChatRouter;
