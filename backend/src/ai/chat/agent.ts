import { streamText, stepCountIs, type ModelMessage, type ToolSet } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { Response } from 'express';
import { prisma } from '../../database';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { buildChatTools, DESTRUCTIVE_TOOL_NAMES } from './tools';

const openaiProvider = createOpenAI({ apiKey: config.openai.apiKey });

const MAX_STEPS = 8;

const SYSTEM_PROMPT = `You are Relay AI, an assistant built exclusively for the Relay background job platform. Your ONLY job is to help with this Relay workspace - its jobs, queues, workers, workspace configuration, and error analysis - using the tools provided.

For any question about real system state (jobs, queues, workers, errors, current date/time, counts, statuses), you MUST use the relevant tool rather than guessing or relying on your training knowledge.

You do NOT answer anything outside Relay and its own real capabilities - no general knowledge, no unrelated topics, no math, no trivia, no writing tasks, nothing. If a question is not about this Relay workspace or what Relay AI itself can do, decline in one short sentence and redirect to what you can actually help with. This applies no matter how simple, harmless, or well-known the answer might seem - if it isn't Relay, you don't answer it.

You have tools to inspect real, live data (jobs, queues, workers, AI insights, predictions, error patterns, the current date/time) and to take real actions (create/replay jobs, resume queues, cancel jobs, pause queues). Every tool call is a genuine operation against the real database - never claim to have done something without actually calling the corresponding tool.

When investigating a failure, call getJob to see its executionLogs and error details before answering. When asked what's broken, call getErrorPatterns and/or getAiInsights and ground your answer in the real numbers returned. Be concise and reference concrete data (job ids, counts, error messages) rather than vague summaries.

A question about Relay itself - what it is, how the job/queue/worker pipeline works, or what you (Relay AI) can help with - is a real, in-scope Relay question. Answer these directly, describing only your actual real capabilities and the tools available to you; do not decline them as if they were unrelated topics.`;

// Kept as a plain Record (not typed against the full generated
// ToolApprovalConfiguration<TOOLS, ...>) - instantiating that type over an
// 11-tool set with rich zod schemas is what pushed tsc's type-checker OOM.
// Structurally this still satisfies streamText's toolApproval param.
const TOOL_APPROVAL: Record<string, 'user-approval'> = Object.fromEntries(
  DESTRUCTIVE_TOOL_NAMES.map((name) => [name, 'user-approval'])
);

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function getOrCreateConversation(
  workspaceId: string,
  conversationId: string | undefined,
  firstMessage: string
) {
  if (conversationId) {
    const existing = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
    if (existing) return existing;
  }
  return prisma.conversation.create({
    data: { workspaceId, title: firstMessage.slice(0, 80) },
  });
}

/**
 * Reconstructs the exact AI SDK ModelMessage[] history for a conversation.
 * Message.toolCalls/toolResults store the SDK's own message content arrays
 * verbatim (not a hand-rolled shape), so round-tripping through them -
 * including an unresolved tool-approval-request from a paused turn - is
 * lossless and requires no special-casing here.
 */
export async function loadModelMessages(conversationId: string): Promise<ModelMessage[]> {
  const rows = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });

  return rows.map((row): ModelMessage => {
    if (row.role === 'user') {
      return { role: 'user', content: row.content };
    }
    if (row.role === 'assistant') {
      const toolParts = (row.toolCalls as unknown[] | null) ?? [];
      if (toolParts.length === 0) {
        return { role: 'assistant', content: row.content };
      }
      const content = row.content ? [{ type: 'text', text: row.content }, ...toolParts] : toolParts;
      return { role: 'assistant', content: content as never };
    }
    return { role: 'tool', content: (row.toolResults as never) ?? [] };
  });
}

function summarizeAssistantContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: 'text'; text: string } => p?.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return '';
}

function summarizeToolContent(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content
    .map((p) => {
      if (p?.type === 'tool-approval-response') {
        return `approval ${p.approved ? 'granted' : 'denied'} for ${p.approvalId}`;
      }
      if (p?.type === 'tool-result') {
        return `${p.toolName} -> ${JSON.stringify(p.output).slice(0, 200)}`;
      }
      return JSON.stringify(p).slice(0, 200);
    })
    .join('; ');
}

const TOOL_ACTIVITY_PART_TYPES = new Set(['tool-call', 'tool-approval-request']);

/**
 * Prisma's @updatedAt only fires when a row is itself updated - creating
 * Message rows never touches their parent Conversation, so without this,
 * GET /v1/ai/conversations (sorted by updatedAt) would never reflect real
 * activity after the conversation's initial creation.
 */
async function touchConversation(conversationId: string): Promise<void> {
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
}

async function persistResponseMessages(conversationId: string, messages: readonly ModelMessage[]): Promise<void> {
  for (const message of messages) {
    if (message.role === 'assistant') {
      const parts = Array.isArray(message.content) ? message.content : [];
      const toolActivity = parts.filter((p) => TOOL_ACTIVITY_PART_TYPES.has((p as { type: string }).type));
      await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: summarizeAssistantContent(message.content),
          toolCalls: toolActivity.length > 0 ? (toolActivity as never) : undefined,
        },
      });
    } else if (message.role === 'tool') {
      await prisma.message.create({
        data: {
          conversationId,
          role: 'tool',
          content: summarizeToolContent(message.content) || 'Tool result',
          toolResults: message.content as never,
        },
      });
    }
  }
  if (messages.length > 0) {
    await touchConversation(conversationId);
  }
}

/** The pending approval, if the model's latest content includes an unresolved tool-approval-request. */
function findPendingApproval(content: Array<{ type: string; [key: string]: unknown }>) {
  const approvalPart = content.find((p) => p.type === 'tool-approval-request') as
    | { type: 'tool-approval-request'; approvalId: string; toolCallId: string; reason?: string }
    | undefined;
  if (!approvalPart) return null;

  const toolCallPart = content.find(
    (p) => p.type === 'tool-call' && (p as { toolCallId: string }).toolCallId === approvalPart.toolCallId
  ) as { toolName: string; input: unknown } | undefined;

  return {
    approvalId: approvalPart.approvalId,
    toolCallId: approvalPart.toolCallId,
    toolName: toolCallPart?.toolName ?? 'unknown',
    input: toolCallPart?.input ?? null,
  };
}

interface RunTurnResult {
  conversationId: string;
  pendingApproval: ReturnType<typeof findPendingApproval>;
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}

/**
 * Runs (or resumes) one agentic turn: streams the model's output as SSE to
 * `res`, lets it call tools across up to MAX_STEPS steps, and persists every
 * real response message once the stream ends - whether that's a final
 * answer or a pause for human approval.
 */
async function runAndStream(
  res: Response,
  workspaceId: string,
  conversationId: string,
  messages: ModelMessage[]
): Promise<RunTurnResult> {
  const tools = buildChatTools(workspaceId);

  // Explicit <ToolSet> type argument: without it, tsc infers TOOLS from the
  // 11-tool literal shape and re-derives it through streamText's entire
  // (very large) generic return type, which took 10+ minutes and multiple
  // GB of heap. Pinning it to the already-widened ToolSet keeps the
  // assignability check cheap; runtime behavior is unchanged.
  const result = streamText<ToolSet>({
    model: openaiProvider(config.openai.model),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    toolApproval: TOOL_APPROVAL,
  });

  for await (const part of result.stream) {
    if (part.type === 'text-delta') {
      sseWrite(res, 'text', { delta: part.text });
    } else if (part.type === 'tool-call') {
      sseWrite(res, 'tool-call', { toolName: part.toolName, input: part.input });
    } else if (part.type === 'tool-result') {
      sseWrite(res, 'tool-result', { toolName: part.toolName, output: part.output });
    } else if (part.type === 'error') {
      sseWrite(res, 'error', { message: part.error instanceof Error ? part.error.message : String(part.error) });
    }
  }

  const responseMessages = await result.responseMessages;
  await persistResponseMessages(conversationId, responseMessages);

  // The approval-request part's sibling tool-call lives alongside it in the
  // assistant *response message* (input-oriented shape) - result.content
  // uses a differently-shaped, self-contained approval part instead, so it
  // must be read from here, not from result.content.
  const lastAssistantMessage = [...responseMessages].reverse().find((m) => m.role === 'assistant');
  const pendingApproval =
    lastAssistantMessage && Array.isArray(lastAssistantMessage.content)
      ? findPendingApproval(lastAssistantMessage.content as never)
      : null;
  const usage = await result.usage;

  if (pendingApproval) {
    sseWrite(res, 'tool-approval-request', { conversationId, ...pendingApproval });
    logger.info(
      `Chat turn paused for approval: ${pendingApproval.toolName} (conversation ${conversationId})`
    );
  } else {
    sseWrite(res, 'done', { conversationId });
  }

  logger.info(
    `Chat turn usage (conversation ${conversationId}): input=${usage.inputTokens} output=${usage.outputTokens} total=${usage.totalTokens}`
  );

  return { conversationId, pendingApproval, usage };
}

export async function startChatTurn(
  res: Response,
  workspaceId: string,
  conversationId: string | undefined,
  userMessage: string
): Promise<RunTurnResult> {
  const conversation = await getOrCreateConversation(workspaceId, conversationId, userMessage);

  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'user', content: userMessage },
  });

  const messages = await loadModelMessages(conversation.id);

  return runAndStream(res, workspaceId, conversation.id, messages);
}

export async function confirmChatTool(
  res: Response,
  workspaceId: string,
  conversationId: string,
  toolCallId: string,
  approved: boolean
): Promise<RunTurnResult> {
  const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, workspaceId } });
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found in this workspace.`);
  }

  const messages = await loadModelMessages(conversationId);

  const pendingAssistantMessage = [...messages].reverse().find(
    (m) =>
      m.role === 'assistant' &&
      Array.isArray(m.content) &&
      m.content.some((p) => (p as { type: string }).type === 'tool-approval-request')
  );
  const approvalPart = Array.isArray(pendingAssistantMessage?.content)
    ? (pendingAssistantMessage.content.find(
        (p) =>
          (p as { type: string }).type === 'tool-approval-request' &&
          (p as { toolCallId: string }).toolCallId === toolCallId
      ) as { approvalId: string } | undefined)
    : undefined;

  if (!approvalPart) {
    throw new Error(`No pending approval found for toolCallId ${toolCallId} in conversation ${conversationId}.`);
  }

  const approvalResponseMessage: ModelMessage = {
    role: 'tool',
    content: [
      {
        type: 'tool-approval-response',
        approvalId: approvalPart.approvalId,
        approved,
        reason: approved ? undefined : 'User rejected the action.',
      },
    ] as never,
  };

  await persistResponseMessages(conversationId, [approvalResponseMessage]);

  const fullMessages = [...messages, approvalResponseMessage];

  return runAndStream(res, workspaceId, conversationId, fullMessages);
}
