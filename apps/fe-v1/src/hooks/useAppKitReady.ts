import { useEffect, useState } from "react";
import { ensureAppKitInitialized } from "@/lib/retropickAppKit";

let readyPromise: Promise<void> | null = null;

function ensureModalReadyPromise(): Promise<void> {
  if (!readyPromise) {
    readyPromise = ensureAppKitInitialized()
      .then(async () => {
        const { modal } = await import("@reown/appkit/react");
        await modal?.ready();
      })
      .catch((err) => {
        readyPromise = null;
        throw err;
      });
  }
  return readyPromise;
}

/**
 * True once Reown AppKit has finished async init (modal UI, auth connector, embedded-wallet chunks).
 * Needed so "Continue with Google" can run without `await` inside the click handler; awaiting there
 * breaks the browser popup user-gesture chain for `window.open`.
 */
export function useAppKitReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureModalReadyPromise()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
