import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { JobStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { addJobToQueue, pauseQueue as pauseQueueQueue, resumeQueue as resumeQueueQueue } from '../../core/QueueManager';
import { runPredictions } from '../predictor/PredictionEngine';

const CANCELLABLE_STATUSES: JobStatus[] = ['PENDING', 'SCHEDULED', 'ACTIVE'];

async function resolveQueue(workspaceId: string, idOrName: string) {
  return prisma.queue.findFirst({
    where: { workspaceId, OR: [{ id: idOrName }, { name: idOrName }] },
  });
}

/**
 * Prisma returns real Date objects (createdAt, startedAt, etc.) - the AI
 * SDK's internal message validation requires tool outputs to be plain
 * JSONValue, so a raw Date fails with "messages do not match the
 * ModelMessage[] schema". Round-tripping through JSON turns every Date into
 * its ISO string, which is exactly what every other endpoint in this API
 * already returns over HTTP anyway.
 */
function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/**
 * All tools below call the exact same Prisma queries / core service
 * functions (QueueManager.pauseQueue, addJobToQueue, PredictionEngine) that
 * the corresponding REST routes use - no new business logic, just the same
 * real operations exposed to the chat agent. Scoped to one workspace via
 * closure so the model can never touch another workspace's data.
 */
export function buildChatTools(workspaceId: string): ToolSet {
  const rawTools = {
    getCurrentDateTime: tool({
      description: "Get the real current server date and time. Always call this instead of guessing or relying on training knowledge when the user asks about today's date, the current time, or anything relative to \"now\".",
      inputSchema: z.object({}),
      execute: async () => {
        const now = new Date();
        return { iso: now.toISOString(), human: now.toUTCString() };
      },
    }),

    getJobs: tool({
      description: 'List jobs in this workspace, optionally filtered by queue, status, or a search substring matching job name/id/queue name.',
      inputSchema: z.object({
        queueId: z.string().optional(),
        status: z.nativeEnum(JobStatus).optional(),
        search: z.string().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(50).default(10),
      }),
      execute: async ({ queueId, status, search, page, pageSize }) => {
        const where: Prisma.JobWhereInput = {
          AND: [
            { queue: { workspaceId } },
            ...(queueId ? [{ queueId }] : []),
            ...(status ? [{ status }] : []),
            ...(search
              ? [
                  {
                    OR: [
                      { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                      { id: { contains: search, mode: Prisma.QueryMode.insensitive } },
                      { queue: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
                    ],
                  },
                ]
              : []),
          ],
        };

        const [jobs, total] = await Promise.all([
          prisma.job.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.job.count({ where }),
        ]);

        return { data: jobs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
      },
    }),

    getJob: tool({
      description: 'Fetch one job by id, including its execution logs (with error messages/stack traces) and AI predictions.',
      inputSchema: z.object({ jobId: z.string() }),
      execute: async ({ jobId }) => {
        const job = await prisma.job.findFirst({
          where: { id: jobId, queue: { workspaceId } },
          include: { executionLogs: true, predictions: true },
        });
        if (!job) return { error: `Job ${jobId} not found in this workspace.` };
        return job;
      },
    }),

    getQueues: tool({
      description: 'List all queues in this workspace.',
      inputSchema: z.object({}),
      execute: async () => {
        const queues = await prisma.queue.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
        return { data: queues };
      },
    }),

    getQueueStats: tool({
      description: 'Get real-time job status counts and pause state for one queue, by id or name.',
      inputSchema: z.object({ queueIdOrName: z.string() }),
      execute: async ({ queueIdOrName }) => {
        const queue = await resolveQueue(workspaceId, queueIdOrName);
        if (!queue) return { error: `Queue "${queueIdOrName}" not found in this workspace.` };

        const counts = await prisma.job.groupBy({
          by: ['status'],
          where: { queueId: queue.id },
          _count: { _all: true },
        });
        const stats = counts.reduce<Record<string, number>>((acc, row) => {
          acc[row.status] = row._count._all;
          return acc;
        }, {});

        return { queueId: queue.id, name: queue.name, isPaused: queue.isPaused, stats };
      },
    }),

    getWorkers: tool({
      description: 'List all workers registered in this workspace, with their status, concurrency, and last heartbeat.',
      inputSchema: z.object({}),
      execute: async () => {
        const workers = await prisma.worker.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
        return { data: workers };
      },
    }),

    getAiInsights: tool({
      description: 'Get workspace-wide health score and stats (total jobs, failed jobs, success rate, avg duration, error patterns learned).',
      inputSchema: z.object({}),
      execute: async () => {
        const [totalJobs, failedJobs, completedJobs, errorPatternsLearned, durationAgg] = await Promise.all([
          prisma.job.count({ where: { queue: { workspaceId } } }),
          prisma.job.count({ where: { queue: { workspaceId }, status: 'FAILED' } }),
          prisma.job.count({ where: { queue: { workspaceId }, status: 'COMPLETED' } }),
          prisma.aiErrorPattern.count({ where: { workspaceId } }),
          prisma.jobExecutionLog.aggregate({
            where: { status: 'SUCCEEDED', job: { queue: { workspaceId } } },
            _avg: { durationMs: true },
          }),
        ]);
        const terminalJobs = completedJobs + failedJobs;
        const successRate = terminalJobs > 0 ? completedJobs / terminalJobs : 1;
        return {
          healthScore: Math.round(successRate * 100),
          stats: {
            totalJobs,
            failedJobs,
            successRate: Number(successRate.toFixed(4)),
            avgDurationMs: Math.round(durationAgg._avg.durationMs ?? 0),
            errorPatternsLearned,
          },
        };
      },
    }),

    getAiPredictions: tool({
      description: 'Get current AI predictions (error surges, capacity overload) computed from recent job history.',
      inputSchema: z.object({}),
      execute: async () => {
        const workspace = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { aiPredictiveMonitoringEnabled: true },
        });
        if (!workspace?.aiPredictiveMonitoringEnabled) {
          return { data: [], note: 'Predictive monitoring is disabled for this workspace.' };
        }
        const predictions = await runPredictions(workspaceId);
        return { data: predictions };
      },
    }),

    getErrorPatterns: tool({
      description: 'List AI-detected recurring error patterns across all jobs in this workspace.',
      inputSchema: z.object({}),
      execute: async () => {
        const patterns = await prisma.aiErrorPattern.findMany({
          where: { workspaceId },
          orderBy: { lastSeenAt: 'desc' },
        });
        return { data: patterns };
      },
    }),

    createJob: tool({
      description: 'Create and enqueue a new job on an existing queue. Reversible/low-risk - executes immediately without confirmation.',
      inputSchema: z.object({
        queueId: z.string().describe('The id of an existing queue - use getQueues first if unsure.'),
        name: z.string(),
        payload: z.record(z.any()).default({}),
        priority: z.number().int().default(0),
        maxAttempts: z.number().int().positive().default(3),
      }),
      execute: async ({ queueId, name, payload, priority, maxAttempts }) => {
        const queue = await prisma.queue.findFirst({ where: { id: queueId, workspaceId } });
        if (!queue) return { error: `Queue ${queueId} not found in this workspace.` };

        const job = await prisma.job.create({
          data: { queueId: queue.id, name, payload, priority, maxAttempts, status: 'PENDING' },
        });
        await addJobToQueue(queue.name, job.id, job.payload, { priority: job.priority, attempts: job.maxAttempts });
        return job;
      },
    }),

    replayJob: tool({
      description: 'Create a brand-new job cloned from a FAILED job (same queue/name/payload). Reversible/low-risk - executes immediately.',
      inputSchema: z.object({ jobId: z.string() }),
      execute: async ({ jobId }) => {
        const job = await prisma.job.findFirst({ where: { id: jobId, queue: { workspaceId } } });
        if (!job) return { error: `Job ${jobId} not found in this workspace.` };
        if (job.status !== 'FAILED') return { error: `Job ${jobId} is not FAILED (status: ${job.status}); only failed jobs can be replayed.` };

        const replayed = await prisma.job.create({
          data: {
            queueId: job.queueId,
            name: job.name,
            payload: job.payload as Prisma.InputJsonValue,
            priority: job.priority,
            maxAttempts: job.maxAttempts,
            status: 'PENDING',
          },
        });
        return replayed;
      },
    }),

    resumeQueue: tool({
      description: 'Resume a paused queue so it processes jobs again. Reversible/low-risk - executes immediately.',
      inputSchema: z.object({ queueIdOrName: z.string() }),
      execute: async ({ queueIdOrName }) => {
        const queue = await resolveQueue(workspaceId, queueIdOrName);
        if (!queue) return { error: `Queue "${queueIdOrName}" not found in this workspace.` };
        await resumeQueueQueue(queue.name);
        return prisma.queue.update({ where: { id: queue.id }, data: { isPaused: false } });
      },
    }),

    cancelJob: tool({
      description: 'DESTRUCTIVE: cancel a pending/scheduled/active job (soft-cancel - sets status to CANCELLED). Requires human approval.',
      inputSchema: z.object({ jobId: z.string() }),
      execute: async ({ jobId }) => {
        const job = await prisma.job.findFirst({ where: { id: jobId, queue: { workspaceId } } });
        if (!job) return { error: `Job ${jobId} not found in this workspace.` };
        if (!CANCELLABLE_STATUSES.includes(job.status)) {
          return { error: `Job ${jobId} cannot be cancelled (status: ${job.status}).` };
        }
        return prisma.job.update({ where: { id: job.id }, data: { status: 'CANCELLED' } });
      },
    }),

    pauseQueue: tool({
      description: 'DESTRUCTIVE: pause a queue, stopping it from processing any new jobs. Requires human approval.',
      inputSchema: z.object({ queueIdOrName: z.string() }),
      execute: async ({ queueIdOrName }) => {
        const queue = await resolveQueue(workspaceId, queueIdOrName);
        if (!queue) return { error: `Queue "${queueIdOrName}" not found in this workspace.` };
        await pauseQueueQueue(queue.name);
        return prisma.queue.update({ where: { id: queue.id }, data: { isPaused: true } });
      },
    }),
  };

  // A plain imperative loop with explicit `any` here (rather than
  // Object.entries/fromEntries/map chained generically over rawTools) is
  // deliberate: inferring that chain's type through 11 zod-schema-derived
  // Tool<> generics made tsc's type-checker run for 10+ minutes and OOM.
  // Runtime behavior is identical; only the type-checking cost differs.
  const wrapped: Record<string, unknown> = {};
  for (const name of Object.keys(rawTools)) {
    const def: any = (rawTools as any)[name];
    wrapped[name] = {
      ...def,
      execute: def.execute
        ? async (input: any, options: any) => jsonSafe(await def.execute(input, options))
        : undefined,
    };
  }
  return wrapped as ToolSet;
}

export const DESTRUCTIVE_TOOL_NAMES = ['cancelJob', 'pauseQueue'] as const;
