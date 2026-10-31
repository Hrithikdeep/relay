import type { Metadata } from "next";
import { Callout, Code, DocLink, Endpoint, H2, PageHeader, json } from "@/components/docs/DocsKit";

export const metadata: Metadata = { title: "API Keys API · Relay Docs" };

export default function ApiKeysApiPage() {
  return (
    <>
      <PageHeader
        title="API Keys API"
        lead={
          <>
            Create and revoke the keys used for the <Code>x-api-key</Code> header. You can also manage them on the API Keys page. See{" "}
            <DocLink slug="authentication">Authentication</DocLink>.
          </>
        }
      />

      <H2>Endpoints</H2>
      <Endpoint
        method="POST"
        path="/v1/api-keys"
        description="Create a key. The full key is in the response and is never shown again."
        request={json({ name: "string (required, max 100)", permissions: "string[] (optional, default [])" })}
        response={json({
          id: "key_abc123",
          name: "CI pipeline",
          keyPrefix: "relay_sk_live_AbCdEf",
          createdAt: "2025-01-01T12:00:00.000Z",
          key: "relay_sk_live_example_not_a_real_key",
        })}
      />
      <Endpoint
        method="GET"
        path="/v1/api-keys"
        description="List your keys. Only the display prefix is returned, never the key or its hash."
        response={json({
          data: [
            {
              id: "key_abc123",
              name: "CI pipeline",
              keyPrefix: "relay_sk_live_AbCdEf",
              permissions: [],
              createdAt: "2025-01-01T12:00:00.000Z",
              lastUsedAt: "2025-01-01T13:00:00.000Z",
              requestCount: 42,
              revokedAt: null,
            },
          ],
        })}
      />
      <Endpoint
        method="DELETE"
        path="/v1/api-keys/:id"
        description="Revoke a key. It stops working immediately; the record is kept with revokedAt set."
        response="204 No Content."
      />

      <Callout title="About permissions">
        <p>
          <Code>permissions</Code> is stored on the key but is not enforced yet: every key can use every endpoint in its workspace.
        </p>
      </Callout>
    </>
  );
}
