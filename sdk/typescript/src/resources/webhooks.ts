import type { RelayClient } from "../client";
import type { CreateWebhookInput, ListResponse, Webhook } from "../types";

export class WebhooksResource {
  constructor(private readonly client: RelayClient) {}

  // POST /v1/webhooks - 201. `secret` is auto-generated if omitted.
  create(input: CreateWebhookInput): Promise<Webhook> {
    return this.client.request("POST", "/webhooks", { body: input });
  }

  // GET /v1/webhooks - 200, { data }.
  list(): Promise<ListResponse<Webhook>> {
    return this.client.request("GET", "/webhooks");
  }

  // DELETE /v1/webhooks/:id - 204.
  delete(id: string): Promise<void> {
    return this.client.request("DELETE", `/webhooks/${id}`);
  }
}
