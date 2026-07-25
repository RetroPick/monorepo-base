import { ensureAppKitInitialized } from "@/lib/retropickAppKit";

/**
 * Waits for Reown AppKit async init (remote config, connectors, modal bundle) then opens the wallet UI.
 * Calling `open()` too early often results in no visible modal.
 *
 * `@reown/appkit/react` is loaded only on this path (not via a static import), so the Header
 * bundle does not eagerly include the AppKit modal graph on cold load.
 */
export async function openAppKitModal(): Promise<void> {
  if (typeof window === "undefined") return;
  await ensureAppKitInitialized();
  const { modal } = await import("@reown/appkit/react");
  if (!modal) {
    throw new Error("Wallet UI is not initialized. Ensure the app is wrapped in Web3ModalProvider.");
  }
  await modal.ready();
  await modal.open({ view: "Connect" });
}
