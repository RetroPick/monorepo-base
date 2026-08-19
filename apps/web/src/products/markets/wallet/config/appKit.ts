// MARKETS_CUSTODY: AppKit init — wallet connectors only, no embedded key custody

import { MARKETS_WALLET_NETWORKS } from "./chains";

const APPKIT_Z_INDEX = 100_150;

declare global {
  interface Window {
    __retropickMarketsAppKitInit?: boolean;
  }
}

function getMetadataUrl(): string {
  if (typeof window === "undefined") return "https://retropick.io";
  const { origin, protocol } = window.location;
  if (protocol === "http:" || protocol === "https:") return origin;
  return "https://retropick.io";
}

export async function initMarketsAppKit(): Promise<void> {
  if (typeof window === "undefined" || window.__retropickMarketsAppKitInit) return;

  try {
    const { createAppKit } = await import("@reown/appkit/react");
    const { getMarketsWagmiAdapter, marketsAppDefaultNetwork, marketsProjectId } = await import("./wagmiConfig");

    createAppKit({
      adapters: [getMarketsWagmiAdapter()],
      networks: MARKETS_WALLET_NETWORKS,
      defaultNetwork: marketsAppDefaultNetwork,
      projectId: marketsProjectId,
      metadata: {
        name: "RetroPick Markets",
        description: "Polymarket-native prediction markets",
        url: getMetadataUrl(),
        icons: [`${getMetadataUrl()}/logo-baru.webp`],
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
        analytics: false,
        email: false,
        socials: false,
        connectMethodsOrder: ["wallet"],
        emailShowWallets: true,
      },
    });

    window.__retropickMarketsAppKitInit = true;
  } catch (err) {
    console.error("[RetroPick Markets] AppKit failed to initialize.", err);
  }
}

export async function openMarketsAppKitModal(): Promise<void> {
  if (typeof window === "undefined") return;

  await initMarketsAppKit();
  const { modal } = await import("@reown/appkit/react");
  if (!modal) {
    throw new Error("Markets wallet UI is not initialized.");
  }
  await modal.ready();
  await modal.open({ view: "Connect" });
}
