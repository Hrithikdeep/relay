import type { RelayClient } from "../client";
import type { CreateJobInput, Job, JobWithRelations, ListJobsQuery, PaginatedResponse } from "../types";

export class JobsResource {
  constructor(private readonly client: RelayClient) {}

  // POST /v1/jobs - 201, raw Job.
  create(input: CreateJobInput): Promise<Job> {
    return this.client.request("POST", "/jobs", { body: input });
  }

  // GET /v1/jobs - 200, { data, pagination }.
  list(params?: ListJobsQuery): Promise<PaginatedResponse<Job>> {
    return this.client.request("GET", "/jobs", { query: params as Record<string, string | number> });
  }

  // GET /v1/jobs/:id - 200, Job + executionLogs/predictions.
  get(id: string): Promise<JobWithRelations> {
    return this.client.request("GET", `/jobs/${id}`);
  }

  // DELETE /v1/jobs/:id - 200, soft-cancel (status -> CANCELLED). Not a 204;
  // the row is never deleted by this call.
  cancel(id: string): Promise<Job> {
    return this.client.request("DELETE", `/jobs/${id}`);
  }

  // POST /v1/jobs/:id/replay - 201, a brand-new Job (new id). Backend
  // rejects with 400 unless the job's current status is FAILED.
  replay(id: string): Promise<Job> {
    return this.client.request("POST", `/jobs/${id}/replay`);
  }

  // DELETE /v1/jobs/:id/permanent - 204, genuinely removes the row. Backend
  // rejects with 400 unless the job is COMPLETED/FAILED/CANCELLED.
  deletePermanent(id: string): Promise<void> {
    return this.client.request("DELETE", `/jobs/${id}/permanent`);
  }
}
