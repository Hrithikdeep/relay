import { JobStatus, PrismaClient, WorkerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const SEED_API_KEY = 'relay_test_key_123';

async function main() {
  await prisma.workspace.deleteMany({ where: { slug: 'test-workspace' } });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Test Workspace',
      slug: 'test-workspace',
    },
  });

  await prisma.apiKey.create({
    data: {
      workspaceId: workspace.id,
      name: 'Default',
      keyPrefix: SEED_API_KEY.slice(0, 20),
      keyHash: await bcrypt.hash(SEED_API_KEY, 10),
      permissions: [],
    },
  });

  const [emails, payments, imageProcessing, analytics] = await Promise.all([
    prisma.queue.create({
      data: {
        workspaceId: workspace.id,
        name: 'emails',
        description: 'Transactional and marketing email delivery',
      },
    }),
    prisma.queue.create({
      data: {
        workspaceId: workspace.id,
        name: 'payments',
        description: 'Payment processing and reconciliation',
      },
    }),
    prisma.queue.create({
      data: {
        workspaceId: workspace.id,
        name: 'image-processing',
        description: 'Image resizing and transformation',
      },
    }),
    prisma.queue.create({
      data: {
        workspaceId: workspace.id,
        name: 'analytics',
        description: 'Usage analytics and reporting',
      },
    }),
  ]);

  const worker = await prisma.worker.create({
    data: {
      workspaceId: workspace.id,
      name: 'worker-dev-1',
      hostname: 'localhost',
      status: WorkerStatus.ONLINE,
      concurrency: 5,
      version: '0.1.0',
      lastHeartbeatAt: new Date(),
    },
  });

  await prisma.job.createMany({
    data: [
      {
        queueId: emails.id,
        name: 'send-welcome-email',
        payload: { to: 'new-user@example.com', template: 'welcome' },
        status: JobStatus.PENDING,
      },
      {
        queueId: emails.id,
        workerId: worker.id,
        name: 'send-password-reset',
        payload: { to: 'user@example.com', template: 'password-reset' },
        status: JobStatus.COMPLETED,
        attempts: 1,
        startedAt: minutesAgo(10),
        completedAt: minutesAgo(9),
        result: { messageId: 'msg_abc123', delivered: true },
      },
      {
        queueId: emails.id,
        name: 'send-newsletter',
        payload: { segment: 'weekly-digest' },
        status: JobStatus.FAILED,
        attempts: 3,
        maxAttempts: 3,
        error: 'SMTP connection timed out after 3 attempts',
        startedAt: minutesAgo(30),
        failedAt: minutesAgo(28),
      },
      {
        queueId: payments.id,
        workerId: worker.id,
        name: 'process-stripe-charge',
        payload: { amount: 4999, currency: 'usd', customerId: 'cus_123' },
        status: JobStatus.ACTIVE,
        attempts: 1,
        startedAt: minutesAgo(1),
      },
      {
        queueId: payments.id,
        name: 'process-refund',
        payload: { chargeId: 'ch_456', amount: 1999 },
        status: JobStatus.PENDING,
        priority: 1,
      },
      {
        queueId: payments.id,
        workerId: worker.id,
        name: 'reconcile-invoice',
        payload: { invoiceId: 'inv_789' },
        status: JobStatus.COMPLETED,
        attempts: 1,
        startedAt: minutesAgo(60),
        completedAt: minutesAgo(59),
        result: { reconciled: true, discrepancy: 0 },
      },
      {
        queueId: imageProcessing.id,
        name: 'resize-thumbnail',
        payload: { imageUrl: 'https://cdn.example.com/img/1.png', sizes: [128, 256] },
        status: JobStatus.PENDING,
      },
      {
        queueId: imageProcessing.id,
        name: 'generate-og-image',
        payload: { pageUrl: 'https://relay.dev/blog/launch' },
        status: JobStatus.FAILED,
        attempts: 2,
        error: 'Rendering engine crashed: out of memory',
        startedAt: minutesAgo(15),
        failedAt: minutesAgo(14),
      },
      {
        queueId: analytics.id,
        workerId: worker.id,
        name: 'aggregate-daily-stats',
        payload: { date: new Date().toISOString().slice(0, 10) },
        status: JobStatus.ACTIVE,
        attempts: 1,
        startedAt: minutesAgo(2),
      },
      {
        queueId: analytics.id,
        workerId: worker.id,
        name: 'compute-churn-score',
        payload: { cohort: '2026-08' },
        status: JobStatus.COMPLETED,
        attempts: 1,
        startedAt: minutesAgo(120),
        completedAt: minutesAgo(118),
        result: { churnRate: 0.032 },
      },
    ],
  });

  console.log('Seed complete:');
  console.log(`  Workspace: ${workspace.name} (apiKey: ${SEED_API_KEY})`);
  console.log('  Queues: emails, payments, image-processing, analytics');
  console.log(`  Worker: ${worker.name}`);
  console.log('  Jobs: 10 total (3 pending, 2 active, 3 completed, 2 failed)');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
