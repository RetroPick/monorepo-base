import type { MarketFreshness } from "@retropick/polymarket";

export type FreshnessUiState =
  | "fresh"
  | "delayed"
  | "stale"
  | "resyncing"
  | "unavailable"
  | "closed"
  | "resolved";

const DELAYED_MS = 30_000;

export function evaluateFreshnessUi(
  freshness: MarketFreshness | undefined,
  marketStatus?: string,
): FreshnessUiState {
  if (marketStatus === "closed") return "closed";
  if (marketStatus === "resolved") return "resolved";
  if (!freshness) return "unavailable";
  switch (freshness.state) {
    case "fresh":
      if (freshness.ageMillis != null && freshness.ageMillis > DELAYED_MS) return "delayed";
      return "fresh";
    case "stale":
      return "stale";
    case "resyncing":
      return "resyncing";
    case "unavailable":
    case "invalid":
      return "unavailable";
    default: {
      const _exhaustive: never = freshness.state;
      return _exhaustive;
    }
  }
}

export function formatAgeMillis(ageMillis: number | undefined): string {
  if (ageMillis == null) return "unknown";
  const seconds = Math.floor(ageMillis / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function freshnessLabel(state: FreshnessUiState): string {
  switch (state) {
    case "fresh":
      return "Fresh";
    case "delayed":
      return "Delayed";
    case "stale":
      return "Stale (cached)";
    case "resyncing":
      return "Resyncing";
    case "unavailable":
      return "Unavailable";
    case "closed":
      return "Closed";
    case "resolved":
      return "Resolved";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function isDegradedFreshness(freshness: MarketFreshness | undefined): boolean {
  if (!freshness) return true;
  return freshness.state !== "fresh";
}
