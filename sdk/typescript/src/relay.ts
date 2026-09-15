import { RelayClient, type RelayConfig } from "./client";
import { AiResource } from "./resources/ai";
import { ApiKeysResource } from "./resources/apiKeys";
import { JobsResource } from "./resources/jobs";
import { LogsResource } from "./resources/logs";
import { QueuesResource } from "./resources/queues";
import { WebhooksResource } from "./resources/webhooks";
import { WorkersResource } from "./resources/workers";
import { WorkflowsResource } from "./resources/workflows";
import type { Job } from "./types";

export class Relay {
  readonly jobs: JobsResource;
  readonly queues: QueuesResource;
  readonly workers: WorkersResource;
  readonly webhooks: WebhooksResource;
  readonly workflows: WorkflowsResource;
  readonly apiKeys: ApiKeysResource;
  readonly logs: LogsResource;
  readonly ai: AiResource;

  private readonly client: RelayClient;

  constructor(config: RelayConfig) {
    this.client = new RelayClient(config);
    this.jobs = new JobsResource(this.client);
    this.queues = new QueuesResource(this.client);
    this.workers = new WorkersResource(this.client);
    this.webhooks = new WebhooksResource(this.client);
    this.workflows = new WorkflowsResource(this.client);
    this.apiKeys = new ApiKeysResource(this.client);
    this.logs = new LogsResource(this.client);
    this.ai = new AiResource(this.client);
  }

  // Convenience wrapper around POST /v1/ai/jobs/natural-language. The
  // backend infers the target queue from keywords in `description` only
  // (email/payment/image/analytics) - there is no queueId to pass here.
  run(description: string): Promise<Job> {
    return this.client.request("POST", "/ai/jobs/natural-language", { body: { description } });
  }
}
