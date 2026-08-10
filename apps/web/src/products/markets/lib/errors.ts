import { MarketsApiError, type MarketsErrorCode } from "@retropick/polymarket";

export type MarketsUiErrorKind =
  | "not_found"
  | "unavailable"
  | "upstream"
  | "stale"
  | "validation"
  | "network"
  | "malformed"
  | "timeout"
  | "rate_limit"
  | "unknown"
  | "cancelled";

function mapApiErrorCode(code: MarketsErrorCode): MarketsUiErrorKind {
  switch (code) {
    case "aborted":
      return "cancelled";
    case "malformed":
      return "malformed";
    case "timeout":
      return "timeout";
    case "rate_limit":
      return "rate_limit";
    case "validation":
      return "validation";
    case "not_found":
      return "not_found";
    case "upstream":
      return "upstream";
    case "stale":
      return "stale";
    case "unavailable":
      return "unavailable";
    case "network":
      return "network";
    case "unknown":
      return "unknown";
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

export function mapQueryError(error: unknown): {
  kind: MarketsUiErrorKind;
  message: string;
  requestId?: string;
} {
  if (error instanceof MarketsApiError) {
    return {
      kind: mapApiErrorCode(error.code),
      message: error.message,
      requestId: error.requestId,
    };
  }
  if (error instanceof Error) {
    return { kind: "unknown", message: error.message };
  }
  return { kind: "unknown", message: "Something went wrong" };
}

export function userFacingErrorMessage(kind: MarketsUiErrorKind): string {
  switch (kind) {
    case "not_found":
      return "This market or event could not be found.";
    case "unavailable":
      return "Data is temporarily unavailable. Showing cached content when possible.";
    case "upstream":
      return "Polymarket data is unreachable right now.";
    case "stale":
      return "Data is older than our freshness policy allows.";
    case "validation":
      return "The request was invalid.";
    case "network":
      return "Could not reach the RetroPick API. Check your connection or API URL.";
    case "malformed":
      return "Could not read the Markets API response. Start the Go BFF on port 8080 or set NEXT_PUBLIC_API_BASE_URL.";
    case "timeout":
      return "The Markets API request timed out. Try again in a moment.";
    case "rate_limit":
      return "Too many requests. Wait a moment and try again.";
    case "cancelled":
      return "Request was cancelled.";
    case "unknown":
      return "Something went wrong loading data.";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function isSameQueryErrorKind(a: unknown, b: unknown): boolean {
  if (!a || !b) return false;
  return mapQueryError(a).kind === mapQueryError(b).kind;
}
