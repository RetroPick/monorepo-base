/**
 * Wagmi + Reown AppKit configuration
 *
 * Primary chain : Arbitrum One (42161)
 * Supported     : All L2s listed in src/config/chains.ts
 */
import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { DEPLOYMENT_CHAIN, DEPLOYMENT_TESTNET_CHAIN, SUPPORTED_NETWORKS } from './chains'
import type { AppKitNetwork } from '@reown/appkit/networks'

// ── Project ID ────────────────────────────────────────────────────────────────

export const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || 'f39121ec755731ed58c1605658872bce'

// ── Default network ───────────────────────────────────────────────────────────

type NetworkKey = 'arbitrum' | 'arbitrum-sepolia' | 'mainnet' | 'base' | 'optimism' | 'sepolia'

const NETWORK_MAP: Record<NetworkKey, AppKitNetwork> = {
  'arbitrum':         DEPLOYMENT_CHAIN,
  'arbitrum-sepolia': DEPLOYMENT_TESTNET_CHAIN,
  'mainnet':          SUPPORTED_NETWORKS.find(n => n.id === 1)!,
  'base':             SUPPORTED_NETWORKS.find(n => n.id === 8453)!,
  'optimism':         SUPPORTED_NETWORKS.find(n => n.id === 10)!,
  'sepolia':          SUPPORTED_NETWORKS.find(n => n.id === 11155111)!,
}

function resolveDefaultNetwork(): AppKitNetwork {
  const key = import.meta.env.VITE_APP_DEFAULT_NETWORK as NetworkKey | undefined
  if (key && key in NETWORK_MAP) return NETWORK_MAP[key]
  return DEPLOYMENT_CHAIN // default: Arbitrum One
}

export const appDefaultNetwork = resolveDefaultNetwork()

// Re-export for backward compatibility with existing hook usage
export const networks = SUPPORTED_NETWORKS

// ── RPC transports ────────────────────────────────────────────────────────────

const transports: Record<number, ReturnType<typeof http>> = {
  42161:  http(import.meta.env.VITE_RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc'),
  421614: http(import.meta.env.VITE_RPC_ARBITRUM_SEPOLIA || 'https://sepolia-rollup.arbitrum.io/rpc'),
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
