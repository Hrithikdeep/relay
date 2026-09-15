import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../database';
import { authenticate } from '../middleware/auth';
import { listLogsQuerySchema } from '../../utils/validators';

export const logsRouter = Router();

logsRouter.use(authenticate);

// job+queue names come from a single Prisma `include` (one SQL query with
// joins), not a per-row lookup - see the report for confirmation.
const LOG_INCLUDE = {
  job: {
    select: {
      id: true,
      name: true,
      queue: { select: { id: true, name: true } },
    },
  },
} as const;

logsRouter.get('/', async (req, res, next) => {
  try {
    const query = listLogsQuerySchema.parse(req.query);

    const where: Prisma.JobExecutionLogWhereInput = {
      AND: [
        { job: { queue: { workspaceId: req.workspace!.id } } },
        ...(query.status ? [{ status: query.status }] : []),
        ...(query.queueId ? [{ job: { queueId: query.queueId } }] : []),
        ...(query.search
          ? [
              {
                OR: [
                  { message: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                  {
                    job: { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const [logs, total] = await Promise.all([
      prisma.jobExecutionLog.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        // startedAt (not createdAt) is the log's real event time - both are
        // set within the same instant when a job begins processing (see
        // JobProcessor.ts), but startedAt is the semantically meaningful one
        // for "when did this happen" in a log viewer.
        orderBy: { startedAt: 'desc' },
        include: LOG_INCLUDE,
      }),
      prisma.jobExecutionLog.count({ where }),
    ]);

    res.status(200).json({
      data: logs,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default logsRouter;
