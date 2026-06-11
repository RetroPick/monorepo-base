/**
 * Cross-chain deposit bridge types
 *
 * The bridge abstraction layer (LiFi) enables users to deposit from any chain
 * into MarketEngine on Arbitrum One (Tier A frontend-only, per abstraction docs).
 *
 * Flow:
 *   User has tokenIn on sourceChain
 *   → LiFi routes: swap + bridge → Arbitrum USDC in user's wallet
 *   → User calls depositToSide on MarketEngine with Arbitrum USDC
 */
import type { Address } from 'viem'

// ── Route request ─────────────────────────────────────────────────────────────

export interface BridgeRouteRequest {
  /** Source chain ID */
  fromChainId:      number
  /** Destination chain ID — always DEPLOYMENT_CHAIN_ID (42161) for RetroPick */
  toChainId:        number
  /** Token address on source chain (use native address 0x0 for ETH) */
  fromTokenAddress: Address
  /** Token address on destination chain — always Arbitrum USDC */
  toTokenAddress:   Address
  /** Amount of fromToken in smallest units (e.g., USDC 6-decimal, ETH 18-decimal) */
  fromAmount:       bigint
  /** User's wallet address — receives the destination token */
  fromAddress:      Address
  /** Slippage tolerance in basis points (e.g., 50 = 0.5%) */
  slippageBps?:     number
}

// ── Route response ────────────────────────────────────────────────────────────

export interface BridgeRoute {
  /** Unique route ID from LiFi */
  id:               string
  /** Estimated USDC output on destination chain (6-decimal) */
  toAmountMin:      bigint
  /** Estimated USDC output including slippage */
  toAmount:         bigint
  /** Estimated gas cost in USD */
  gasCostUsd:       string
  /** Estimated total time in seconds */
  estimatedDuration: number
  /** Bridge / aggregator name (e.g., "Stargate", "Across", "CCTP") */
  bridgeName:       string
  /** Steps in the route (swap → bridge → swap) */
  steps:            BridgeStep[]
  /** Raw LiFi route object for execution */
  raw:              unknown
}

export interface BridgeStep {
  type:         'swap' | 'cross'
  tool:         string   // e.g. "uniswap", "stargate"
  fromToken:    string
  toToken:      string
  fromAmount:   string
  toAmountMin:  string
}

// ── Transaction execution ─────────────────────────────────────────────────────

export type BridgeStatus =
  | 'idle'
  | 'fetching_routes'
  | 'awaiting_approval'
  | 'approving'
  | 'executing'
  | 'pending_bridge'
  | 'done'
  | 'failed'

export interface BridgeTransaction {
  status:      BridgeStatus
  txHash?:     `0x${string}`
  toAmount?:   bigint   // actual USDC received after bridge
  error?:      string
}

// ── Token option for the UI picker ───────────────────────────────────────────

export interface SourceTokenOption {
  chainId:  number
  address:  Address
  symbol:   string
  name:     string
  decimals: number
  logoUrl?: string
  /** True when this is the same as stake token on deployment chain (no bridge needed) */
  isNative: boolean
}
