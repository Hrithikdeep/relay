import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../database';
import { logger } from '../utils/logger';

export interface WebhookEventPayload {
  event: string;
  data: unknown;
  timestamp: string;
}

function signPayload(secret: string, serializedPayload: string): string {
  return crypto.createHmac('sha256', secret).update(serializedPayload).digest('hex');
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  body: WebhookEventPayload
): Promise<void> {
  const serialized = JSON.stringify(body);
  const signature = signPayload(secret, serialized);

  try {
    await axios.post(url, body, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Signature': signature,
        'X-Relay-Event': body.event,
      },
    });

    await prisma.webhook.update({
      where: { id: webhookId },
      data: { lastTriggeredAt: new Date() },
    });

    logger.info(`Webhook delivered: ${url} (${body.event})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Webhook delivery failed: ${url} (${body.event}) - ${message}`);
  }
}

export async function triggerWebhooks(
  workspaceId: string,
  event: string,
  data: unknown
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      workspaceId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  const body: WebhookEventPayload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  await Promise.all(
    webhooks.map((webhook) => deliverWebhook(webhook.id, webhook.url, webhook.secret, body))
  );
}
