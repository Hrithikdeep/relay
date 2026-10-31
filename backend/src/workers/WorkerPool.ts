import os from 'os';
import { Worker } from 'bullmq';
import { processJob } from '../core/JobProcessor';
import { prisma } from '../database';
import { redis } from '../integrations/redis/client';
import { logger } from '../utils/logger';

const DEFAULT_CONCURRENCY = 5;
const HEARTBEAT_INTERVAL_MS = 30_000;

const workers = new Map<string, Worker>();
const startingWorkers = new Map<string, Promise<Worker>>();
const heartbeatIntervals = new Map<string, NodeJS.Timeout>();

async function ensureWorkerRecord(
  queueName: string,
  workspaceId: string,
  concurrency: number
): Promise<string> {
  const name = `worker-pool-${queueName}`;

  const existing = await prisma.worker.findFirst({
    where: { workspaceId, name },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.worker.create({
    data: {
      workspaceId,
      name,
      hostname: os.hostname(),
      status: 'ONLINE',
      concurrency,
      lastHeartbeatAt: new Date(),
    },
  });

  return created.id;
}

// A queue name can exist in several workspaces but shares one BullMQ queue,
// so each job is attributed to the pool worker record belonging to the job's
// own workspace (created on first use), never to another tenant's worker.
async function resolveWorkerId(queueName: string, workspaceId: string, concurrency: number): Promise<string> {
  const workerId = await ensureWorkerRecord(queueName, workspaceId, concurrency);

  if (!heartbeatIntervals.has(`${queueName}:${workerId}`)) {
    startHeartbeat(queueName, workerId);
  }

  return workerId;
}

function startHeartbeat(queueName: string, workerId: string): void {
  const interval = setInterval(async () => {
    try {
      await prisma.worker.update({
        where: { id: workerId },
        data: {
          status: 'ONLINE',
          lastHeartbeatAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`[${queueName}] Heartbeat update failed for worker ${workerId}:`, error);
    }
  }, HEARTBEAT_INTERVAL_MS);

  heartbeatIntervals.set(`${queueName}:${workerId}`, interval);
}

function createWorker(queueName: string, concurrency: number, workerId: string): Worker {
  const worker = new Worker(
    queueName,
    (bullJob) =>
      processJob(bullJob, (workspaceId) => resolveWorkerId(queueName, workspaceId, concurrency)),
    {
      connection: redis,
      concurrency,
    }
  );

  worker.on('completed', (bullJob) => {
    logger.info(`[${queueName}] Job completed: ${bullJob.id}`);
  });

  worker.on('failed', (bullJob, error) => {
    logger.error(`[${queueName}] Job failed: ${bullJob?.id} - ${error.message}`);
  });

  worker.on('error', (error) => {
    logger.error(`[${queueName}] Worker error:`, error);
  });

  startHeartbeat(queueName, workerId);

  return worker;
}

export async function startWorker(
  queueName: string,
  workspaceId: string,
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<Worker> {
  const existing = workers.get(queueName);
  if (existing) {
    return existing;
  }

  // Concurrent callers (e.g. two requests creating the same queue name) share
  // one in-flight start instead of each creating a BullMQ worker.
  const inFlight = startingWorkers.get(queueName);
  if (inFlight) {
    return inFlight;
  }

  const starting = (async () => {
    const workerId = await ensureWorkerRecord(queueName, workspaceId, concurrency);
    const worker = createWorker(queueName, concurrency, workerId);
    workers.set(queueName, worker);
    logger.info(`Worker started for queue: ${queueName} (concurrency: ${concurrency})`);
    return worker;
  })().finally(() => startingWorkers.delete(queueName));

  startingWorkers.set(queueName, starting);
  return starting;
}

export async function startAllWorkers(): Promise<void> {
  const queues = await prisma.queue.findMany({
    select: { name: true, concurrency: true, workspaceId: true },
  });

  const queueInfoByName = new Map<string, { concurrency: number; workspaceId: string }>();
  for (const queue of queues) {
    const current = queueInfoByName.get(queue.name);
    const concurrency = queue.concurrency || DEFAULT_CONCURRENCY;
    if (!current || concurrency > current.concurrency) {
      queueInfoByName.set(queue.name, { concurrency, workspaceId: queue.workspaceId });
    }
  }

  for (const [name, { concurrency, workspaceId }] of queueInfoByName) {
    await startWorker(name, workspaceId, concurrency);
  }

  logger.info(`Worker pool started for ${queueInfoByName.size} queue(s)`);
}

export async function stopWorker(queueName: string): Promise<void> {
  const worker = workers.get(queueName);

  if (worker) {
    for (const [key, interval] of heartbeatIntervals) {
      if (key.startsWith(`${queueName}:`)) {
        clearInterval(interval);
        heartbeatIntervals.delete(key);
      }
    }

    await worker.close();
    workers.delete(queueName);
    logger.info(`Worker stopped for queue: ${queueName}`);
  }
}

export async function stopAllWorkers(): Promise<void> {
  for (const interval of heartbeatIntervals.values()) {
    clearInterval(interval);
  }
  heartbeatIntervals.clear();

  await Promise.all(Array.from(workers.values()).map((worker) => worker.close()));
  workers.clear();
  logger.info('All workers stopped');
}
