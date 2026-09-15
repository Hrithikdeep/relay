import type { RelayClient } from "../client";
import type { ListResponse, Worker, WorkerStatus, WorkerWithActiveJobCount } from "../types";

export class WorkersResource {
  constructor(private readonly client: RelayClient) {}

  // GET /v1/workers - 200, { data }.
  list(): Promise<ListResponse<Worker>> {
    return this.client.request("GET", "/workers");
  }

  // GET /v1/workers/:id - 200, Worker + activeJobCount.
  get(id: string): Promise<WorkerWithActiveJobCount> {
    return this.client.request("GET", `/workers/${id}`);
  }

  // PATCH /v1/workers/:id/heartbeat - 200, updated Worker. Omitting status
  // defaults the backend to ONLINE.
  heartbeat(id: string, status?: WorkerStatus): Promise<Worker> {
    return this.client.request("PATCH", `/workers/${id}/heartbeat`, {
      body: status ? { status } : {},
    });
  }

  // DELETE /v1/workers/:id - 204.
  remove(id: string): Promise<void> {
    return this.client.request("DELETE", `/workers/${id}`);
  }
}
