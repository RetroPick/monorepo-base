/**
 * RetroPick Protocol — Contract registry
 *
 * Deployment chain : Arbitrum One (42161), testnet: Arbitrum Sepolia (421614)
 * Architecture     : MarketEngineDispatcher (UUPS proxy + module pattern)
 *
 * Addresses marked PLACEHOLDER must be replaced before production launch.
 * Set VITE_MARKET_ENGINE_ADDRESS / VITE_MARKET_ENGINE_ADDRESS_TESTNET in .env.
 */
import type { Abi } from 'viem'
import { erc20Abi } from 'viem'
import { readEnv } from '@/lib/env'
import MarketEngineDispatcherABI from './abi/MarketEngineDispatcher.json'
import ExecutionLedgerABI from './abi/ExecutionLedger.json'
import MarketRegistryABI from './abi/MarketRegistry.json'
import FaucetABI from './abi/Faucet.json'

// ── ABIs ──────────────────────────────────────────────────────────────────────

export const ABIS = {
  /** MarketEngineDispatcher — the unified proxy; all module selectors route here. */
  MarketEngineDispatcher: MarketEngineDispatcherABI as Abi,

  /** Standard ERC-20 used for stakeToken (USDC) approvals + balance reads. */
  ERC20: erc20Abi,

  ExecutionLedger: ExecutionLedgerABI as Abi,
  MarketRegistry: MarketRegistryABI as Abi,
  Faucet: FaucetABI as Abi,
} as const

// ── Per-chain contract addresses ──────────────────────────────────────────────

export interface ChainContracts {
  /** MarketEngineDispatcher UUPS proxy address */
  MarketEngineDispatcher: `0x${string}`
  ExecutionLedger?: `0x${string}`
  MarketRegistry?: `0x${string}`
  Faucet?: `0x${string}`
  /** RetroPickRouter (Tier C executor for cross-chain deposits) — optional until deployed */
  RetroPickRouter?: `0x${string}`
  /** YieldRouterV2 — optional, tracks yield on idle stake */
  YieldRouter?: `0x${string}`
}

export const CONTRACT_ADDRESSES: Record<number, ChainContracts> = {
  // ── Arbitrum One (production) ───────────────────────────────────────────────
  42161: {
    MarketEngineDispatcher: (
      readEnv('NEXT_PUBLIC_MARKET_ENGINE_ADDRESS', 'VITE_MARKET_ENGINE_ADDRESS') ||
      '0x0000000000000000000000000000000000000000' // PLACEHOLDER — set before launch
    ) as `0x${string}`,
  },

  // ── Arbitrum Sepolia (staging / testnet) ────────────────────────────────────
  421614: {
    MarketEngineDispatcher: (
      readEnv('NEXT_PUBLIC_MARKET_ENGINE_ADDRESS_TESTNET', 'VITE_MARKET_ENGINE_ADDRESS_TESTNET') ||
      '0x0000000000000000000000000000000000000000' // PLACEHOLDER — set before launch
    ) as `0x${string}`,
  },
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Returns contract addresses for a given chain. Falls back to testnet if unknown. */
export function getContractAddresses(chainId: number): ChainContracts {
  return CONTRACT_ADDRESSES[chainId] ?? CONTRACT_ADDRESSES[421614]
}

/** Returns the MarketEngineDispatcher proxy address for a given chain. */
export function getMarketEngineAddress(chainId: number): `0x${string}` {
  return getContractAddresses(chainId).MarketEngineDispatcher
}

/** Returns the RetroPickRouter address for a given chain, or undefined if not deployed. */
export function getRouterAddress(chainId: number): `0x${string}` | undefined {
  return getContractAddresses(chainId).RetroPickRouter
}
