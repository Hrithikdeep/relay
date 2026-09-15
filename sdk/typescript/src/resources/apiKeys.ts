import type { RelayClient } from "../client";
import type { ApiKey, CreateApiKeyInput, CreatedApiKey, ListResponse } from "../types";

export class ApiKeysResource {
  constructor(private readonly client: RelayClient) {}

  // POST /v1/api-keys - 201. The ONLY response that ever includes the full
  // plaintext `key` - it cannot be retrieved again after this call.
  create(input: CreateApiKeyInput): Promise<CreatedApiKey> {
    return this.client.request("POST", "/api-keys", { body: input });
  }

  // GET /v1/api-keys - 200, { data }. Never includes keyHash or plaintext.
  list(): Promise<ListResponse<ApiKey>> {
    return this.client.request("GET", "/api-keys");
  }

  // DELETE /v1/api-keys/:id - 204. Soft-revoke (sets revokedAt); never
  // hard-deletes the row.
  revoke(id: string): Promise<void> {
    return this.client.request("DELETE", `/api-keys/${id}`);
  }
}
