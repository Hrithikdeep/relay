import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/database';
import { buildChatTools } from '../src/ai/chat/tools';

const BASE = process.env.LEAK_TEST_BASE_URL ?? 'http://localhost:3001/v1';

type Row = { router: string; request: string; expect: string; got: string; leaked: boolean; pass: boolean };
const rows: Row[] = [];

async function createKey(workspaceId: string, name: string): Promise<string> {
  const plaintext = `relay_sk_live_${crypto.randomBytes(32).toString('base64url')}`;
  await prisma.apiKey.create({
    data: {
      workspaceId,
      name,
      permissions: [],
      keyPrefix: plaintext.slice(0, 20),
      keyHash: await bcrypt.hash(plaintext, 10),
    },
  });
  return plaintext;
}

async function main() {
  const stamp = Date.now();
  const wsA = await prisma.workspace.create({ data: { name: 'Leak Test A', slug: `leak-test-a-${stamp}` } });
  const wsB = await prisma.workspace.create({ data: { name: 'Leak Test B', slug: `leak-test-b-${stamp}` } });

  try {
    const queueA = await prisma.queue.create({
      data: { workspaceId: wsA.id, name: 'secret-queue-a', description: 'A-secret-queue-description' },
    });
    const queueB = await prisma.queue.create({ data: { workspaceId: wsB.id, name: 'secret-queue-b' } });
    const workerA = await prisma.worker.create({ data: { workspaceId: wsA.id, name: 'secret-worker-a' } });
    const jobA = await prisma.job.create({
      data: { queueId: queueA.id, name: 'secret-job-a', payload: { secret: 'A-data' }, workerId: workerA.id },
    });
    await prisma.jobExecutionLog.create({
      data: {
        jobId: jobA.id,
        workerId: workerA.id,
        attempt: 1,
        status: 'FAILED',
        message: 'A-secret-log-message',
        startedAt: new Date(),
      },
    });
    await prisma.jobPrediction.create({
      data: { jobId: jobA.id, failureProbability: 0.5, modelVersion: 'v1', reasoning: 'A-secret-prediction' },
    });
    const webhookA = await prisma.webhook.create({
      data: { workspaceId: wsA.id, url: 'https://a-secret.example.com/hook', events: ['job.completed'], secret: 'A-secret-webhook-secret' },
    });
    const workflowA = await prisma.workflow.create({
      data: {
        workspaceId: wsA.id,
        name: 'secret-workflow-a',
        steps: [{ order: 1, queueId: queueA.id, name: 'A-secret-step' }],
      },
    });
    const runA = await prisma.workflowRun.create({ data: { workflowId: workflowA.id } });
    await prisma.aiErrorPattern.create({
      data: {
        workspaceId: wsA.id,
        queueId: queueA.id,
        signature: `A-sig-${stamp}`,
        errorType: 'A-secret-error-type',
        pattern: 'A-secret-error-pattern',
        confidence: 0.9,
      },
    });
    const convA = await prisma.conversation.create({
      data: {
        workspaceId: wsA.id,
        title: 'A-secret-conversation',
        messages: { create: [{ role: 'user', content: 'A-secret-message' }] },
      },
    });

    const keyA = await createKey(wsA.id, 'a-secret-key');
    const keyB = await createKey(wsB.id, 'b-key');
    const apiKeyA = await prisma.apiKey.findFirstOrThrow({ where: { workspaceId: wsA.id } });

    const markers = [
      wsA.id,
      queueA.id,
      workerA.id,
      jobA.id,
      webhookA.id,
      workflowA.id,
      runA.id,
      convA.id,
      apiKeyA.id,
      apiKeyA.keyPrefix,
      'secret-queue-a',
      'secret-worker-a',
      'secret-job-a',
      'secret-workflow-a',
      'A-data',
      'A-secret',
      'a-secret.example.com',
      'a-secret-key',
      'Leak Test A',
      'leak-test-a-',
    ];

    function scan(body: string, supplied: string): string[] {
      return markers.filter((m) => body.includes(m) && !supplied.includes(m));
    }

    async function http(
      router: string,
      method: string,
      path: string,
      expect: 'list' | 'denied',
      body?: unknown,
      key = keyB
    ): Promise<void> {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      const leaks = scan(text, `${path} ${body === undefined ? '' : JSON.stringify(body)}`);
      const denied = res.status >= 400;
      const statusOk = expect === 'list' ? res.status === 200 : denied;
      rows.push({
        router,
        request: `${method} ${path}${body === undefined ? '' : ' ' + JSON.stringify(body).slice(0, 40)}`,
        expect: expect === 'list' ? '200, no A data' : '4xx',
        got: String(res.status),
        leaked: leaks.length > 0,
        pass: statusOk && leaks.length === 0,
      });
      if (leaks.length > 0) rows[rows.length - 1].got += ` LEAK:${leaks.slice(0, 3).join(',')}`;
    }

    // ---- Controls: prove the harness can see data when it should
    const control = async (label: string, key: string, mustContain: string) => {
      const res = await fetch(`${BASE}/queues`, { headers: { 'x-api-key': key } });
      const text = await res.text();
      rows.push({
        router: 'control',
        request: label,
        expect: `200, contains ${mustContain}`,
        got: String(res.status),
        leaked: false,
        pass: res.status === 200 && text.includes(mustContain),
      });
    };
    await control("GET /queues with A's own key", keyA, 'secret-queue-a');
    await control("GET /queues with B's own key", keyB, 'secret-queue-b');

    // ---- List endpoints (B's key)
    await http('queues', 'GET', '/queues', 'list');
    await http('jobs', 'GET', '/jobs', 'list');
    await http('jobs', 'GET', `/jobs?queueId=${queueA.id}`, 'list');
    await http('jobs', 'GET', '/jobs?search=secret-job-a', 'list');
    await http('workers', 'GET', '/workers', 'list');
    await http('webhooks', 'GET', '/webhooks', 'list');
    await http('ai', 'GET', '/ai/error-patterns', 'list');
    await http('ai', 'GET', '/ai/predictions', 'list');
    await http('ai', 'GET', '/ai/insights', 'list');
    await http('aiChat', 'GET', '/ai/conversations', 'list');
    await http('apiKeys', 'GET', '/api-keys', 'list');
    await http('logs', 'GET', '/logs', 'list');
    await http('logs', 'GET', '/logs?search=A-secret-log-message', 'list');
    await http('logs', 'GET', `/logs?queueId=${queueA.id}`, 'list');
    await http('workflows', 'GET', '/workflows', 'list');
    await http('workspace', 'GET', '/workspace', 'list');

    // ---- Detail endpoints addressed at A's ids directly
    await http('jobs', 'GET', `/jobs/${jobA.id}`, 'denied');
    await http('queues', 'GET', `/queues/${queueA.id}/stats`, 'denied');
    await http('queues', 'GET', '/queues/secret-queue-a/stats', 'denied');
    await http('workers', 'GET', `/workers/${workerA.id}`, 'denied');
    await http('workflows', 'GET', `/workflows/${workflowA.id}`, 'denied');
    await http('workflows', 'GET', `/workflows/${workflowA.id}/runs`, 'denied');
    await http('workflows', 'GET', `/workflows/runs/${runA.id}`, 'denied');
    await http('aiChat', 'GET', `/ai/conversations/${convA.id}`, 'denied');

    // ---- Write endpoints addressed at A's resources
    await http('jobs', 'POST', '/jobs', 'denied', { queueId: queueA.id, name: 'injected-by-b', payload: {} });
    await http('jobs', 'POST', `/jobs/${jobA.id}/replay`, 'denied');
    await http('jobs', 'DELETE', `/jobs/${jobA.id}`, 'denied');
    await http('jobs', 'DELETE', `/jobs/${jobA.id}/permanent`, 'denied');
    await http('queues', 'POST', '/queues/secret-queue-a/pause', 'denied');
    await http('queues', 'POST', `/queues/${queueA.id}/pause`, 'denied');
    await http('queues', 'POST', '/queues/secret-queue-a/resume', 'denied');
    await http('workers', 'PATCH', `/workers/${workerA.id}/heartbeat`, 'denied', {});
    await http('workers', 'DELETE', `/workers/${workerA.id}`, 'denied');
    await http('webhooks', 'DELETE', `/webhooks/${webhookA.id}`, 'denied');
    await http('apiKeys', 'DELETE', `/api-keys/${apiKeyA.id}`, 'denied');
    await http('workflows', 'POST', '/workflows', 'denied', {
      name: 'injected-by-b',
      steps: [{ order: 1, queueId: queueA.id, name: 'x' }],
    });
    await http('workflows', 'POST', `/workflows/${workflowA.id}/run`, 'denied');
    await http('workflows', 'DELETE', `/workflows/${workflowA.id}`, 'denied');
    await http('ai', 'POST', '/ai/jobs/natural-language', 'denied', {
      description: 'send an email to secret-queue-a',
    });

    // ---- AI chat tools, run with workspace B's context
    const tools = buildChatTools(wsB.id) as Record<
      string,
      { execute?: (input: unknown, options: unknown) => Promise<unknown> }
    >;
    const callTool = async (name: string, input: Record<string, unknown>) => {
      const execute = tools[name]?.execute;
      let out: unknown;
      try {
        out = execute ? await execute(input, { toolCallId: 'leak-test', messages: [] }) : 'tool missing';
      } catch (e) {
        out = { thrown: String(e) };
      }
      const text = JSON.stringify(out);
      const leaks = scan(text, JSON.stringify(input));
      rows.push({
        router: 'aiChat tool',
        request: `${name}(${JSON.stringify(input).slice(0, 48)})`,
        expect: 'not found / no A data',
        got: leaks.length ? `LEAK:${leaks.slice(0, 3).join(',')}` : text.slice(0, 40),
        leaked: leaks.length > 0,
        pass: leaks.length === 0 && Boolean(execute) && !text.includes('"thrown"'),
      });
    };
    await callTool('getQueues', {});
    await callTool('getQueueStats', { queueIdOrName: 'secret-queue-a' });
    await callTool('getQueueStats', { queueIdOrName: queueA.id });
    await callTool('getJobs', { page: 1, pageSize: 10 });
    await callTool('getJobs', { search: 'secret-job-a', page: 1, pageSize: 10 });
    await callTool('getJobs', { queueId: queueA.id, page: 1, pageSize: 10 });
    await callTool('getJob', { jobId: jobA.id });
    await callTool('getWorkers', {});
    await callTool('getAiInsights', {});
    await callTool('getAiPredictions', {});
    await callTool('getErrorPatterns', {});
    await callTool('createJob', { queueId: queueA.id, name: 'injected-by-b-tool', payload: {}, priority: 0, maxAttempts: 3 });
    await callTool('replayJob', { jobId: jobA.id });
    await callTool('cancelJob', { jobId: jobA.id });
    await callTool('pauseQueue', { queueIdOrName: 'secret-queue-a' });
    await callTool('resumeQueue', { queueIdOrName: 'secret-queue-a' });

    // ---- Integrity: none of the write attempts changed A's data
    const [jobNow, queueNow, workerNow, webhookNow, keyNow, wfNow, jobCount, wfCount] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobA.id } }),
      prisma.queue.findUnique({ where: { id: queueA.id } }),
      prisma.worker.findUnique({ where: { id: workerA.id } }),
      prisma.webhook.findUnique({ where: { id: webhookA.id } }),
      prisma.apiKey.findUnique({ where: { id: apiKeyA.id } }),
      prisma.workflow.findUnique({ where: { id: workflowA.id } }),
      prisma.job.count({ where: { queueId: queueA.id } }),
      prisma.workflow.count({ where: { workspaceId: wsA.id } }),
    ]);
    const intact =
      jobNow?.status === 'PENDING' &&
      queueNow?.isPaused === false &&
      !!workerNow &&
      !!webhookNow &&
      keyNow?.revokedAt === null &&
      !!wfNow &&
      jobCount === 1 &&
      wfCount === 1 &&
      (await prisma.job.count({ where: { queue: { workspaceId: wsB.id } } })) === 0;
    rows.push({
      router: 'integrity',
      request: "A's job/queue/worker/webhook/key/workflow after all B writes",
      expect: 'unchanged, nothing created in A or B',
      got: intact ? 'unchanged' : 'MODIFIED',
      leaked: !intact,
      pass: intact,
    });
    void queueB;
  } finally {
    await prisma.workspace.deleteMany({ where: { id: { in: [wsA.id, wsB.id] } } });
    const left = await prisma.workspace.count({ where: { id: { in: [wsA.id, wsB.id] } } });
    console.log(`\nCleanup: deleted test workspaces (remaining rows: ${left})`);
  }

  const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));
  console.log(`\n${pad('#', 3)} ${pad('RESULT', 6)} ${pad('ROUTER', 12)} ${pad('REQUEST', 72)} ${pad('EXPECTED', 30)} GOT`);
  rows.forEach((r, i) =>
    console.log(
      `${pad(String(i + 1), 3)} ${pad(r.pass ? 'PASS' : 'FAIL', 6)} ${pad(r.router, 12)} ${pad(r.request, 72)} ${pad(r.expect, 30)} ${r.got}`
    )
  );
  const failed = rows.filter((r) => !r.pass);
  console.log(`\n${rows.length - failed.length}/${rows.length} passed, ${failed.length} failed, ${rows.filter((r) => r.leaked).length} leaked`);
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((err) => {
    console.error('Leak test crashed:', err);
    process.exitCode = 2;
  })
  .finally(() => prisma.$disconnect());
