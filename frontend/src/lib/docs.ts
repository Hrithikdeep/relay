// Same base URL the app's own API client uses (lib/api.ts), so every example
// in the docs points at whichever backend this deployment is configured for.
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface DocPageMeta {
  slug: string;
  title: string;
  description: string;
  keywords?: string[];
}

export interface DocGroup {
  title: string;
  pages: DocPageMeta[];
}

export const DOC_GROUPS: DocGroup[] = [
  {
    title: "Get Started",
    pages: [
      { slug: "", title: "Overview", description: "What Relay is, what it does, and the stack underneath.", keywords: ["intro", "stack", "features"] },
      { slug: "quick-start", title: "Quick Start", description: "Sign up, get an API key, and make your first call.", keywords: ["sign up", "api key", "first job", "curl"] },
      { slug: "authentication", title: "Authentication", description: "x-api-key, Clerk bearer tokens, errors and rate limits.", keywords: ["x-api-key", "bearer", "401", "429", "rate limit"] },
    ],
  },
  {
    title: "Core Concepts",
    pages: [
      { slug: "concepts/queues", title: "Queues", description: "Where jobs wait; concurrency, pausing and stats.", keywords: ["concurrency", "pause", "resume"] },
      { slug: "concepts/jobs", title: "Jobs", description: "Payloads, statuses, retries, scheduling and logs.", keywords: ["status", "retry", "backoff", "scheduled", "cancel", "replay"] },
      { slug: "concepts/workers", title: "Workers", description: "How jobs actually get processed.", keywords: ["processing", "heartbeat", "handler", "pool"] },
      { slug: "concepts/workflows", title: "Workflows", description: "Multi-step sequences that advance automatically.", keywords: ["steps", "pipeline", "run"] },
    ],
  },
  {
    title: "AI Layer",
    pages: [
      { slug: "ai/root-cause-analysis", title: "Root cause analysis", description: "Plain-English failure analysis with a confidence score.", keywords: ["error", "confidence", "suggested fix", "classification", "openai"] },
      { slug: "ai/predictions", title: "Predictions", description: "Early warnings for overload and error surges.", keywords: ["capacity", "overload", "error surge", "monitoring"] },
      { slug: "ai/chat-agent", title: "AI Chat Agent", description: "Operate your queues by chatting, with approval gating.", keywords: ["tools", "approval", "sse", "conversation"] },
    ],
  },
  {
    title: "API Reference",
    pages: [
      { slug: "api/queues", title: "Queues API", description: "Create, list, inspect, pause and resume queues.", keywords: ["endpoint", "rest"] },
      { slug: "api/jobs", title: "Jobs API", description: "Create, list, cancel, replay and analyze jobs.", keywords: ["endpoint", "rest", "analysis"] },
      { slug: "api/workers", title: "Workers API", description: "Register workers and send heartbeats.", keywords: ["endpoint", "rest"] },
      { slug: "api/webhooks", title: "Webhooks API", description: "Subscribe to job events with signed deliveries.", keywords: ["endpoint", "signature", "hmac"] },
      { slug: "api/api-keys", title: "API Keys API", description: "Create and revoke API keys.", keywords: ["endpoint", "revoke"] },
    ],
  },
  {
    title: "SDKs",
    pages: [
      { slug: "sdks/typescript", title: "TypeScript SDK", description: "In the repo, not yet published to npm.", keywords: ["npm", "@relay/sdk", "node"] },
      { slug: "sdks/python", title: "Python", description: "Calling the REST API with requests.", keywords: ["requests", "pip"] },
    ],
  },
  {
    title: "Help",
    pages: [{ slug: "faq", title: "FAQ", description: "Pricing, self-hosting, AI, and your data.", keywords: ["free", "self-host", "data", "questions"] }],
  },
];

export const DOC_PAGES = DOC_GROUPS.flatMap((group) => group.pages.map((page) => ({ ...page, group: group.title })));

export function docHref(slug: string): string {
  return slug ? `/docs/${slug}` : "/docs";
}
