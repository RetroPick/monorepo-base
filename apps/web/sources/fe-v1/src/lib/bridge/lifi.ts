/**
 * LiFi Bridge Abstraction — Cross-chain → Arbitrum USDC
 *
 * Implements the Tier A (frontend-only) cross-chain deposit pattern from
 * the abstraction docs (02-integration-modes.md):
 *
 *   1. User has arbitrary asset on any supported chain
 *   2. UI calls LiFi API to get a route: tokenIn/sourceChain → Arbitrum USDC
 *   3. User approves tokenIn on source chain
 *   4. User executes the LiFi route on source chain
 *   5. LiFi bridges + swaps, delivers USDC to user on Arbitrum One
 *   6. User calls depositToSide on MarketEngine with received USDC (separate step)
 *
 * For future Tier C (router + depositToSideFor), the router address becomes
 * the toAddress, and the router calls depositToSideFor after receiving USDC.
 *
 * LiFi docs: https://docs.li.fi/
 */
import type { Address } from 'viem'
import type { BridgeRoute, BridgeRouteRequest, SourceTokenOption } from './types'
import { DEPLOYMENT_CHAIN_ID }  from '@/config/chains'
import { getStakeTokenAddress } from '@/config/tokens'

const LIFI_API_BASE = 'https://li.quest/v1'

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function lifiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${LIFI_API_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const apiKey = import.meta.env.VITE_LIFI_API_KEY
  if (apiKey) headers['x-lifi-api-key'] = apiKey

  const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`LiFi API ${path} ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── LiFi response types (partial) ────────────────────────────────────────────

interface LiFiToken {
  address:   string
  symbol:    string
  name:      string
  decimals:  number
  logoURI?:  string
  chainId:   number
}

interface LiFiStep {
  type:    string
  tool:    string
  action:  { fromToken: LiFiToken; toToken: LiFiToken; fromAmount: string; toAmount?: string }
  estimate?: { toAmountMin: string; executionDuration?: number; gasCosts?: Array<{ amountUSD?: string }> }
}

interface LiFiRoute {
  id:         string
  steps:      LiFiStep[]
  toAmount:   string
  toAmountMin: string
  tags?:      string[]
}

interface LiFiRoutesResponse {
  routes: LiFiRoute[]
}

interface LiFiTokensResponse {
  tokens: Record<string, LiFiToken[]>
}

// ── Route fetching ────────────────────────────────────────────────────────────

/**
 * Fetches the best LiFi route from any token on any chain to Arbitrum USDC.
 *
 * Returns null if no route is available (e.g., token/chain not supported).
 */
export async function getBridgeRoutes(req: BridgeRouteRequest): Promise<BridgeRoute[]> {
  const destUSDC = getStakeTokenAddress(DEPLOYMENT_CHAIN_ID)

  const params: Record<string, string> = {
    fromChainId:      String(req.fromChainId),
    toChainId:        String(req.toChainId ?? DEPLOYMENT_CHAIN_ID),
    fromTokenAddress: req.fromTokenAddress,
    toTokenAddress:   req.toTokenAddress ?? destUSDC,
    fromAmount:       String(req.fromAmount),
    fromAddress:      req.fromAddress,
    slippage:         String((req.slippageBps ?? 50) / 10_000),
    allowBridges:     'across,cctp,stargate,socket,hop',
    allowExchanges:   'uniswap,1inch,paraswap',
  }

  const response = await lifiGet<LiFiRoutesResponse>('/routes', params)

  return response.routes.map(mapLiFiRoute)
}

/**
 * Returns the single best route (lowest estimated gas + highest output).
 */
export async function getBestBridgeRoute(req: BridgeRouteRequest): Promise<BridgeRoute | null> {
  const routes = await getBridgeRoutes(req)
  if (!routes.length) return null
  // LiFi returns routes sorted by quality; take the first (recommended)
  return routes[0]
}

function mapLiFiRoute(r: LiFiRoute): BridgeRoute {
  const firstStep = r.steps[0]
  const lastStep  = r.steps[r.steps.length - 1]

  const gasCostUsd = r.steps.reduce((sum, s) => {
    const cost = s.estimate?.gasCosts?.[0]?.amountUSD
    return sum + (cost ? parseFloat(cost) : 0)
  }, 0).toFixed(2)

  const duration = r.steps.reduce((sum, s) => {
    return sum + (s.estimate?.executionDuration ?? 0)
  }, 0)

  // Find the bridge step name
  const bridgeStep = r.steps.find(s => s.type === 'cross')
  const bridgeName = bridgeStep?.tool ?? firstStep?.tool ?? 'LiFi'

  return {
    id:               r.id,
    toAmountMin:      BigInt(r.toAmountMin || '0'),
    toAmount:         BigInt(r.toAmount    || '0'),
    gasCostUsd,
    estimatedDuration: duration,
    bridgeName,
    steps: r.steps.map(s => ({
      type:        s.type as 'swap' | 'cross',
      tool:        s.tool,
      fromToken:   s.action.fromToken.symbol,
      toToken:     s.action.toToken.symbol,
      fromAmount:  s.action.fromAmount,
      toAmountMin: s.estimate?.toAmountMin ?? '0',
    })),
    raw: r,
  }
}

// ── Token discovery ───────────────────────────────────────────────────────────

/**
 * Returns a list of supported source tokens on a given chain that can be
 * bridged to Arbitrum USDC via LiFi. Used to populate the "pay with" picker.
 */
export async function getSupportedSourceTokens(chainId: number): Promise<SourceTokenOption[]> {
  try {
    const response = await lifiGet<LiFiTokensResponse>('/tokens', {
      chains: String(chainId),
    })

    const tokens = response.tokens[String(chainId)] ?? []
    const destUSDC = getStakeTokenAddress(DEPLOYMENT_CHAIN_ID)

    return tokens.slice(0, 50).map(t => ({
      chainId:  t.chainId,
      address:  t.address as Address,
      symbol:   t.symbol,
      name:     t.name,
      decimals: t.decimals,
      logoUrl:  t.logoURI,
      isNative: t.chainId === DEPLOYMENT_CHAIN_ID &&
                t.address.toLowerCase() === destUSDC.toLowerCase(),
    }))
  } catch {
    return []
  }
}

// ── Quote helper ──────────────────────────────────────────────────────────────

export interface BridgeQuote {
  outputUsdc:        bigint   // estimated USDC out (6-decimal)
  outputUsdcMin:     bigint   // minimum after slippage
  gasCostUsd:        string
  estimatedMinutes:  number
  bridgeName:        string
}

/**
 * Quick quote: how much USDC will the user receive for depositing N units of tokenIn?
 * Returns null if no route available.
 */
export async function quoteBridge(
  fromChainId:      number,
  fromTokenAddress: Address,
  fromAmount:       bigint,
  userAddress:      Address,
): Promise<BridgeQuote | null> {
  try {
    const route = await getBestBridgeRoute({
      fromChainId,
      toChainId:        DEPLOYMENT_CHAIN_ID,
      fromTokenAddress,
      toTokenAddress:   getStakeTokenAddress(DEPLOYMENT_CHAIN_ID),
      fromAmount,
      fromAddress:      userAddress,
    })
    if (!route) return null

    return {
      outputUsdc:       route.toAmount,
      outputUsdcMin:    route.toAmountMin,
      gasCostUsd:       route.gasCostUsd,
      estimatedMinutes: Math.ceil(route.estimatedDuration / 60),
      bridgeName:       route.bridgeName,
    }
  } catch {
    return null
  }
}
