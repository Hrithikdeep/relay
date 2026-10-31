import type { Metadata } from "next";
import { Callout, Code, CodeBlock, DocLink, H2, PageHeader } from "@/components/docs/DocsKit";
import { API_BASE } from "@/lib/docs";

export const metadata: Metadata = { title: "Python · Relay Docs" };

export default function PythonSdkPage() {
  return (
    <>
      <PageHeader title="Python" lead="There is no Python SDK. Use the REST API directly with any HTTP client - requests is shown here." />

      <H2>Setup</H2>
      <CodeBlock label="$ shell" code={`pip install requests`} />
      <p>
        Create an API key on the API Keys page and export it as <Code>RELAY_API_KEY</Code> (see <DocLink slug="quick-start">Quick Start</DocLink>).
      </p>

      <H2>Create a job</H2>
      <CodeBlock
        label="main.py"
        code={`import os
import requests

session = requests.Session()
session.headers["x-api-key"] = os.environ["RELAY_API_KEY"]

res = session.post(
    "${API_BASE}/v1/jobs",
    json={
        "queueId": "<queue-id>",
        "name": "send-welcome-email",
        "payload": {"to": "user@example.com"},
    },
)
res.raise_for_status()
job = res.json()

print(job["id"], job["status"])`}
      />

      <H2>Check on it</H2>
      <CodeBlock
        label="main.py"
        code={`res = session.get(f"${API_BASE}/v1/jobs/{job['id']}")
res.raise_for_status()
details = res.json()

print(details["status"], details["result"])
for log in details["executionLogs"]:
    print(log["attempt"], log["status"], log["message"])`}
      />

      <H2>List failed jobs</H2>
      <CodeBlock
        label="main.py"
        code={`res = session.get(
    "${API_BASE}/v1/jobs",
    params={"status": "FAILED", "pageSize": 20},
)
res.raise_for_status()

for failed in res.json()["data"]:
    print(failed["id"], failed["name"], failed["error"])`}
      />

      <Callout title="Errors">
        <p>
          Failed requests return a JSON body like <Code>{`{ "error": "...", "message": "..." }`}</Code>, so <Code>raise_for_status()</Code> is enough to surface them.
          See <DocLink slug="authentication">Authentication</DocLink> for the error shapes and rate limits.
        </p>
      </Callout>
    </>
  );
}
