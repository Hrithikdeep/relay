// Client for the real backend AI chat endpoints (POST /v1/ai/chat,
// POST /v1/ai/chat/confirm). These stream a custom Server-Sent-Events
// protocol (event: text|tool-call|tool-result|tool-approval-request|done|error,
// each with a JSON data line) - NOT the AI SDK's UI Message Stream wire
// format, so it's consumed with a hand-rolled fetch+ReadableStream reader
// here rather than @ai-sdk/react's useChat. See backend/src/api/routes/aiChat.ts
// for the exact protocol this parses.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "relay_test_key_123";

export interface ToolApprovalRequestEvent {
  conversationId: string;
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
}

export interface ChatStreamHandlers {
  onText: (delta: string) => void;
  onToolCall: (toolName: string, input: unknown) => void;
  onToolResult: (toolName: string, output: unknown) => void;
  onApprovalRequest: (event: ToolApprovalRequestEvent) => void;
  onDone: (conversationId: string) => void;
  onError: (message: string) => void;
}

function parseFrame(frame: string, handlers: ChatStreamHandlers): void {
  let event = "";
  let dataLine = "";

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }

  if (!event || !dataLine) return;

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataLine);
  } catch {
    return;
  }

  switch (event) {
    case "text":
      handlers.onText(String(data.delta ?? ""));
      break;
    case "tool-call":
      handlers.onToolCall(String(data.toolName), data.input);
      break;
    case "tool-result":
      handlers.onToolResult(String(data.toolName), data.output);
      break;
    case "tool-approval-request":
      handlers.onApprovalRequest(data as unknown as ToolApprovalRequestEvent);
      break;
    case "done":
      handlers.onDone(String(data.conversationId ?? ""));
      break;
    case "error":
      handlers.onError(String(data.message ?? "Unknown error"));
      break;
  }
}

async function consumeSse(response: Response, handlers: ChatStreamHandlers): Promise<void> {
  if (!response.ok) {
    handlers.onError(`Request failed (${response.status}).`);
    return;
  }
  if (!response.body) {
    handlers.onError("Streaming is not supported by this browser/response.");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      parseFrame(frame, handlers);
    }
  }
}

export async function sendChatMessage(
  body: { message: string; conversationId?: string },
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/v1/ai/chat`, {
      method: "POST",
      headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    await consumeSse(response, handlers);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    handlers.onError(err instanceof Error ? err.message : "Network error.");
  }
}

export async function confirmChatTool(
  body: { conversationId: string; toolCallId: string; approved: boolean },
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/v1/ai/chat/confirm`, {
      method: "POST",
      headers: { "x-api-key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    await consumeSse(response, handlers);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    handlers.onError(err instanceof Error ? err.message : "Network error.");
  }
}
