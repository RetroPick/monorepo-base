import { appDefaultNetwork, networks, projectId, wagmiAdapter } from "@/config";

/** Above Radix Dialog (z-50) and in-app menus (z-[10000]) so WalletConnect stays usable */
const APPKIT_Z_INDEX = 100_150;

declare global {
  interface Window {
    __retropickReownAppKitInit?: boolean;
  }
}

function getMetadataUrl(): string {
  if (typeof window === "undefined") return "https://retropick.io";
  const { origin, protocol } = window.location;
  if (protocol === "http:" || protocol === "https:") return origin;
  return "https://retropick.io";
}

let initPromise: Promise<void> | null = null;

/**
 * Ensures `createAppKit` has run exactly once. Safe to call from click handlers
 * (`openAppKitModal`) and from idle pre-warm in `Web3ModalProvider`.
 */
export function ensureAppKitInitialized(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.__retropickReownAppKitInit) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
      const { createAppKit } = await import("@reown/appkit/react");
      createAppKit({
        adapters: [wagmiAdapter],
        networks,
        defaultNetwork: appDefaultNetwork,
        projectId,
        metadata: {
          name: "RetroPick",
          description: "Oracle-resolved prediction markets (Base Sepolia testnet)",
          url: getMetadataUrl(),
          icons: [`${getMetadataUrl()}/retropick-logo.png`],
        },
        enableEmbedded: false,
        enableReconnect: false,
        allowUnsupportedChain: true,
        coinbasePreference: "all",
        defaultAccountTypes: { eip155: "eoa" },
        themeVariables: {
          "--w3m-z-index": APPKIT_Z_INDEX,
          "--apkt-z-index": APPKIT_Z_INDEX,
        },
        features: {
          analytics: true,
          email: false,
          socials: ["google"],
          connectMethodsOrder: ["social", "email", "wallet"],
          emailShowWallets: false,
        },
      });
      window.__retropickReownAppKitInit = true;
    })().catch((err) => {
      initPromise = null;
      console.error(
        "[RetroPick] Reown AppKit failed to initialize. UI may load without wallet modal.",
        err,
      );
      throw err;
    });
  }
  return initPromise;
}

/** `requestIdleCallback` with a timeout so AppKit still warms on quiet main threads. */
export function scheduleIdleAppKitInit(): void {
  if (typeof window === "undefined") return;
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(
      () => {
        void ensureAppKitInitialized().catch(() => {
          /* logged in ensureAppKitInitialized */
        });
      },
      { timeout: 10_000 },
    );
    return;
  }
  window.setTimeout(() => {
    void ensureAppKitInitialized().catch(() => {
      /* logged in ensureAppKitInitialized */
    });
  }, 1);
}
