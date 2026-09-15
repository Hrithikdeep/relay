// Placeholder - Relay has no public production API yet. Override via
// `baseUrl` in the constructor (e.g. http://localhost:3001 for local dev).
const DEFAULT_BASE_URL = "https://api.relay.dev";

export interface RelayConfig {
  apiKey: string;
  baseUrl?: string;
}

// Mirrors the real error envelope every backend route emits via
// backend/src/api/middleware/errorHandler.ts: {"error": "<ErrorClassName>",
// "message": "..."}, with an optional `details` field on 400s raised by a
// Zod validation failure.
export class RelayError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "RelayError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

export class RelayClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: RelayConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  async request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    options: { body?: unknown; query?: QueryParams } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/v1${path}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (cause) {
      throw new RelayError(0, "NetworkError", cause instanceof Error ? cause.message : "Network request failed");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const body = (data ?? {}) as { error?: string; message?: string; details?: unknown };
      throw new RelayError(
        response.status,
        body.error ?? "UnknownError",
        body.message ?? response.statusText,
        body.details
      );
    }

    return data as T;
  }
}
