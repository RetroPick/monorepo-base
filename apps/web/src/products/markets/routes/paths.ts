export const MARKETS_BASE = "/markets";

export function discoverPath(): string {
  return MARKETS_BASE;
}

export function eventPath(eventId: string): string {
  return `${MARKETS_BASE}/events/${encodeURIComponent(eventId)}`;
}

export function marketPath(marketId: string): string {
  return `${MARKETS_BASE}/m/${encodeURIComponent(marketId)}`;
}
