# Contributing to Relay

Thanks for your interest in Relay. This page covers how to get the code, run it, what to check before opening a pull request, and the conventions the project follows.

## Code of conduct

Be respectful. No harassment, personal attacks or discriminatory language, in issues, pull requests or anywhere else the project is discussed. Maintainers may remove comments and contributions that break this, and may block repeat offenders.

## Reporting issues

Open an issue on [GitHub](https://github.com/Hrithikdeep/relay/issues). For a bug, include what you did, what you expected, what happened instead, and your Node.js version. For a security problem, do not open a public issue; contact the maintainer through their [GitHub profile](https://github.com/Hrithikdeep) instead.

## Fork, clone and set up

1. **Fork** the repository on GitHub, then clone your fork:

   ```bash
   git clone https://github.com/<your-username>/relay.git
   cd relay
   git remote add upstream https://github.com/Hrithikdeep/relay.git
   ```

2. **Set up the dev environment** by following **[Getting started](README.md#getting-started)** in the README: Docker for Postgres and Redis, then `npm install` and a `.env` file in `backend/` and `frontend/`. You need a free Clerk application for the dashboard and, optionally, an OpenAI key for the AI features.

3. Keep your fork current before starting work:

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

## Branch naming

Create one branch per change, from an up-to-date `main`, named `<type>/<short-description>` in lowercase with hyphens:

| Type | Use for | Example |
|---|---|---|
| `feat/` | new behavior | `feat/webhook-retries` |
| `fix/` | bug fixes | `fix/queue-pause-race` |
| `docs/` | documentation only | `docs/jobs-api-examples` |
| `chore/` | tooling, dependencies, cleanup | `chore/bump-prisma` |

## Opening a pull request

1. Commit your work in small, clear commits. The first line says what changed; add a short body when the why isn't obvious.
2. Push your branch to your fork and open a pull request against `main` of `Hrithikdeep/relay`.
3. In the description, say what changed and why, how you tested it, and anything you could not test.
4. Keep it to one concern. Unrelated cleanups belong in a separate PR.

## Checks before review

Run these from the folder you changed. They come straight from the `package.json` scripts.

**Frontend** (`frontend/`)

| Command | What it checks |
|---|---|
| `npx tsc --noEmit` | Types. Must print nothing. (There is no `typecheck` script; this calls TypeScript directly.) |
| `npm run lint` | ESLint |
| `npm run build` | The production build must succeed |

`npm run lint` over the whole project currently reports some existing errors, mostly the `react-hooks/set-state-in-effect` rule in data-loading effects. Your change must not add new ones; check just your files with `npx eslint <path>`.

**Backend** (`backend/`)

| Command | What it checks |
|---|---|
| `npm run build` | `prisma generate` plus the esbuild transpile must succeed |
| `npm run typecheck` | `tsc --noEmit` |

`npm run typecheck` currently runs out of memory on the AI chat files (`src/ai/chat/*`), so it cannot pass as a whole-project gate yet. If you touch those files, say so in your PR; for the rest of the backend, type-check with those files excluded.

`npm test` runs Jest, but there is no automated test suite yet (`backend/tests` is empty). When you change anything that reads or writes tenant data, run the isolation check against a local backend instead:

```bash
cd backend
npx ts-node --transpile-only -P tsconfig.json scripts/leak-test.ts
```

It creates two throwaway workspaces, tries to read and modify one from the other through every router, prints a PASS/FAIL table, and deletes what it created. It must report no failures.

**Database changes**

```bash
cd backend
npx prisma migrate dev --name <short_description>
```

Commit the generated folder under `backend/prisma/migrations/` together with the `schema.prisma` change.

## Conventions

- **TypeScript strict mode** is on in the backend (`tsconfig.json`). Avoid `any`, and validate request bodies with `zod` (see `src/utils/validators.ts`).
- **Every route is workspace-scoped.** New routers use `authenticateAny` and `workspaceRateLimit`, and every query filters by the caller's workspace, directly or through the job's queue. Never trust an id from the client without checking it belongs to that workspace.
- **AI work must be non-blocking.** An AI failure, a disabled toggle or the monthly cap must never fail or delay a job. Follow the fallback pattern in `src/ai/` and claim usage with `reserveAiCall`.
- **Keep secrets out of git.** `.env` and `.env.local` are ignored. Never commit keys, tokens or real credentials, and update the matching `.env.example` when you add a variable.
- **Match the surrounding code**: naming, comment density and formatting. Comments explain why, not what.
- **Docs are part of the change.** If you change an endpoint or behavior, update the matching page under `frontend/src/app/(app)/docs`.
