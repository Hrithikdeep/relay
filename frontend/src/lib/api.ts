import axios from 'axios';
import type {
  AiErrorPattern,
  ApiKey,
  ConversationDetail,
  Conversation,
  CreateApiKeyInput,
  CreatedApiKey,
  CreateJobInput,
  CreateQueueInput,
  CreateWebhookInput,
  CreateWorkerInput,
  CreateWorkflowInput,
  ExecutionLogWithJob,
  HealthResponse,
  Insights,
  Job,
  JobWithRelations,
  ListJobsQuery,
  ListLogsQuery,
  ListResponse,
  NaturalLanguageJobInput,
  PaginatedResponse,
  Prediction,
  Queue,
  QueueStats,
  UpdateWorkspaceInput,
  Webhook,
  Worker,
  WorkerHeartbeatInput,
  WorkerWithActiveJobCount,
  Workflow,
  WorkflowRun,
  WorkflowRunDetail,
  Workspace,
  JoinWaitlistInput,
  WaitlistEntry,
  WaitlistCountResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'relay_test_key_123';

// /health is mounted before the /v1 prefix on the backend; everything else
// lives under /v1.
const client = axios.create({
  baseURL: `${API_BASE}/v1`,
  headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
});

export const api = {
  // ---- Health (unauthenticated, no /v1 prefix) ----
  getHealth: (): Promise<HealthResponse> =>
    axios.get(`${API_BASE}/health`).then((r) => r.data),

  // ---- Jobs ----
  // GET /v1/jobs returns { data, pagination } - the full envelope is kept
  // since pagination metadata is needed by the UI.
  getJobs: (params?: ListJobsQuery): Promise<PaginatedResponse<Job>> =>
    client.get('/jobs', { params }).then((r) => r.data),
  // GET /v1/jobs/:id returns the raw Job plus nested executionLogs/predictions.
  getJob: (id: string): Promise<JobWithRelations> =>
    client.get(`/jobs/${id}`).then((r) => r.data),
  // POST /v1/jobs returns the raw created Job (201), not wrapped.
  createJob: (data: CreateJobInput): Promise<Job> =>
    client.post('/jobs', data).then((r) => r.data),
  // DELETE /v1/jobs/:id is a soft-cancel: 200 + the updated Job (status
  // CANCELLED), NOT a 204 - the row is never actually deleted.
  cancelJob: (id: string): Promise<Job> =>
    client.delete(`/jobs/${id}`).then((r) => r.data),
  // POST /v1/jobs/:id/replay creates and returns a brand-new Job (201, new
  // id) - it does not mutate or return the original failed job. Backend
  // rejects with 400 unless the job's current status is FAILED.
  replayJob: (id: string): Promise<Job> =>
    client.post(`/jobs/${id}/replay`).then((r) => r.data),
  // DELETE /v1/jobs/:id/permanent genuinely removes the row - 204, no body.
  // Backend rejects with 400 unless the job is COMPLETED/FAILED/CANCELLED.
  deleteJobPermanent: (id: string): Promise<void> =>
    client.delete(`/jobs/${id}/permanent`).then(() => undefined),

  // ---- Queues ----
  getQueues: (): Promise<ListResponse<Queue>> => client.get('/queues').then((r) => r.data),
  createQueue: (data: CreateQueueInput): Promise<Queue> =>
    client.post('/queues', data).then((r) => r.data),
  // :idOrName accepts either the queue's id or its name - the backend
  // matches on either.
  getQueueStats: (idOrName: string): Promise<QueueStats> =>
    client.get(`/queues/${idOrName}/stats`).then((r) => r.data),
  pauseQueue: (idOrName: string): Promise<Queue> =>
    client.post(`/queues/${idOrName}/pause`).then((r) => r.data),
  resumeQueue: (idOrName: string): Promise<Queue> =>
    client.post(`/queues/${idOrName}/resume`).then((r) => r.data),

  // ---- Workers ----
  getWorkers: (): Promise<ListResponse<Worker>> => client.get('/workers').then((r) => r.data),
  getWorker: (id: string): Promise<WorkerWithActiveJobCount> =>
    client.get(`/workers/${id}`).then((r) => r.data),
  createWorker: (data: CreateWorkerInput): Promise<Worker> =>
    client.post('/workers', data).then((r) => r.data),
  heartbeatWorker: (id: string, data?: WorkerHeartbeatInput): Promise<Worker> =>
    client.patch(`/workers/${id}/heartbeat`, data ?? {}).then((r) => r.data),
  // 204 No Content - nothing to return.
  deleteWorker: (id: string): Promise<void> => client.delete(`/workers/${id}`).then(() => undefined),

  // ---- AI ----
  getInsights: (): Promise<Insights> => client.get('/ai/insights').then((r) => r.data),
  getPredictions: (): Promise<ListResponse<Prediction>> =>
    client.get('/ai/predictions').then((r) => r.data),
  getErrorPatterns: (): Promise<ListResponse<AiErrorPattern>> =>
    client.get('/ai/error-patterns').then((r) => r.data),
  // Backend infers the target queue from keywords in `description` only -
  // there is no queueId field to pass here.
  createNaturalLanguageJob: (data: NaturalLanguageJobInput): Promise<Job> =>
    client.post('/ai/jobs/natural-language', data).then((r) => r.data),

  // ---- AI Chat conversations (real history; streaming itself lives in lib/aiChat.ts) ----
  getConversations: (): Promise<ListResponse<Conversation>> =>
    client.get('/ai/conversations').then((r) => r.data),
  getConversation: (id: string): Promise<ConversationDetail> =>
    client.get(`/ai/conversations/${id}`).then((r) => r.data),

  // ---- Workspace ----
  getWorkspace: (): Promise<Workspace> => client.get('/workspace').then((r) => r.data),
  updateWorkspace: (data: UpdateWorkspaceInput): Promise<Workspace> =>
    client.patch('/workspace', data).then((r) => r.data),

  // ---- API Keys ----
  // permissions is stored but not enforced by any route - see CreateApiKeyInput.
  getApiKeys: (): Promise<ListResponse<ApiKey>> => client.get('/api-keys').then((r) => r.data),
  // Response includes `key`, the full plaintext - the only time it's ever returned.
  createApiKey: (data: CreateApiKeyInput): Promise<CreatedApiKey> =>
    client.post('/api-keys', data).then((r) => r.data),
  // 204 No Content - soft-revoke (sets revokedAt), never hard-deletes.
  revokeApiKey: (id: string): Promise<void> =>
    client.delete(`/api-keys/${id}`).then(() => undefined),

  // ---- Logs ----
  // Cross-job execution log search - job+queue names come from a real
  // backend join, not fabricated or N+1'd on the frontend.
  getLogs: (params?: ListLogsQuery): Promise<PaginatedResponse<ExecutionLogWithJob>> =>
    client.get('/logs', { params }).then((r) => r.data),

  // ---- Workflows ----
  // Real, event-driven sequential engine - see backend/src/core/WorkflowEngine.ts.
  getWorkflows: (): Promise<ListResponse<Workflow>> => client.get('/workflows').then((r) => r.data),
  getWorkflow: (id: string): Promise<Workflow> => client.get(`/workflows/${id}`).then((r) => r.data),
  createWorkflow: (data: CreateWorkflowInput): Promise<Workflow> =>
    client.post('/workflows', data).then((r) => r.data),
  // 204 No Content - backend returns 400 if any run is currently RUNNING.
  deleteWorkflow: (id: string): Promise<void> =>
    client.delete(`/workflows/${id}`).then(() => undefined),
  // Kicks off a real WorkflowRun + step 0's real Job - 201.
  runWorkflow: (id: string): Promise<WorkflowRunDetail> =>
    client.post(`/workflows/${id}/run`).then((r) => r.data),
  getWorkflowRuns: (id: string, params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<WorkflowRun>> =>
    client.get(`/workflows/${id}/runs`, { params }).then((r) => r.data),
  getWorkflowRun: (runId: string): Promise<WorkflowRunDetail> =>
    client.get(`/workflows/runs/${runId}`).then((r) => r.data),

  // ---- Webhooks ----
  getWebhooks: (): Promise<ListResponse<Webhook>> => client.get('/webhooks').then((r) => r.data),
  // Field is `events: string[]`, not `eventType`.
  createWebhook: (data: CreateWebhookInput): Promise<Webhook> =>
    client.post('/webhooks', data).then((r) => r.data),
  // 204 No Content - nothing to return.
  deleteWebhook: (id: string): Promise<void> =>
    client.delete(`/webhooks/${id}`).then(() => undefined),

  // ---- Waitlist (public, unauthenticated - landing page only) ----
  // 201 on success; backend returns 409 with a friendly message if the
  // email is already registered (surfaced via err.response.data.message).
  joinWaitlist: (data: JoinWaitlistInput): Promise<WaitlistEntry> =>
    client.post('/waitlist', data).then((r) => r.data),
  getWaitlistCount: (): Promise<WaitlistCountResponse> =>
    client.get('/waitlist/count').then((r) => r.data),
};

export default api;
