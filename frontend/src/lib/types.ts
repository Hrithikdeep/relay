// Mirrors backend/prisma/schema.prisma and backend/src/utils/validators.ts EXACTLY.
// Do not add fields, enum values, or params that don't exist in the backend source.

// ---------------------------------------------------------------------------
// Enums (exact string values from schema.prisma)
// ---------------------------------------------------------------------------

export type JobStatus = 'PENDING' | 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ExecutionLogStatus = 'STARTED' | 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'RETRIED';

export type WorkerStatus = 'ONLINE' | 'IDLE' | 'BUSY' | 'OFFLINE';

export type WorkflowRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

// Not a DB enum - a TS union defined in src/ai/predictor/PredictionEngine.ts.
export type PredictionType = 'error_surge' | 'capacity_overload';

// Not a DB enum - Webhook.events is a plain String[] with no validation of
// allowed values. These are the only two strings the backend actually emits
// (see src/core/JobProcessor.ts); nothing stops a client from subscribing to
// any other string, it just won't ever fire.
export type KnownWebhookEvent = 'job.completed' | 'job.failed';

// The 8 categories from src/ai/classifier/JobClassifier.ts.
export type JobCategory =
  | 'email'
  | 'webhook'
  | 'database'
  | 'image'
  | 'payment'
  | 'notification'
  | 'analytics'
  | 'other';

// ---------------------------------------------------------------------------
// Core models (Prisma Json/DateTime fields serialize over HTTP as
// object/string respectively - typed that way here, not as Date).
// ---------------------------------------------------------------------------

export interface JobClassification {
  category: JobCategory;
  estimatedDurationSeconds: number;
  riskScore: number;
  priority: number;
  confidence: number;
  reasoning: string;
}

export interface Job {
  id: string;
  queueId: string;
  workerId: string | null;
  name: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  result: Record<string, unknown> | null;
  error: string | null;
  aiClassification: JobClassification | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobExecutionLog {
  id: string;
  jobId: string;
  workerId: string | null;
  attempt: number;
  status: ExecutionLogStatus;
  message: string | null;
  stackTrace: string | null;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  createdAt: string;
}

// The JobPrediction table exists in schema.prisma but no backend code ever
// writes to it (verified via grep) - this array will always be empty [] in
// every real GET /jobs/:id response today.
export interface JobPrediction {
  id: string;
  jobId: string;
  predictedDurationMs: number | null;
  failureProbability: number;
  recommendedRetries: number | null;
  modelVersion: string;
  reasoning: string | null;
  createdAt: string;
}

// GET /jobs/:id includes these two relations; GET /jobs (list) and the
// create/cancel/replay endpoints return a plain Job without them.
export interface JobWithRelations extends Job {
  executionLogs: JobExecutionLog[];
  predictions: JobPrediction[];
}

// GET /v1/logs (data[]) - JobExecutionLog plus a real, joined job+queue
// reference (not fabricated - the backend includes this via a single query).
export interface ExecutionLogWithJob extends JobExecutionLog {
  job: {
    id: string;
    name: string;
    queue: { id: string; name: string };
  };
}

export interface ListLogsQuery {
  status?: ExecutionLogStatus;
  queueId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface Queue {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  concurrency: number;
  isPaused: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueueStats {
  queueId: string;
  name: string;
  isPaused: boolean;
  // Built from a Prisma groupBy - only statuses with >=1 job are present.
  stats: Partial<Record<JobStatus, number>>;
}

export interface Worker {
  id: string;
  workspaceId: string;
  name: string;
  hostname: string | null;
  status: WorkerStatus;
  concurrency: number;
  version: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Only GET /workers/:id returns this extra field; GET /workers (list) does not.
export interface WorkerWithActiveJobCount extends Worker {
  activeJobCount: number;
}

export interface Webhook {
  id: string;
  workspaceId: string;
  url: string;
  events: string[];
  // Returned in full, in plaintext, by both POST and GET - there is no
  // masking/redaction on the backend.
  secret: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiErrorPattern {
  id: string;
  workspaceId: string;
  queueId: string | null;
  signature: string;
  errorType: string;
  pattern: string;
  occurrenceCount: number;
  confidence: number;
  suggestedFix: string | null;
  isResolved: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

// GET /v1/api-keys (list) - never includes keyHash or the plaintext key.
// permissions is stored but NOT enforced by any route yet - it's inert
// metadata today, see CreateApiKeyDialog's warning banner.
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
  revokedAt: string | null;
}

// POST /v1/api-keys response shape - the ONLY time `key` (the full plaintext)
// is ever returned. Note it does NOT echo back `permissions`.
export interface CreatedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  key: string;
}

export interface CreateApiKeyInput {
  name: string;
  permissions?: string[];
}

// Computed on-the-fly by GET /ai/predictions - not a DB row, has no id.
export interface Prediction {
  type: PredictionType;
  description: string;
  confidence: number;
  predictedOccurrenceAt: string;
  recommendedAction: string;
}

// GET/PATCH /v1/workspace - never includes apiKey (see the select in
// backend/src/api/routes/workspace.ts).
export interface Workspace {
  id: string;
  name: string | null;
  timezone: string;
  defaultMaxAttempts: number;
  defaultBackoffMs: number;
  defaultTimeoutSeconds: number;
  aiJobClassificationEnabled: boolean;
  aiErrorAnalysisEnabled: boolean;
  aiPredictiveMonitoringEnabled: boolean;
  createdAt: string;
}

export interface Insights {
  healthScore: number;
  stats: {
    totalJobs: number;
    failedJobs: number;
    successRate: number;
    avgDurationMs: number;
    errorPatternsLearned: number;
  };
}

// ---------------------------------------------------------------------------
// Request payloads (mirroring the backend's Zod schemas in validators.ts)
// ---------------------------------------------------------------------------

export interface CreateJobInput {
  queueId: string;
  name: string;
  payload?: Record<string, unknown>;
  priority?: number;
  maxAttempts?: number;
  scheduledAt?: string;
}

export interface ListJobsQuery {
  queueId?: string;
  status?: JobStatus;
  // Matches jobs where name, id, or the related queue's name contains this
  // string (case-insensitive) - see listJobsQuerySchema in the backend.
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateQueueInput {
  name: string;
  description?: string;
  concurrency?: number;
}

export interface CreateWebhookInput {
  url: string;
  // The backend field is "events" (array), not "eventType" (singular string).
  events: string[];
  secret?: string;
}

export interface CreateWorkerInput {
  name: string;
  hostname?: string;
  concurrency?: number;
  version?: string;
}

export interface WorkerHeartbeatInput {
  status?: WorkerStatus;
}

export interface NaturalLanguageJobInput {
  // queueId is NOT accepted here - the backend infers the queue from
  // description keywords only (email/payment/image/analytics) and ignores
  // any other field.
  description: string;
}

// All fields optional - PATCH /v1/workspace accepts any subset.
export interface UpdateWorkspaceInput {
  name?: string | null;
  timezone?: string;
  defaultMaxAttempts?: number;
  defaultBackoffMs?: number;
  defaultTimeoutSeconds?: number;
  aiJobClassificationEnabled?: boolean;
  aiErrorAnalysisEnabled?: boolean;
  aiPredictiveMonitoringEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// Response envelopes
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ListResponse<T> {
  data: T[];
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'disconnected';
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: {
    fieldErrors: Record<string, string[]>;
    formErrors: string[];
  };
}

// ---------------------------------------------------------------------------
// AI Chat (GET /v1/ai/conversations, GET /v1/ai/conversations/:id) - real
// persisted rows, not fabricated. Streaming itself (POST /v1/ai/chat,
// POST /v1/ai/chat/confirm) is a custom SSE protocol, not the AI SDK's UI
// Message Stream wire format, so it's consumed with a hand-rolled reader
// (see lib/aiChat.ts) rather than @ai-sdk/react's useChat.
// ---------------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'tool';

// Message.toolCalls/toolResults store the AI SDK's own ModelMessage content
// arrays verbatim (see backend/src/ai/chat/agent.ts) - shape is intentionally
// loose here since it's provider-generated, not a backend-defined contract.
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls: unknown[] | null;
  toolResults: unknown[] | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

// ---------------------------------------------------------------------------
// Workflows (POST/GET/DELETE /v1/workflows, /v1/workflows/:id/run,
// /v1/workflows/:id/runs, /v1/workflows/runs/:id) - real, event-driven
// engine in backend/src/core/WorkflowEngine.ts. steps is stored sorted by
// `order`; array index == WorkflowStepRun.stepIndex.
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  order: number;
  queueId: string;
  name: string;
  payload?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  steps: WorkflowStep[];
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  currentStepIndex: number;
  startedAt: string;
  completedAt: string | null;
}

export interface WorkflowStepRun {
  id: string;
  workflowRunId: string;
  stepIndex: number;
  jobId: string;
  // Denormalized snapshot on the backend - only updated when the job
  // reaches COMPLETED/FAILED. The nested `job` below is the live source of
  // truth for anything in between (PENDING/ACTIVE).
  status: JobStatus;
  startedAt: string;
  finishedAt: string | null;
  job: Job;
}

// GET /v1/workflows/runs/:id - includes the parent workflow's real steps
// (for step names/queue mapping) and every real WorkflowStepRun with its
// linked Job joined in.
export interface WorkflowRunDetail extends WorkflowRun {
  workflow: {
    id: string;
    name: string;
    steps: WorkflowStep[];
  };
  steps: WorkflowStepRun[];
}

// POST /v1/waitlist - public, unauthenticated (landing page has no API key).
export interface JoinWaitlistInput {
  email: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  createdAt: string;
}

export interface WaitlistCountResponse {
  count: number;
}
