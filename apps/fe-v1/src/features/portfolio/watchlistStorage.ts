const PREFIX = "retropick-portfolio-watchlist:";
const GUEST_KEY = "retropick-guest-watchlist";

/** Dispatched on same-tab guest watchlist writes (storage event only fires cross-tab). */
export const GUEST_WATCHLIST_CHANGED_EVENT = "retropick-guest-watchlist";

const TEMPLATE_ID_RE = /^0x[a-fA-F0-9]{64}$/;

/** Normalizes and validates a 32-byte template id (matches backend `resolveWatchlistTemplates`). */
export function normalizeTemplateId(id: string): string | null {
  const t = id.trim();
  const with0x = t.startsWith("0x") ? t : `0x${t}`;
  const lower = with0x.toLowerCase();
  return TEMPLATE_ID_RE.test(lower) ? lower : null;
}

function parseStoredIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const x of parsed) {
      if (typeof x !== "string") continue;
      const n = normalizeTemplateId(x);
      if (n) out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids.map((x) => normalizeTemplateId(x)).filter(Boolean) as string[])].sort();
}

function notifyGuestWatchlistChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(GUEST_WATCHLIST_CHANGED_EVENT));
}

export function readWatchlist(wallet: string | undefined): string[] {
  if (!wallet || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + wallet.toLowerCase());
    return uniqueSorted(parseStoredIds(raw));
  } catch {
    return [];
  }
}

export function writeWatchlist(wallet: string, templateIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFIX + wallet.toLowerCase(), JSON.stringify(uniqueSorted(templateIds)));
}

export function clearLocalWatchlist(wallet: string | undefined) {
  if (!wallet || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREFIX + wallet.toLowerCase());
  } catch {
    /* ignore */
  }
}

export function readGuestWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    return uniqueSorted(parseStoredIds(raw));
  } catch {
    return [];
  }
}

export function writeGuestWatchlist(templateIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_KEY, JSON.stringify(uniqueSorted(templateIds)));
  notifyGuestWatchlistChanged();
}

export function clearGuestWatchlist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
  notifyGuestWatchlistChanged();
}

/** Add or remove one id in guest storage; returns next list. */
export function toggleGuestWatchlist(templateId: string, add: boolean): string[] {
  const tid = normalizeTemplateId(templateId);
  if (!tid) return readGuestWatchlist();
  const cur = readGuestWatchlist();
  const set = new Set(cur);
  if (add) set.add(tid);
  else set.delete(tid);
  const next = [...set].sort();
  writeGuestWatchlist(next);
  return next;
}

/** Remove one id from guest and wallet-local storage (after successful server sync). */
export function removeFromGuestAndLocalWatchlist(wallet: string | undefined, templateId: string) {
  const tid = normalizeTemplateId(templateId);
  if (!tid) return;
  const g = readGuestWatchlist().filter((x) => x !== tid);
  writeGuestWatchlist(g);
  if (wallet) {
    const w = readWatchlist(wallet).filter((x) => x !== tid);
    writeWatchlist(wallet, w);
  }
}

/**
 * Template ids present in guest or wallet-local but not yet on server (normalized, sorted).
 */
export function computePendingWatchlistImport(
  serverIds: string[],
  guestIds: string[],
  walletLocalIds: string[],
): string[] {
  const server = new Set(serverIds.map((x) => normalizeTemplateId(x)).filter(Boolean) as string[]);
  const pending = new Set<string>();
  for (const id of guestIds) {
    const n = normalizeTemplateId(id);
    if (n && !server.has(n)) pending.add(n);
  }
  for (const id of walletLocalIds) {
    const n = normalizeTemplateId(id);
    if (n && !server.has(n)) pending.add(n);
  }
  return [...pending].sort();
}
