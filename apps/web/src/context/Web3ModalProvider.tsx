import { ReactNode, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiAdapter } from "../config";
import { scheduleIdleAppKitInit } from "@/lib/retropickAppKit";

/**
 * Wagmi runs immediately (read-only chain + hooks). Reown AppKit UI is deferred:
 * - no eager `modal.ready()` on mount (removed duplicate network + parse work)
 * - `scheduleIdleAppKitInit` warms `createAppKit` after idle so first "Sign in" is snappy
 * - `openAppKitModal` still awaits `ensureAppKitInitialized` if the user clicks before idle
 */
export function Web3ModalProvider({ children, cookies }: { children: ReactNode; cookies?: string }) {
  void cookies;

  useEffect(() => {
    scheduleIdleAppKitInit();
  }, []);

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as typeof wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
      {children}
    </WagmiProvider>
  );
}
