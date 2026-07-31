import { ensureAppKitInitialized, openAppKitWhenReady } from "@/context/Web3ModalProvider";

/**
 * Waits for Reown AppKit init on first explicit wallet action, then opens the wallet UI.
 */
export async function openAppKitModal(): Promise<void> {
  if (typeof window === "undefined") return;
  ensureAppKitInitialized();
  await openAppKitWhenReady();
}
