// Real end-to-end test against a REAL running local backend
// (http://localhost:3001). Imports the SDK exactly as an external consumer
// would - "@relay/sdk" resolves to the built dist/ output via the
// `"@relay/sdk": "file:.."` dependency in this directory's package.json,
// NOT a relative import into ../src.
import { Relay, RelayError } from "@relay/sdk";

const BASE_URL = "http://localhost:3001";
const API_KEY = "relay_test_key_123"; // the real seeded default key, see backend/prisma/seed.ts

const relay = new Relay({ apiKey: API_KEY, baseUrl: BASE_URL });

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  // ---------------------------------------------------------------------
  // 1. relay.run(...) - natural-language job creation
  // ---------------------------------------------------------------------
  section("1. relay.run() - natural-language job");
  const nlJob = await relay.run("Send welcome email to user@email.com");
  console.log("Created via relay.run():", JSON.stringify(nlJob, null, 2));

  const fetchedNlJob = await relay.jobs.get(nlJob.id);
  console.log(
    "Confirmed via relay.jobs.get():",
    JSON.stringify({ id: fetchedNlJob.id, name: fetchedNlJob.name, status: fetchedNlJob.status }, null, 2)
  );
  if (fetchedNlJob.id !== nlJob.id) throw new Error("Step 1 FAILED: fetched job id mismatch");
  console.log("Step 1 PASSED: real Job created and independently confirmed via GET.");

  // ---------------------------------------------------------------------
  // 2. relay.jobs.create(...) directly
  // ---------------------------------------------------------------------
  section("2. relay.jobs.create() - direct job creation");
  const queues = await relay.queues.list();
  const emailsQueue = queues.data.find((q) => q.name === "emails");
  if (!emailsQueue) throw new Error("Step 2 FAILED: expected a real 'emails' queue to exist");

  const directJob = await relay.jobs.create({
    queueId: emailsQueue.id,
    name: "sdk-e2e-test-direct-job",
    payload: { source: "sdk-e2e-test" },
    maxAttempts: 1,
  });
  console.log("Created via relay.jobs.create():", JSON.stringify(directJob, null, 2));
  if (directJob.queueId !== emailsQueue.id) throw new Error("Step 2 FAILED: queueId mismatch");
  console.log("Step 2 PASSED: real Job created directly.");

  // ---------------------------------------------------------------------
  // 3. relay.queues.list()
  // ---------------------------------------------------------------------
  section("3. relay.queues.list()");
  console.log(`Returned ${queues.data.length} real queues:`, JSON.stringify(queues.data, null, 2));
  if (queues.data.length === 0) throw new Error("Step 3 FAILED: expected at least one real queue");
  console.log("Step 3 PASSED: real queues returned.");

  // ---------------------------------------------------------------------
  // 4. relay.queues.pause() / .resume() with .stats() verification
  // ---------------------------------------------------------------------
  section("4. relay.queues.pause() / .resume()");
  const analyticsQueue = queues.data.find((q) => q.name === "analytics");
  if (!analyticsQueue) throw new Error("Step 4 FAILED: expected a real 'analytics' queue to exist");

  const beforePause = await relay.queues.stats(analyticsQueue.name);
  console.log("Stats before pause:", JSON.stringify(beforePause, null, 2));

  const paused = await relay.queues.pause(analyticsQueue.name);
  console.log("After pause():", JSON.stringify(paused, null, 2));
  const statsAfterPause = await relay.queues.stats(analyticsQueue.name);
  console.log("Stats after pause:", JSON.stringify(statsAfterPause, null, 2));
  if (!paused.isPaused || !statsAfterPause.isPaused) {
    throw new Error("Step 4 FAILED: queue did not report isPaused=true after pause()");
  }

  const resumed = await relay.queues.resume(analyticsQueue.name);
  console.log("After resume():", JSON.stringify(resumed, null, 2));
  const statsAfterResume = await relay.queues.stats(analyticsQueue.name);
  console.log("Stats after resume:", JSON.stringify(statsAfterResume, null, 2));
  if (resumed.isPaused || statsAfterResume.isPaused) {
    throw new Error("Step 4 FAILED: queue still reports isPaused=true after resume()");
  }
  console.log("Step 4 PASSED: real pause/resume state changes confirmed via stats().");

  // ---------------------------------------------------------------------
  // 5. relay.workflows.create() + .run()
  // ---------------------------------------------------------------------
  section("5. relay.workflows.create() + .run()");
  const workflow = await relay.workflows.create({
    name: `sdk-e2e-test-workflow-${Date.now()}`,
    description: "Created by the @relay/sdk e2e test",
    steps: [
      { order: 0, queueId: emailsQueue.id, name: "step-1-send-email" },
      { order: 1, queueId: analyticsQueue.id, name: "step-2-log-analytics" },
    ],
  });
  console.log("Created workflow:", JSON.stringify(workflow, null, 2));

  const run = await relay.workflows.run(workflow.id);
  console.log("Started run:", JSON.stringify(run, null, 2));
  if (run.workflowId !== workflow.id) throw new Error("Step 5 FAILED: run.workflowId mismatch");

  // Poll briefly to show the real run actually advancing.
  let latestRun = run;
  for (let i = 0; i < 5; i++) {
    await sleep(2000);
    latestRun = await relay.workflows.getRun(run.id);
    console.log(
      `Poll ${i + 1}/5 - status=${latestRun.status} currentStepIndex=${latestRun.currentStepIndex}:`,
      JSON.stringify(latestRun.steps.map((s) => ({ stepIndex: s.stepIndex, jobStatus: s.job.status })))
    );
    if (latestRun.status !== "RUNNING" && latestRun.status !== "PENDING") break;
  }
  console.log("Step 5 PASSED: real WorkflowRun started and observed via getRun().");

  // ---------------------------------------------------------------------
  // 6. Intentional auth error -> typed RelayError
  // ---------------------------------------------------------------------
  section("6. Intentional auth error with a bad API key");
  const badRelay = new Relay({ apiKey: "relay_sk_live_not_a_real_key", baseUrl: BASE_URL });
  try {
    await badRelay.jobs.list();
    throw new Error("Step 6 FAILED: expected a RelayError but the request succeeded");
  } catch (err) {
    if (!(err instanceof RelayError)) throw err;
    console.log("Caught RelayError:", JSON.stringify({ status: err.status, code: err.code, message: err.message }, null, 2));
    if (err.status !== 401 || err.code !== "UnauthorizedError") {
      throw new Error(`Step 6 FAILED: unexpected shape (status=${err.status}, code=${err.code})`);
    }
    console.log("Step 6 PASSED: real typed RelayError thrown with the correct 401/UnauthorizedError shape.");
  }

  // ---------------------------------------------------------------------
  // Cleanup - remove synthetic test artifacts, leave real seed data intact.
  // ---------------------------------------------------------------------
  section("Cleanup");
  await relay.jobs.cancel(directJob.id);
  await relay.jobs.deletePermanent(directJob.id);
  console.log(`Deleted direct test job ${directJob.id}`);

  if (latestRun.status !== "RUNNING" && latestRun.status !== "PENDING") {
    await relay.workflows.delete(workflow.id);
    console.log(`Deleted test workflow ${workflow.id}`);
  } else {
    console.log(`Workflow run still in progress (status=${latestRun.status}) - leaving workflow ${workflow.id} in place.`);
  }

  const nlJobFinal = await relay.jobs.get(nlJob.id);
  if (nlJobFinal.status === "COMPLETED" || nlJobFinal.status === "FAILED") {
    await relay.jobs.deletePermanent(nlJob.id);
    console.log(`Deleted natural-language test job ${nlJob.id}`);
  } else {
    await relay.jobs.cancel(nlJob.id);
    await relay.jobs.deletePermanent(nlJob.id);
    console.log(`Cancelled and deleted natural-language test job ${nlJob.id}`);
  }

  section("ALL STEPS PASSED");
}

main().catch((err) => {
  console.error("\nE2E TEST FAILED:", err);
  process.exit(1);
});
