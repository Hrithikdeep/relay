import dotenv from 'dotenv';

// Must run before any other import that transitively reads config/env.ts, and
// must override so a stray shell-level env var (e.g. an old export left in a
// dotfile) can never silently shadow what's actually configured in .env.
dotenv.config({ override: true });

import cors from 'cors';
import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { startPredictionScheduler } from './ai';
import aiRouter from './api/routes/ai';
import { aiChatRouter } from './api/routes/aiChat';
import { apiKeysRouter } from './api/routes/apiKeys';
import { env } from './config/env';
import { errorHandler } from './api/middleware/errorHandler';
import { healthRouter } from './api/routes/health';
import { jobsRouter } from './api/routes/jobs';
import { logsRouter } from './api/routes/logs';
import { queuesRouter } from './api/routes/queues';
import { webhooksRouter } from './api/routes/webhooks';
import { workersRouter } from './api/routes/workers';
import { waitlistRouter } from './api/routes/waitlist';
import { workflowsRouter } from './api/routes/workflows';
import { workspaceRouter } from './api/routes/workspace';
import { prisma } from './database';
import { connectRedis } from './integrations/redis/client';
import { logger } from './utils/logger';
import { startAllWorkers, stopAllWorkers } from './workers/WorkerPool';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
  })
);

const apiRouter = Router();
apiRouter.use('/queues', queuesRouter);
apiRouter.use('/jobs', jobsRouter);
apiRouter.use('/webhooks', webhooksRouter);
apiRouter.use('/workers', workersRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/ai', aiChatRouter);
apiRouter.use('/workspace', workspaceRouter);
apiRouter.use('/api-keys', apiKeysRouter);
apiRouter.use('/logs', logsRouter);
apiRouter.use('/workflows', workflowsRouter);
apiRouter.use('/waitlist', waitlistRouter);

app.use(healthRouter);
app.use(`/${env.API_VERSION}`, apiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Route not found' });
});

app.use(errorHandler);

async function start(): Promise<void> {
  await connectRedis();
  await startAllWorkers();

  let predictionScheduler: NodeJS.Timeout | undefined;
  const workspace = await prisma.workspace.findFirst();

  if (workspace) {
    predictionScheduler = startPredictionScheduler(workspace.id);
  } else {
    logger.warn('No workspace found - skipping prediction scheduler startup');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Relay backend listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    if (predictionScheduler) {
      clearInterval(predictionScheduler);
    }
    server.close(async () => {
      await stopAllWorkers();
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});

export default app;
