import crypto from 'crypto';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { AiErrorPattern } from '@prisma/client';
import { getOrCreateQueue } from '../../core/QueueManager';
import { config } from '../../config/env';
import { prisma } from '../../database';
import { logger } from '../../utils/logger';

export interface ErrorAnalysis {
  rootCause: string;
  errorType: string;
  suggestedFix: string;
  fixParameters: Record<string, unknown>;
  confidence: number;
  isTransient: boolean;
  recommendation: string;
}

export interface AutoFixResult {
  applied: boolean;
  reason: string;
}

const AUTO_FIX_CONFIDENCE_THRESHOLD = 0.8;

const DEFAULT_ANALYSIS: ErrorAnalysis = {
  rootCause: 'Unknown - AI analysis unavailable',
  errorType: 'unknown',
  suggestedFix: 'Manual investigation required',
  fixParameters: {},
  confidence: 0,
  isTransient: false,
  recommendation: 'Review the error manually; automated analysis could not be performed.',
};

const analysisPrompt = PromptTemplate.fromTemplate(
  `You are an AI error-analysis system for a background job platform. Analyze the failed job execution below and respond with ONLY a raw JSON object (no markdown, no code fences, no extra text) matching exactly this shape:
{{
  "rootCause": short string describing the likely root cause,
  "errorType": short machine-readable category, e.g. "timeout", "validation", "network", "auth", "rate_limit", "unknown",
  "suggestedFix": short human-readable suggested fix,
  "fixParameters": a JSON object of concrete parameters to apply the fix (e.g. {{"retryDelayMs": 5000}}), or {{}} if none,
  "confidence": number between 0 and 1,
  "isTransient": boolean, true if retrying is likely to succeed without any changes,
  "recommendation": short string with the recommended next action
}}

Job name: {jobName}
Attempt number: {attemptNumber}
Error message: {errorMessage}
Stack trace: {stackTrace}`
);

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function parseAnalysisResponse(raw: string): ErrorAnalysis {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();

  const data = JSON.parse(cleaned) as Partial<ErrorAnalysis>;

  return {
    rootCause: typeof data.rootCause === 'string' ? data.rootCause : DEFAULT_ANALYSIS.rootCause,
    errorType: typeof data.errorType === 'string' ? data.errorType : DEFAULT_ANALYSIS.errorType,
    suggestedFix:
      typeof data.suggestedFix === 'string' ? data.suggestedFix : DEFAULT_ANALYSIS.suggestedFix,
    fixParameters:
      typeof data.fixParameters === 'object' && data.fixParameters !== null
        ? (data.fixParameters as Record<string, unknown>)
        : {},
    confidence: clamp(Number(data.confidence), 0, 1, DEFAULT_ANALYSIS.confidence),
    isTransient:
      typeof data.isTransient === 'boolean' ? data.isTransient : DEFAULT_ANALYSIS.isTransient,
    recommendation:
      typeof data.recommendation === 'string' ? data.recommendation : DEFAULT_ANALYSIS.recommendation,
  };
}

/**
 * Normalizes an error message (stripping ids/numbers) and hashes it, so that
 * recurring instances of "the same" error collapse onto one AiErrorPattern row.
 */
export function getErrorFingerprint(errorMessage: string): string {
  const normalized = errorMessage
    .toLowerCase()
    .replace(/[0-9a-f]{8,}/g, '<id>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim();

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function analyzeError(
  jobName: string,
  errorMessage: string,
  stackTrace: string | undefined,
  attemptNumber: number,
  workspaceId: string
): Promise<ErrorAnalysis> {
  if (!config.openai.apiKey) {
    logger.info(
      `Skipping AI error analysis for "${jobName}" (workspace ${workspaceId}) - no OpenAI API key configured`
    );
    return DEFAULT_ANALYSIS;
  }

  try {
    const model = new ChatOpenAI({
      apiKey: config.openai.apiKey,
      model: config.openai.model,
      temperature: 0,
    });

    const chain = analysisPrompt.pipe(model);

    const response = await chain.invoke({
      jobName,
      errorMessage,
      stackTrace: stackTrace ?? 'not available',
      attemptNumber,
    });

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return parseAnalysisResponse(content);
  } catch (error) {
    logger.error(`AI error analysis failed for "${jobName}":`, error);
    return DEFAULT_ANALYSIS;
  }
}

export async function analyzeAndStorePattern(
  jobName: string,
  errorMessage: string,
  stackTrace: string | undefined,
  attemptNumber: number,
  workspaceId: string,
  queueId?: string
): Promise<{ analysis: ErrorAnalysis; pattern: AiErrorPattern }> {
  const analysis = await analyzeError(jobName, errorMessage, stackTrace, attemptNumber, workspaceId);
  const signature = getErrorFingerprint(errorMessage);

  const existing = await prisma.aiErrorPattern.findUnique({
    where: { workspaceId_signature: { workspaceId, signature } },
  });

  const pattern = existing
    ? await prisma.aiErrorPattern.update({
        where: { id: existing.id },
        data: {
          // Cumulative/historical - never overwritten by a new analysis.
          occurrenceCount: { increment: 1 },
          lastSeenAt: new Date(),
          // AI-analysis-derived - always refreshed to the latest result, so a
          // stale fallback (e.g. "unknown"/"AI analysis unavailable" from a
          // prior failed call) doesn't linger once a real analysis succeeds.
          errorType: analysis.errorType,
          pattern: analysis.rootCause,
          confidence: analysis.confidence,
          suggestedFix: analysis.suggestedFix,
        },
      })
    : await prisma.aiErrorPattern.create({
        data: {
          workspaceId,
          queueId,
          signature,
          errorType: analysis.errorType,
          pattern: analysis.rootCause,
          confidence: analysis.confidence,
          suggestedFix: analysis.suggestedFix,
        },
      });

  return { analysis, pattern };
}

/**
 * "Applying" a fix means resetting the job so it gets reprocessed - there is no
 * generic code-patching engine, so this only acts when the analysis is confident
 * the failure was transient (retrying with no changes is expected to succeed).
 */
export async function applyAutoFix(jobId: string, analysis: ErrorAnalysis): Promise<AutoFixResult> {
  if (analysis.confidence <= AUTO_FIX_CONFIDENCE_THRESHOLD || !analysis.isTransient) {
    return {
      applied: false,
      reason: `Auto-fix threshold not met (confidence=${analysis.confidence}, isTransient=${analysis.isTransient}); requires confidence > ${AUTO_FIX_CONFIDENCE_THRESHOLD} and isTransient=true.`,
    };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { queue: { select: { name: true } } },
  });

  if (!job) {
    return { applied: false, reason: `Job ${jobId} not found.` };
  }

  const queue = getOrCreateQueue(job.queue.name);
  const bullJob = await queue.getJob(jobId);

  if (!bullJob) {
    return {
      applied: false,
      reason: `No BullMQ job found for ${jobId}; cannot retry - it may never have been enqueued.`,
    };
  }

  const stateBefore = await bullJob.getState();

  if (stateBefore !== 'completed' && stateBefore !== 'failed') {
    return {
      applied: false,
      reason: `Job ${jobId} is already in BullMQ state "${stateBefore}" (not finished); no retry needed.`,
    };
  }

  try {
    // Uses BullMQ's own retry mechanism (moves the existing job back to
    // waiting) instead of re-adding it under the same id, which BullMQ
    // silently no-ops for a job it already has a record of.
    await bullJob.retry(stateBefore);

    const stateAfter = await bullJob.getState();

    if (stateAfter === 'completed' || stateAfter === 'failed') {
      return {
        applied: false,
        reason: `Retry was requested but job ${jobId} is still in a finished state ("${stateAfter}") afterward; it did not actually re-enter the queue.`,
      };
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        error: null,
        failedAt: null,
      },
    });

    logger.info(
      `Auto-fix applied: job ${jobId} re-entered BullMQ state "${stateAfter}" (${analysis.errorType}, confidence ${analysis.confidence})`
    );

    return {
      applied: true,
      reason: `Job requeued automatically based on suggested fix: ${analysis.suggestedFix}`,
    };
  } catch (error) {
    logger.error(`Auto-fix failed to retry job ${jobId}:`, error);
    return {
      applied: false,
      reason: 'Auto-fix conditions were met, but retrying the job via BullMQ failed.',
    };
  }
}
