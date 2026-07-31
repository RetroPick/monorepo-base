/**
 * Token addresses per chain for RetroPick Protocol
 *
 * Stake token on deployment chain (Arbitrum One) is native USDC.
 * Other chains list USDC variants used as cross-chain deposit sources via LiFi.
 *
 * All addresses lowercase-checksummed `0x${string}`.
 */
import type { Address } from 'viem'

// ── USDC addresses (primary stake token) ─────────────────────────────────────

export const USDC_ADDRESSES: Record<number, Address> = {
  // ── Mainnets ──
  42161:  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum One — native USDC (Circle)
  1:      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum mainnet
  8453:   '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base — native USDC
  10:     '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism — native USDC
  137:    '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon — native USDC
  324:    '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', // zkSync Era — native USDC
  59144:  '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', // Linea — USDC
  534352: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', // Scroll — USDC

  // ── Testnets ──
  421614:  '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia test USDC
  11155111:'0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia test USDC
  84532:   '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia test USDC
}

// ── USDT addresses (alternate funding source, bridged to USDC via LiFi) ──────

export const USDT_ADDRESSES: Record<number, Address> = {
  42161:  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum One USDT
  1:      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum mainnet USDT
  10:     '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Optimism USDT
  137:    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon USDT
}

// ── WETH addresses (for ETH → USDC swap path) ────────────────────────────────

export const WETH_ADDRESSES: Record<number, Address> = {
  42161:  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum One WETH
  1:      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum WETH
  8453:   '0x4200000000000000000000000000000000000006', // Base WETH
  10:     '0x4200000000000000000000000000000000000006', // Optimism WETH
  137:    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Polygon WETH
}

// ── Stake token helper ────────────────────────────────────────────────────────

/** Returns the USDC address for a given chainId. Throws if not configured. */
export function getStakeTokenAddress(chainId: number): Address {
  const addr = USDC_ADDRESSES[chainId]
  if (!addr) throw new Error(`No USDC address configured for chainId ${chainId}`)
  return addr
}

/** Returns the USDC address or undefined if chain is not supported. */
export function tryGetStakeTokenAddress(chainId: number): Address | undefined {
  return USDC_ADDRESSES[chainId]
}

// ── USDC decimals ─────────────────────────────────────────────────────────────

/** USDC uses 6 decimals on all supported chains. */
export const STAKE_TOKEN_DECIMALS = 6

/** Parse a human-readable USDC amount string to raw bigint (6 decimals). */
export function parseUsdc(amount: string | number): bigint {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return BigInt(Math.round(n * 10 ** STAKE_TOKEN_DECIMALS))
}

/** Format raw USDC bigint to 2dp display string. */
export function formatUsdc(raw: bigint, decimals = 2): string {
  const divisor = 10 ** STAKE_TOKEN_DECIMALS
  const value   = Number(raw) / divisor
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
