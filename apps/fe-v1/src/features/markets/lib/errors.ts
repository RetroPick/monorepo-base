import { MarketsApiError } from "@retropick/polymarket";

export type MarketsUiErrorKind =
  | "not_found"
  | "unavailable"
  | "upstream"
  | "stale"
  | "validation"
  | "network"
  | "unknown"
  | "cancelled";

export function mapQueryError(error: unknown): { kind: MarketsUiErrorKind; message: string; requestId?: string } {
  if (error instanceof MarketsApiError) {
    return {
      kind: error.code === "aborted" ? "cancelled" : (error.code as MarketsUiErrorKind),
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
