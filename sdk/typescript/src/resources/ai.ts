import type { RelayClient } from "../client";
import type { AiErrorPattern, Insights, ListResponse, Prediction } from "../types";

export class AiResource {
  constructor(private readonly client: RelayClient) {}

  // GET /v1/ai/insights - 200. Real aggregates computed from Job/JobExecutionLog rows.
  insights(): Promise<Insights> {
    return this.client.request("GET", "/ai/insights");
  }

  // GET /v1/ai/predictions - 200, { data }. Computed on-the-fly, not stored
  // rows. Returns { data: [] } if aiPredictiveMonitoringEnabled is off for
  // the workspace.
  predictions(): Promise<ListResponse<Prediction>> {
    return this.client.request("GET", "/ai/predictions");
  }

  // GET /v1/ai/error-patterns - 200, { data }.
  errorPatterns(): Promise<ListResponse<AiErrorPattern>> {
    return this.client.request("GET", "/ai/error-patterns");
  }
}
