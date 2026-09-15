"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  ChevronRight,
  Clock,
  History,
  Loader2,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ChatMessage, Conversation } from "@/lib/types";
import { formatRelativeTime } from "@/lib/format";
import { sendChatMessage, confirmChatTool, type ChatStreamHandlers } from "@/lib/aiChat";
import { useAiChatPanel } from "./AiChatContext";

interface UiToolActivity {
  id: string;
  toolName: string;
  input: unknown;
  output?: unknown;
  status: "running" | "done";
}

interface UiPendingApproval {
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
  status: "pending" | "submitting" | "approved" | "rejected";
}

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolActivity: UiToolActivity[];
  pendingApproval: UiPendingApproval | null;
  streaming: boolean;
}

const TOOL_LABELS: Record<string, (input: any) => string> = {
  getJob: (i) => `Looking up job ${shortId(i?.jobId)}`,
  getJobs: () => "Searching jobs",
  getQueues: () => "Checking queues",
  getQueueStats: (i) => `Checking queue "${i?.queueIdOrName ?? ""}"`,
  getWorkers: () => "Checking workers",
  getAiInsights: () => "Checking AI insights",
  getAiPredictions: () => "Checking predictions",
  getErrorPatterns: () => "Checking error patterns",
  createJob: (i) => `Creating job "${i?.name ?? ""}"`,
  replayJob: (i) => `Replaying job ${shortId(i?.jobId)}`,
  resumeQueue: (i) => `Resuming queue "${i?.queueIdOrName ?? ""}"`,
  cancelJob: (i) => `Cancelling job ${shortId(i?.jobId)}`,
  pauseQueue: (i) => `Pausing queue "${i?.queueIdOrName ?? ""}"`,
};

function shortId(id?: string): string {
  return id ? `${id.slice(0, 10)}...` : "";
}

function toolLabel(toolName: string, input: unknown): string {
  const fn = TOOL_LABELS[toolName];
  return fn ? fn(input as any) : `Running ${toolName}`;
}

function approvalDescription(toolName: string, input: any): string {
  if (toolName === "pauseQueue") return `Pause the "${input?.queueIdOrName ?? "queue"}" queue?`;
  if (toolName === "cancelJob") return `Cancel job ${shortId(input?.jobId)}?`;
  return `Run ${toolName}?`;
}

/** Reconstructs UI bubbles from real persisted history - see backend's Message
 * shape (agent.ts persistResponseMessages). Each assistant DB row already
 * maps 1:1 to one bubble; a following 'tool' row supplies real outputs or
 * resolves a pending approval onto the most recent assistant bubble. */
function reconstructMessages(rows: ChatMessage[]): UiMessage[] {
  const result: UiMessage[] = [];
  let lastAssistant: UiMessage | null = null;

  for (const row of rows) {
    if (row.role === "user") {
      lastAssistant = null;
      result.push({ id: row.id, role: "user", content: row.content, toolActivity: [], pendingApproval: null, streaming: false });
      continue;
    }

    if (row.role === "assistant") {
      const parts = (row.toolCalls ?? []) as any[];
      const toolActivity: UiToolActivity[] = parts
        .filter((p) => p.type === "tool-call")
        .map((p) => ({ id: p.toolCallId, toolName: p.toolName, input: p.input, status: "done" as const }));

      const approvalPart = parts.find((p) => p.type === "tool-approval-request");
      let pendingApproval: UiPendingApproval | null = null;
      if (approvalPart) {
        const callPart = parts.find((p) => p.type === "tool-call" && p.toolCallId === approvalPart.toolCallId);
        pendingApproval = {
          approvalId: approvalPart.approvalId,
          toolCallId: approvalPart.toolCallId,
          toolName: callPart?.toolName ?? "unknown",
          input: callPart?.input ?? null,
          status: "pending",
        };
      }

      const uiMsg: UiMessage = { id: row.id, role: "assistant", content: row.content, toolActivity, pendingApproval, streaming: false };
      result.push(uiMsg);
      lastAssistant = uiMsg;
      continue;
    }

    // role === "tool": attach real outputs / approval resolution to the
    // preceding assistant bubble rather than rendering its own bubble.
    const parts = (row.toolResults ?? []) as any[];
    for (const part of parts) {
      if (part.type === "tool-approval-response" && lastAssistant?.pendingApproval) {
        lastAssistant.pendingApproval = { ...lastAssistant.pendingApproval, status: part.approved ? "approved" : "rejected" };
      } else if (part.type === "tool-result" && lastAssistant) {
        lastAssistant.toolActivity = lastAssistant.toolActivity.map((a) =>
          a.id === part.toolCallId ? { ...a, output: part.output, status: "done" } : a
        );
      }
    }
  }

  return result;
}

export function AiChatPanel() {
  const { open, closePanel } = useAiChatPanel();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);

  const [view, setView] = useState<"chat" | "history">("chat");
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [failedJobChip, setFailedJobChip] = useState<{ label: string; message: string } | null>(null);
  const suggestionsFetched = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || suggestionsFetched.current) return;
    suggestionsFetched.current = true;

    api
      .getJobs({ status: "FAILED", pageSize: 1 })
      .then((res) => {
        const job = res.data[0];
        if (job) {
          setFailedJobChip({ label: `Why did job ${shortId(job.id)} fail?`, message: `Why did job ${job.id} fail?` });
        } else {
          setFailedJobChip({ label: "Have any jobs failed recently?", message: "Have any jobs failed recently, and why?" });
        }
      })
      .catch(() => setFailedJobChip({ label: "Have any jobs failed recently?", message: "Have any jobs failed recently, and why?" }));
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const hasBlockingApproval = messages.some(
    (m) => m.pendingApproval && (m.pendingApproval.status === "pending" || m.pendingApproval.status === "submitting")
  );

  function buildHandlers(assistantId: string): ChatStreamHandlers {
    return {
      onText: (delta) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)));
      },
      onToolCall: (toolName, toolInput) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, toolActivity: [...m.toolActivity, { id: crypto.randomUUID(), toolName, input: toolInput, status: "running" }] }
              : m
          )
        );
      },
      onToolResult: (toolName, output) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            const idx = [...m.toolActivity].reverse().findIndex((a) => a.toolName === toolName && a.status === "running");
            if (idx === -1) return m;
            const realIdx = m.toolActivity.length - 1 - idx;
            return { ...m, toolActivity: m.toolActivity.map((a, i) => (i === realIdx ? { ...a, status: "done", output } : a)) };
          })
        );
      },
      onApprovalRequest: (evt) => {
        setConversationId(evt.conversationId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  streaming: false,
                  pendingApproval: {
                    approvalId: evt.approvalId,
                    toolCallId: evt.toolCallId,
                    toolName: evt.toolName,
                    input: evt.input,
                    status: "pending",
                  },
                }
              : m
          )
        );
      },
      onDone: (convId) => {
        if (convId) setConversationId(convId);
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
      },
      onError: (message) => {
        setTurnError(message);
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
      },
    };
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || hasBlockingApproval) return;

    const userMsg: UiMessage = { id: crypto.randomUUID(), role: "user", content: trimmed, toolActivity: [], pendingApproval: null, streaming: false };
    const assistantId = crypto.randomUUID();
    const assistantMsg: UiMessage = { id: assistantId, role: "assistant", content: "", toolActivity: [], pendingApproval: null, streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setBusy(true);
    setTurnError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    await sendChatMessage({ message: trimmed, conversationId }, buildHandlers(assistantId), controller.signal);
    setBusy(false);
  }

  async function handleApproval(assistantId: string, approved: boolean) {
    const target = messages.find((m) => m.id === assistantId);
    const pending = target?.pendingApproval;
    if (!pending || !conversationId) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, streaming: true, pendingApproval: { ...pending, status: "submitting" } } : m))
    );
    setBusy(true);
    setTurnError(null);

    const handlers = buildHandlers(assistantId);
    const controller = new AbortController();
    abortRef.current = controller;

    await confirmChatTool(
      { conversationId, toolCallId: pending.toolCallId, approved },
      {
        ...handlers,
        onDone: (convId) => {
          if (convId) setConversationId(convId);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, streaming: false, pendingApproval: m.pendingApproval ? { ...m.pendingApproval, status: approved ? "approved" : "rejected" } : null }
                : m
            )
          );
        },
      },
      controller.signal
    );
    setBusy(false);
  }

  function handleNewConversation() {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(undefined);
    setTurnError(null);
    setBusy(false);
    setView("chat");
  }

  function openHistory() {
    setView("history");
    if (conversations === null) {
      setHistoryLoading(true);
      setHistoryError(null);
      api
        .getConversations()
        .then((res) => setConversations(res.data))
        .catch((err) => setHistoryError(err instanceof Error ? err.message : "Failed to load history."))
        .finally(() => setHistoryLoading(false));
    }
  }

  async function openConversation(id: string) {
    setView("chat");
    setTurnError(null);
    try {
      const detail = await api.getConversation(id);
      setMessages(reconstructMessages(detail.messages));
      setConversationId(detail.id);
    } catch (err) {
      setTurnError(err instanceof Error ? err.message : "Failed to load conversation.");
    }
  }

  const suggestions = failedJobChip
    ? [
        failedJobChip,
        { label: "What's broken right now?", message: "What's broken right now?" },
        { label: "Show me the payments queue", message: "Show me the payments queue" },
        { label: "Pause the emails queue", message: "Pause the emails queue" },
      ]
    : [];

  return (
    <div
      className={`fixed right-0 top-0 z-40 flex h-full w-96 flex-col border-l border-border bg-card shadow-2xl transition-transform duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-ai" />
          Relay AI
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleNewConversation}
            aria-label="New conversation"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openHistory}
            aria-label="History"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === "history" ? (
        <div className="flex-1 overflow-y-auto p-4">
          {historyLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-background" />
              ))}
            </div>
          )}
          {!historyLoading && historyError && (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {historyError}
            </p>
          )}
          {!historyLoading && !historyError && conversations?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No past conversations yet.</p>
          )}
          {!historyLoading &&
            !historyError &&
            conversations?.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c.id)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2.5 text-left hover:bg-background"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{c.title}</p>
                  <p className="flex items-center gap-1 text-xs text-subtle-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(c.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-subtle-foreground" />
              </button>
            ))}
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ai/10 text-ai">
                  <Sparkles className="h-5 w-5" />
                </span>
                <p className="max-w-[240px] text-sm text-muted-foreground">
                  Ask about any job, queue, or worker - I can look things up and take real actions.
                </p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => handleSend(s.message)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:border-accent hover:text-accent"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onApprove={() => handleApproval(m.id, true)} onReject={() => handleApproval(m.id, false)} />
                ))}
              </div>
            )}

            {turnError && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {turnError}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-border p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              disabled={busy || hasBlockingApproval}
              placeholder={hasBlockingApproval ? "Respond to the pending action above..." : "Ask Relay AI..."}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || hasBlockingApproval || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-white hover:opacity-90 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onApprove,
  onReject,
}: {
  message: UiMessage;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-lg bg-accent px-3 py-2 text-sm text-white">{message.content}</div>
    );
  }

  return (
    <div className="flex max-w-[90%] items-start gap-2">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ai/10 text-ai">
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="flex flex-col gap-2">
        {message.toolActivity.map((activity) => (
          <div key={activity.id} className="flex items-center gap-1.5 text-xs text-subtle-foreground">
            {activity.status === "running" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3 text-success" />
            )}
            {toolLabel(activity.toolName, activity.input)}
          </div>
        ))}

        {message.pendingApproval && (
          <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/10 p-3">
            <p className="text-sm text-foreground">{approvalDescription(message.pendingApproval.toolName, message.pendingApproval.input)}</p>
            {message.pendingApproval.status === "pending" || message.pendingApproval.status === "submitting" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={message.pendingApproval.status === "submitting"}
                  className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {message.pendingApproval.status === "submitting" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Approve
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={message.pendingApproval.status === "submitting"}
                  className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-background disabled:opacity-50"
                >
                  <Ban className="h-3 w-3" />
                  Reject
                </button>
              </div>
            ) : (
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                  message.pendingApproval.status === "approved" ? "bg-success/10 text-success" : "bg-idle/20 text-muted-foreground"
                }`}
              >
                {message.pendingApproval.status === "approved" ? <Check className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                {message.pendingApproval.status === "approved" ? "Approved" : "Rejected"}
              </span>
            )}
          </div>
        )}

        {message.content && (
          <div className="min-w-0 overflow-hidden whitespace-pre-wrap wrap-break-word rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
            {message.content}
            {message.streaming && <span className="ml-0.5 inline-block h-3.5 w-1 animate-pulse bg-subtle-foreground align-middle" />}
          </div>
        )}

        {!message.content && message.streaming && message.toolActivity.length === 0 && (
          <div className="flex items-center gap-1.5 text-xs text-subtle-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking...
          </div>
        )}
      </div>
    </div>
  );
}

export default AiChatPanel;
