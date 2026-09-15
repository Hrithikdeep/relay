import type { RelayClient } from "../client";
import type { CreateQueueInput, ListResponse, Queue, QueueStats } from "../types";

export class QueuesResource {
  constructor(private readonly client: RelayClient) {}

  // POST /v1/queues - 201. 409 if a queue with this name already exists.
  create(input: CreateQueueInput): Promise<Queue> {
    return this.client.request("POST", "/queues", { body: input });
  }

  // GET /v1/queues - 200, { data }.
  list(): Promise<ListResponse<Queue>> {
    return this.client.request("GET", "/queues");
  }

  // GET /v1/queues/:idOrName/stats - accepts either the queue id or its name.
  stats(idOrName: string): Promise<QueueStats> {
    return this.client.request("GET", `/queues/${idOrName}/stats`);
  }

  // POST /v1/queues/:idOrName/pause - 200, updated Queue.
  pause(idOrName: string): Promise<Queue> {
    return this.client.request("POST", `/queues/${idOrName}/pause`);
  }

  // POST /v1/queues/:idOrName/resume - 200, updated Queue.
  resume(idOrName: string): Promise<Queue> {
    return this.client.request("POST", `/queues/${idOrName}/resume`);
  }
}
