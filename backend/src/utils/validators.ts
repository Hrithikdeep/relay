import { ExecutionLogStatus, JobStatus, WorkerStatus } from '@prisma/client';
import { z } from 'zod';

export const createQueueSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  concurrency: z.number().int().positive().default(1),
});

export const createJobSchema = z.object({
  queueId: z.string().min(1),
  name: z.string().min(1).max(200),
  payload: z.record(z.any()).default({}),
  priority: z.number().int().default(0),
  maxAttempts: z.number().int().positive().default(3),
  scheduledAt: z.coerce.date().optional(),
});

export const listJobsQuerySchema = z.object({
  queueId: z.string().optional(),
  status: z.nativeEnum(JobStatus).optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  secret: z.string().min(8).optional(),
});

export const createWorkerSchema = z.object({
  name: z.string().min(1).max(100),
  hostname: z.string().max(255).optional(),
  concurrency: z.number().int().positive().default(1),
  version: z.string().max(50).optional(),
});

export const workerHeartbeatSchema = z.object({
  status: z.nativeEnum(WorkerStatus).optional(),
});

export const naturalLanguageJobSchema = z.object({
  description: z.string().min(1).max(1000),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(100).nullable(),
    timezone: z.string().min(1).max(100),
    defaultMaxAttempts: z.number().int().positive(),
    defaultBackoffMs: z.number().int().nonnegative(),
    defaultTimeoutSeconds: z.number().int().positive(),
    aiJobClassificationEnabled: z.boolean(),
    aiErrorAnalysisEnabled: z.boolean(),
    aiPredictiveMonitoringEnabled: z.boolean(),
  })
  .partial();

export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type ListJobsQuery = z.infer<typeof listJobsQuerySchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type WorkerHeartbeatInput = z.infer<typeof workerHeartbeatSchema>;
export const listLogsQuerySchema = z.object({
  status: z.nativeEnum(ExecutionLogStatus).optional(),
  queueId: z.string().optional(),
  search: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default([]),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
});

export const chatConfirmSchema = z.object({
  conversationId: z.string(),
  toolCallId: z.string(),
  approved: z.boolean(),
});

export const createWorkflowStepSchema = z.object({
  order: z.number().int(),
  queueId: z.string().min(1),
  name: z.string().min(1).max(200),
  payload: z.record(z.any()).optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  steps: z.array(createWorkflowStepSchema).min(1),
});

export const joinWaitlistSchema = z.object({
  email: z.string().email(),
});

export type NaturalLanguageJobInput = z.infer<typeof naturalLanguageJobSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatConfirmInput = z.infer<typeof chatConfirmSchema>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type WorkflowStepInput = z.infer<typeof createWorkflowStepSchema>;
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
