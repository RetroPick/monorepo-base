import { modal } from "@reown/appkit/react";

/**
 * Waits for Reown AppKit async init (remote config, connectors, modal bundle) then opens the wallet UI.
 * Calling `open()` too early often results in no visible modal.
 */
export async function openAppKitModal(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!modal) {
    throw new Error("Wallet UI is not initialized. Ensure the app is wrapped in Web3ModalProvider.");
  }
  await modal.ready();
  await modal.open();
}
