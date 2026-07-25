/**
 * Wagmi + Reown AppKit configuration
 *
 * Primary chain : Base Sepolia (registry / MarketEngine)
 * Supported     : All networks in src/config/chains.ts
 */
import { cookieStorage, createStorage, http } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  arbitrum,
  arbitrumSepolia,
  base,
  mainnet,
  optimism,
  sepolia,
} from "@reown/appkit/networks";
import { DEPLOYMENT_CHAIN, DEPLOYMENT_TESTNET_CHAIN, SUPPORTED_NETWORKS } from "./chains";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { getDefaultNetworkKey, getReownProjectId, getRpcUrl } from "@/lib/runtimeEnv";

// ── Project ID ────────────────────────────────────────────────────────────────

export const projectId =
  getReownProjectId()

// ── Default network ───────────────────────────────────────────────────────────

type NetworkKey =
  | "base-sepolia"
  | "arbitrum"
  | "arbitrum-sepolia"
  | "mainnet"
  | "base"
  | "optimism"
  | "sepolia";

/** Explicit map (avoid `.find` + `!` if `SUPPORTED_NETWORKS` ordering or ids ever drift). */
const NETWORK_MAP: Record<NetworkKey, AppKitNetwork> = {
  "base-sepolia": DEPLOYMENT_CHAIN,
  arbitrum,
  "arbitrum-sepolia": arbitrumSepolia,
  mainnet,
  base,
  optimism,
  sepolia,
};

function resolveDefaultNetwork(): AppKitNetwork {
  const key = getDefaultNetworkKey() as NetworkKey | undefined;
  if (key && key in NETWORK_MAP) return NETWORK_MAP[key];
  return DEPLOYMENT_TESTNET_CHAIN;
}

export const appDefaultNetwork = resolveDefaultNetwork()

// Re-export for backward compatibility with existing hook usage
export const networks = SUPPORTED_NETWORKS

// ── RPC transports ────────────────────────────────────────────────────────────

const transports: Record<number, ReturnType<typeof http>> = {
  42161:  http(getRpcUrl("ARBITRUM") || 'https://arb1.arbitrum.io/rpc'),
  421614: http(getRpcUrl("ARBITRUM_SEPOLIA") || 'https://sepolia-rollup.arbitrum.io/rpc'),
  1:      http(),
  8453:   http(),
  10:     http(),
  137:    http(),
  324:    http(),
  59144:  http(),
  534352: http(),
  11155111: http(),
  84532:  http(),
  11155420: http(),
  80002:  http(),
}

// ── Wagmi adapter ─────────────────────────────────────────────────────────────

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks: SUPPORTED_NETWORKS,
  transports,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
