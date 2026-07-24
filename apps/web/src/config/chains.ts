/**
 * Chain configuration for RetroPick Protocol
 *
 * MarketEngine (indexed deployment) : Base Sepolia per `@retropick/contracts` registry.
 * Additional chains               : sources for bridges / funding; Arbitrum envs remain for legacy tooling.
 */

import {
  type AppKitNetwork,
  arbitrum,
  arbitrumSepolia,
  mainnet,
  sepolia,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  zksync,
  linea,
  scroll,
} from "@reown/appkit/networks";

import { REGISTRY_CHAIN_ID } from "@/contracts/config";

// ── Primary MarketEngine chain (registry) ────────────────────────────────────

/** Base Sepolia: current registry chain for the MarketEngine proxy. */
export const DEPLOYMENT_CHAIN = baseSepolia;
export const DEPLOYMENT_CHAIN_ID = REGISTRY_CHAIN_ID;

/** Alias: same as `DEPLOYMENT_CHAIN` for testnet-only naming. */
export const DEPLOYMENT_TESTNET_CHAIN = baseSepolia;
export const DEPLOYMENT_TESTNET_CHAIN_ID = REGISTRY_CHAIN_ID;

// ── All supported networks ────────────────────────────────────────────────────

/**
 * Networks shown in the wallet connection modal.
 * Base Sepolia first (registry / MarketEngine). Others include L2s and legacy testnets.
 */
export const SUPPORTED_NETWORKS: [AppKitNetwork, ...AppKitNetwork[]] = [
  baseSepolia, // 84532, MarketEngine (registry)
  arbitrum,
  arbitrumSepolia,
  mainnet,
  base,
  optimism,
  polygon,
  zksync,
  linea,
  scroll,
  sepolia,
  optimismSepolia,
  polygonAmoy,
];

/** Chain IDs that are valid sources for cross-chain deposits (via LiFi bridge). */
export const CROSS_CHAIN_SOURCE_IDS = new Set<number>([
  1,        // Ethereum mainnet
  8453,     // Base
  10,       // Optimism
  137,      // Polygon
  324,      // zkSync Era
  59144,    // Linea
  534352,   // Scroll
  // Testnets
  11155111, // Sepolia
  84532,    // Base Sepolia
  11155420, // Optimism Sepolia
  80002,    // Polygon Amoy
])

// ── Chain metadata helpers ────────────────────────────────────────────────────

export interface ChainMeta {
  id:          number
  name:        string
  shortName:   string
  nativeSymbol: string
  iconUrl:     string
  explorerUrl: string
  isTestnet:   boolean
}

export const CHAIN_META: Record<number, ChainMeta> = {
  42161: {
    id: 42161, name: 'Arbitrum One', shortName: 'Arbitrum',
    nativeSymbol: 'ETH', iconUrl: '/chains/arbitrum.svg',
    explorerUrl: 'https://arbiscan.io', isTestnet: false,
  },
  421614: {
    id: 421614, name: 'Arbitrum Sepolia', shortName: 'Arb Sepolia',
    nativeSymbol: 'ETH', iconUrl: '/chains/arbitrum.svg',
    explorerUrl: 'https://sepolia.arbiscan.io', isTestnet: true,
  },
  1: {
    id: 1, name: 'Ethereum', shortName: 'Ethereum',
    nativeSymbol: 'ETH', iconUrl: '/chains/ethereum.svg',
    explorerUrl: 'https://etherscan.io', isTestnet: false,
  },
  8453: {
    id: 8453, name: 'Base', shortName: 'Base',
    nativeSymbol: 'ETH', iconUrl: '/chains/base.svg',
    explorerUrl: 'https://basescan.org', isTestnet: false,
  },
  10: {
    id: 10, name: 'Optimism', shortName: 'OP',
    nativeSymbol: 'ETH', iconUrl: '/chains/optimism.svg',
    explorerUrl: 'https://optimistic.etherscan.io', isTestnet: false,
  },
  137: {
    id: 137, name: 'Polygon', shortName: 'Polygon',
    nativeSymbol: 'POL', iconUrl: '/chains/polygon.svg',
    explorerUrl: 'https://polygonscan.com', isTestnet: false,
  },
  324: {
    id: 324, name: 'zkSync Era', shortName: 'zkSync',
    nativeSymbol: 'ETH', iconUrl: '/chains/zksync.svg',
    explorerUrl: 'https://explorer.zksync.io', isTestnet: false,
  },
  59144: {
    id: 59144, name: 'Linea', shortName: 'Linea',
    nativeSymbol: 'ETH', iconUrl: '/chains/linea.svg',
    explorerUrl: 'https://lineascan.build', isTestnet: false,
  },
  534352: {
    id: 534352, name: 'Scroll', shortName: 'Scroll',
    nativeSymbol: 'ETH', iconUrl: '/chains/scroll.svg',
    explorerUrl: 'https://scrollscan.com', isTestnet: false,
  },
  11155111: {
    id: 11155111, name: 'Sepolia', shortName: 'Sepolia',
    nativeSymbol: 'ETH', iconUrl: '/chains/ethereum.svg',
    explorerUrl: 'https://sepolia.etherscan.io', isTestnet: true,
  },
  84532: {
    id: 84532, name: 'Base Sepolia', shortName: 'Base Sep',
    nativeSymbol: 'ETH', iconUrl: '/chains/base.svg',
    explorerUrl: 'https://sepolia.basescan.org', isTestnet: true,
  },
  11155420: {
    id: 11155420, name: 'Optimism Sepolia', shortName: 'OP Sep',
    nativeSymbol: 'ETH', iconUrl: '/chains/optimism.svg',
    explorerUrl: 'https://sepolia-optimism.etherscan.io', isTestnet: true,
  },
  80002: {
    id: 80002, name: 'Polygon Amoy', shortName: 'Amoy',
    nativeSymbol: 'POL', iconUrl: '/chains/polygon.svg',
    explorerUrl: 'https://amoy.polygonscan.com', isTestnet: true,
  },
}

export function getChainMeta(chainId: number): ChainMeta | undefined {
  return CHAIN_META[chainId]
}

export function isCrossChainSource(chainId: number): boolean {
  return CROSS_CHAIN_SOURCE_IDS.has(chainId) && chainId !== DEPLOYMENT_CHAIN_ID
}

export function isDeploymentChain(chainId: number): boolean {
  return (
    chainId === DEPLOYMENT_CHAIN_ID ||
    chainId === 42161 ||
    chainId === 421614
  );
}
