const PREFIX = "retropick-portfolio-watchlist:";

export function readWatchlist(wallet: string | undefined): string[] {
  if (!wallet || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + wallet.toLowerCase());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.startsWith("0x"));
  } catch {
    return [];
  }
}

export function writeWatchlist(wallet: string, templateIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFIX + wallet.toLowerCase(), JSON.stringify(templateIds));
}

export function clearLocalWatchlist(wallet: string | undefined) {
  if (!wallet || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + wallet.toLowerCase());
  } catch {
    /* ignore */
  }
}
