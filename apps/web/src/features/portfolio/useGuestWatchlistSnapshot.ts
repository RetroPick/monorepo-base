import { useSyncExternalStore } from "react";

import {
  GUEST_WATCHLIST_CHANGED_EVENT,
  readGuestWatchlist,
} from "@/features/portfolio/watchlistStorage";

const GUEST_LS_KEY = "retropick-guest-watchlist";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.storageArea === window.localStorage && (e.key === GUEST_LS_KEY || e.key === null)) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(GUEST_WATCHLIST_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(GUEST_WATCHLIST_CHANGED_EVENT, onChange);
  };
}

function snapshot(): string {
  return JSON.stringify(readGuestWatchlist());
}

/** Stable JSON string of guest template ids for `useMemo` deps and incremental sync. */
export function useGuestWatchlistSnapshot(): string {
  return useSyncExternalStore(subscribe, snapshot, () => "[]");
}
