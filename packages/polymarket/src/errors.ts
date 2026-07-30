import type { components } from "./generated/api";

export type MarketsApiErrorBody = components["schemas"]["ApiError"];
export type MarketsErrorCode =
  | "validation"
  | "not_found"
  | "rate_limit"
  | "upstream"
  | "stale"
  | "unavailable"
  | "network"
  | "timeout"
  | "aborted"
  | "malformed"
  | "unknown";

export class MarketsApiError extends Error {
  readonly status: number;
  readonly code: MarketsErrorCode;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly body?: MarketsApiErrorBody;

  constructor(
    message: string,
    opts: {
      status: number;
      code: MarketsErrorCode;
      requestId?: string;
      retryAfterMs?: number;
      body?: MarketsApiErrorBody;
      cause?: unknown;
    },
  ) {
    super(message, { cause: opts.cause });
    this.name = "MarketsApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.retryAfterMs = opts.retryAfterMs;
    this.body = opts.body;
  }
}

export function mapStatusToErrorCode(status: number, apiCode?: string): MarketsErrorCode {
  if (status === 400) return "validation";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit";
  if (status === 502) return "upstream";
  if (status === 503) {
    if (apiCode?.includes("stale")) return "stale";
    return "unavailable";
  }
  if (status >= 500) return "unavailable";
  return "unknown";
}

export function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}
