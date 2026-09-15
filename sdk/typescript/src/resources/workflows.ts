import type { RelayClient } from "../client";
import type {
  CreateWorkflowInput,
  ListResponse,
  ListWorkflowRunsQuery,
  PaginatedResponse,
  Workflow,
  WorkflowRun,
  WorkflowRunDetail,
} from "../types";

export class WorkflowsResource {
  constructor(private readonly client: RelayClient) {}

  // POST /v1/workflows - 201. Backend rejects with 400 if any step's
  // queueId doesn't belong to this workspace.
  create(input: CreateWorkflowInput): Promise<Workflow> {
    return this.client.request("POST", "/workflows", { body: input });
  }

  // GET /v1/workflows - 200, { data }.
  list(): Promise<ListResponse<Workflow>> {
    return this.client.request("GET", "/workflows");
  }

  // GET /v1/workflows/:id - 200.
  get(id: string): Promise<Workflow> {
    return this.client.request("GET", `/workflows/${id}`);
  }

  // DELETE /v1/workflows/:id - 204. Backend rejects with 400 if any run is
  // currently RUNNING.
  delete(id: string): Promise<void> {
    return this.client.request("DELETE", `/workflows/${id}`);
  }

  // POST /v1/workflows/:id/run - 201. Kicks off a real WorkflowRun + step
  // 0's real Job.
  run(id: string): Promise<WorkflowRunDetail> {
    return this.client.request("POST", `/workflows/${id}/run`);
  }

  // GET /v1/workflows/:id/runs - 200, { data, pagination }.
  runs(id: string, params?: ListWorkflowRunsQuery): Promise<PaginatedResponse<WorkflowRun>> {
    return this.client.request("GET", `/workflows/${id}/runs`, {
      query: params as Record<string, string | number>,
    });
  }

  // GET /v1/workflows/runs/:runId - 200.
  getRun(runId: string): Promise<WorkflowRunDetail> {
    return this.client.request("GET", `/workflows/runs/${runId}`);
  }
}
