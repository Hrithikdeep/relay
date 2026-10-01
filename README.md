# Relay

**Infrastructure that thinks.** An AI-native background job processing platform — a job queue that classifies your jobs, diagnoses its own failures, and lets you operate it in plain English.

> 🚧 **Status: Demo / Work in Progress.** Relay is a fully functional, deployed product built solo end-to-end — currently running as a public demo while it's developed further toward a real startup. See [Status & Roadmap](#status--roadmap) below for what's live vs. what's next.

---

## Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

### AI Chat Agent
![AI Chat Agent](screenshots/ai-chat.png)

### Job Detail — AI Error Analysis
![Job Detail](screenshots/job-detail.png)

### Queues
![Queues](screenshots/queues.png)

### Workflows
![Workflows](screenshots/workflows.png)

---

## The Problem

Every backend system has background jobs — sending emails, processing payments, resizing images, syncing data. Standard job queues (BullMQ, Celery, Sidekiq) give you a queue and basic retries. Everything else — figuring out *why* a job keeps failing, deciding how long to wait before retrying, routing different job types correctly — is manual, tribal knowledge that lives in a senior engineer's head until it breaks at 2am.

Picture a payment webhook job that starts failing at 2am because an upstream provider changed a response field. The queue dutifully retries it three times, marks it failed, and moves on. Nobody is paged, the dead-letter list quietly grows, and by morning a few hundred customers have paid but never been provisioned. Someone then has to dig through raw stack traces, work out that all those failures share one root cause, and decide whether to retry, patch, or replay. Relay is built to shorten exactly that loop: it groups the failures into one recurring pattern, explains the likely cause, and lets you replay the affected jobs once the fix is in.

## What Relay Does

Relay layers AI onto the queue itself, not just the jobs running through it:

- 🤖 **AI Job Classification** — incoming jobs are automatically categorized, risk-scored, and prioritized by an LLM instead of hardcoded rules. The result (category, confidence, risk score, priority, estimated duration) is stored with the job and shown on its detail page.
- 🔍 **AI Error Analysis** — failed jobs get a real root-cause explanation, not just a raw stack trace. Recurring failure patterns are fingerprinted and remembered, so the system gets smarter about *your specific* failure modes over time. Each pattern keeps an occurrence count, a confidence score, and a suggested fix that a human applies — nothing is changed automatically.
- 💬 **AI Chat Agent** — ask "why did job #4521 fail?" or "pause the payments queue" in plain English. The agent calls real backend tools to answer or act, with human-in-the-loop confirmation before anything destructive runs. Read-only questions are answered straight away; for destructive actions like pausing a queue or cancelling a job, the agent stops and shows an Approve / Reject prompt, and only runs the tool after you approve. A rejection is passed back to the agent so it can tell you nothing was changed.
- 🔗 **Multi-step Workflows** — chain jobs across queues into a pipeline that auto-advances on success and halts cleanly on failure. Every run is tracked in a `WorkflowRun` with a per-step `WorkflowStepRun`; when a step's job completes, the engine immediately creates the next step's job, and when a step's job fails, the run is marked `FAILED` and no later step is started.
- 📊 **Full observability** — a dashboard for job history, queue health, worker status, and AI-generated insights/predictions. Each job has an execution timeline with every attempt, its duration, and its error output, plus a dedicated logs page.
- 🔔 **Webhooks** — real-time notifications on `job.completed` / `job.failed`, so your own systems can react without polling the API.
- 📦 **TypeScript SDK** — `@relay/sdk` for integrating Relay into any Node/TS backend. It covers jobs, queues, workers, webhooks, workflows, API keys, logs and AI insights, throws typed `RelayError`s, and has zero runtime dependencies.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js · Express · TypeScript |
| Database | PostgreSQL · Prisma ORM |
| Queue | Redis · BullMQ |
| AI (classification/analysis) | LangChain · OpenAI |
| AI (chat agent) | Vercel AI SDK · OpenAI (streaming, tool-calling) |
| Frontend | Next.js (App Router) · Tailwind CSS |
| SDK | TypeScript (`@relay/sdk`) |
| Hosting | Railway (backend/DB) · Upstash (Redis) · Vercel (frontend) |

---

## Architecture

```
Client / SDK
      │
      ▼
 ┌─────────────┐      ┌──────────────┐
 │  Express API │ ───▶ │  PostgreSQL  │  (source of truth)
 └─────────────┘      └──────────────┘
      │
      ▼
 ┌─────────────┐      ┌──────────────┐
 │ BullMQ/Redis │ ───▶ │   Workers    │ ──▶ AI Classifier (async, non-blocking)
 └─────────────┘      └──────────────┘
                              │
                     success  │  failure
                        ▼          ▼
                  job.completed   AI Error Analyzer
                   webhook        → root cause + pattern learning
                                  → job.failed webhook
```

Jobs are the source of truth in Postgres; Redis/BullMQ handles fast dispatch, retries (exponential backoff), and concurrency. AI enrichment (classification, error analysis) is always async and non-blocking — an AI outage never prevents a job from processing.

---

## Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- Docker (for local Postgres + Redis)
- An OpenAI API key

### 1. Clone and install
```bash
git clone https://github.com/Hrithikdeep/relay.git
cd relay/backend
npm install
```

### 2. Start Postgres + Redis
```bash
cd ..
docker-compose up -d
```

### 3. Configure environment
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, REDIS_HOST/PORT, OPENAI_API_KEY
```

### 4. Run migrations + seed
```bash
npx prisma migrate dev
npm run seed
```

### 5. Start the backend
```bash
npm run dev
# API running on http://localhost:3001
```

### 6. Start the frontend
```bash
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
# Dashboard on http://localhost:3000
```

---

## Demo Access

The hosted demo is currently gated behind a shared access credential (not per-user accounts yet — see [Status & Roadmap](#status--roadmap)):

```
URL:      https://relay-xi-nine-92.vercel.app/
Password: [demo password]
```

---

## API Overview

```bash
curl -X POST https://your-instance/v1/jobs \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"queueId":"<queue-id>","name":"send-welcome-email","payload":{"userId":"usr_123"}}'

curl https://your-instance/v1/jobs/<job-id> -H "x-api-key: YOUR_KEY"
```

### Using the SDK
```typescript
import { Relay } from '@relay/sdk';

const relay = new Relay({
  apiKey: process.env.RELAY_API_KEY,
  baseUrl: 'https://your-instance',
});

const job = await relay.jobs.create({
  queueId: 'your-queue-id',
  name: 'send-welcome-email',
  payload: { userId: 'usr_123' },
});

const result = await relay.jobs.get(job.id);
console.log(result.status); // "COMPLETED" once a worker has finished it
```

---

## Project Structure

```
relay/
├── backend/          Express API, Prisma schema, BullMQ workers, AI layer
├── frontend/          Next.js dashboard
├── sdk/typescript/    @relay/sdk package
└── docker-compose.yml Local Postgres + Redis
```

---

## Status & Roadmap

**Live and working today:**
- ✅ Full job queue with retries, backoff, concurrency, pause/resume
- ✅ AI job classification and error analysis
- ✅ AI chat agent with 14 tools, streaming, human-in-the-loop safety gating
- ✅ Multi-step workflow execution engine
- ✅ Dashboard, webhooks, API key management, TypeScript SDK
- ✅ Deployed in production (Railway + Upstash + Vercel)

**Not yet built — honest roadmap:**
- ⬜ Real multi-user authentication with per-tenant data isolation (currently a single shared demo workspace) — deliberately not done yet, because a login form alone would be misleading: every query, queue, and API key has to be scoped to the right tenant first, and that needs to be done properly rather than bolted on
- ⬜ Team / Billing / 2FA (UI placeholders exist, backend doesn't yet) — these all depend on real accounts and tenants existing first, so they follow the auth work above
- ⬜ Visual drag-and-drop workflow builder (currently a list-based step builder — the execution engine behind it is fully built) — the engine was the hard part and is finished, so the builder is purely a UI layer that can be added on top without changing how workflows run
- ⬜ AI chat agent exposed through the SDK (currently in-app only) — the agent's confirmation step is built around the dashboard's Approve / Reject UI, so exposing it programmatically needs a clean API for approvals first

This project started as a solo technical build to go deep on queue internals, AI tool-calling architecture, and full-stack system design — and is being developed further with the goal of turning it into a real product.

---

## License

MIT

## Author

Built by [Hrithik](https://hrithik-portfolio-nu.vercel.app)
