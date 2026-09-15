import type { RelayClient } from "../client";
import type { ExecutionLogWithJob, ListLogsQuery, PaginatedResponse } from "../types";

export class LogsResource {
  constructor(private readonly client: RelayClient) {}

  // GET /v1/logs - 200, { data, pagination }. job/queue names come from a
  // real backend join, not fabricated or N+1'd.
  list(params?: ListLogsQuery): Promise<PaginatedResponse<ExecutionLogWithJob>> {
    return this.client.request("GET", "/logs", { query: params as Record<string, string | number> });
  }
}
