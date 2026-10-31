import { prisma } from '../database';
import { logger } from '../utils/logger';

export const AI_CALLS_PER_MONTH = 200;

export const AI_LIMIT_MESSAGE = `Monthly AI usage limit reached (${AI_CALLS_PER_MONTH} calls). AI features resume at the start of next month.`;

export interface AiUsage {
  used: number;
  limit: number;
  resetsAt: string;
}

// What the workspace has used in the current UTC month. The stored counter is
// only rolled over when an AI call next claims one, so a counter whose period
// started in an earlier month is reported as 0 here - the same view the claim
// query itself takes.
export function computeAiUsage(storedUsed: number, periodStart: Date, now: Date = new Date()): AiUsage {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

  return {
    used: periodStart.getTime() < monthStart ? 0 : storedUsed,
    limit: AI_CALLS_PER_MONTH,
    resetsAt: new Date(nextMonthStart).toISOString(),
  };
}

// Atomically claims one AI call for the workspace. The counter lives on the
// workspace row and rolls over at the start of each UTC month, so the
// check, the reset and the increment happen in a single UPDATE and
// concurrent callers can't overshoot the cap. Returns false once the
// workspace has used its allowance for the current month.
export async function reserveAiCall(workspaceId: string): Promise<boolean> {
  const claimed = await prisma.$executeRaw`
    UPDATE workspaces
    SET
      ai_calls_used = CASE
        WHEN ai_calls_period_start < date_trunc('month', now() AT TIME ZONE 'UTC') THEN 1
        ELSE ai_calls_used + 1
      END,
      ai_calls_period_start = CASE
        WHEN ai_calls_period_start < date_trunc('month', now() AT TIME ZONE 'UTC')
          THEN date_trunc('month', now() AT TIME ZONE 'UTC')
        ELSE ai_calls_period_start
      END
    WHERE id = ${workspaceId}
      AND (
        ai_calls_period_start < date_trunc('month', now() AT TIME ZONE 'UTC')
        OR ai_calls_used < ${AI_CALLS_PER_MONTH}
      )
  `;

  if (claimed === 0) {
    logger.warn(`AI usage cap (${AI_CALLS_PER_MONTH}/month) reached for workspace ${workspaceId}`);
    return false;
  }

  return true;
}
