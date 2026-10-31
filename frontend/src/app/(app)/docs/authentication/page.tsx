import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader, json } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Authentication · Relay Docs" };

export default function AuthenticationPage() {
  return (
    <>
      <PageHeader
        title="Authentication"
        lead={
          <>
            Every request (except <Code>GET /health</Code>) needs a credential. Use an API key for servers and scripts; the dashboard uses
            your signed-in session.
          </>
        }
      />

      <H2>API keys</H2>
      <p>
        Create a key on the <span className="text-foreground">API Keys</span> page and send it on the <Code>x-api-key</Code> header:
      </p>
      <CodeBlock
        label="x-api-key"
        code={`curl ${API_BASE}/v1/queues \\
  -H "x-api-key: YOUR_API_KEY"`}
      />
      <p>
        Keys look like <Code>relay_sk_live_…</Code>. They are stored hashed, shown in full only once at creation, and can be revoked at
        any time (see <DocLink slug="api/api-keys">API Keys API</DocLink>). A key is tied to one workspace and can only reach that
        workspace&apos;s data.
      </p>

      <H2>Clerk bearer tokens</H2>
      <p>
        The dashboard signs you in with Clerk and sends your session token as <Code>Authorization: Bearer &lt;session token&gt;</Code>.
        Session tokens are short-lived, so use an API key for anything that runs unattended. If both headers are sent, the API key is used.
      </p>
      <Callout title="Bearer tokens are for the browser">
        <p>
          Bearer tokens are for browser (Clerk session) use only. The <DocLink slug="sdks/typescript">TypeScript SDK</DocLink> takes an{" "}
          <Code>apiKey</Code> option and does not accept them.
        </p>
      </Callout>

      <H2>Errors</H2>
      <p>
        Requests without a valid credential get <Code>401 Unauthorized</Code>:
      </p>
      <CodeBlock label="401 - no credential" code={json({ error: "UnauthorizedError", message: "Missing API key or session token" })} />
      <CodeBlock label="401 - invalid key" code={json({ error: "UnauthorizedError", message: "Invalid API key" })} />
      <p>
        Invalid request bodies return <Code>400</Code> with the failing fields in <Code>details</Code>:
      </p>
      <CodeBlock
        label="400 - validation error"
        code={json({
          error: "ValidationError",
          message: "Invalid request data",
          details: { formErrors: [], fieldErrors: { name: ["Required"] } },
        })}
      />

      <H2>Rate limits</H2>
      <p>
        Each workspace may make 1000 requests per 15 minutes (and, separately, each IP address 300 per minute). Past the workspace limit
        you get <Code>429 Too Many Requests</Code>:
      </p>
      <CodeBlock
        label="429 - rate limited"
        code={json({
          error: "TooManyRequests",
          message: "Rate limit exceeded: 1000 requests per 15 minutes per workspace. Try again shortly.",
        })}
      />
      <p>
        Responses carry <Code>RateLimit</Code> headers showing your remaining allowance. AI features have their own monthly allowance - see{" "}
        <DocLink slug="ai/root-cause-analysis">Root cause analysis</DocLink>.
      </p>
    </>
  );
}
