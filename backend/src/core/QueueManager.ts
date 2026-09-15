import { Queue } from 'bullmq';
import { redis } from '../integrations/redis/client';
import { logger } from '../utils/logger';

const queues = new Map<string, Queue>();

export function getOrCreateQueue(queueName: string): Queue {
  if (!queues.has(queueName)) {
    const queue = new Queue(queueName, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    queue.on('error', (err) => {
      logger.error(`Queue ${queueName} error:`, err);
    });

    queues.set(queueName, queue);
    logger.info(`Queue initialized: ${queueName}`);
  }

  return queues.get(queueName)!;
}

export async function addJobToQueue(
  queueName: string,
  jobId: string,
  data: any,
  opts: {
    priority?: number;
    attempts?: number;
    delay?: number;
  } = {}
) {
  const queue = getOrCreateQueue(queueName);

  await queue.add(jobId, data, {
    jobId,
    priority: opts.priority,
    attempts: opts.attempts || 3,
    delay: opts.delay || 0,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info(`Job added to queue: ${jobId} → ${queueName}`);
}

export async function pauseQueue(queueName: string) {
  const queue = getOrCreateQueue(queueName);
  await queue.pause();
  logger.info(`Queue paused: ${queueName}`);
}

export async function resumeQueue(queueName: string) {
  const queue = getOrCreateQueue(queueName);
  await queue.resume();
  logger.info(`Queue resumed: ${queueName}`);
}

export async function getQueueCounts(queueName: string) {
  const queue = getOrCreateQueue(queueName);
  return await queue.getJobCounts(
    'waiting', 'active', 'completed', 'failed', 'delayed'
  );
}

export async function closeAllQueues() {
  for (const [name, queue] of queues) {
    await queue.close();
    logger.info(`Queue closed: ${name}`);
  }
  queues.clear();
}