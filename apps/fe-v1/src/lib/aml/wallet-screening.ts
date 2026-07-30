/**
 * AML Wallet Screening — TRM Labs Integration
 *
 * Implements Section 6 of the RetroPick AML/CFT/CPF Policy v1.0
 *
 * Screening scope (per policy §6.2):
 *   - OFAC Specially Designated Nationals (SDN)
 *   - UN Consolidated Sanctions List
 *   - UAE Targeted Financial Sanctions
 *   - EU Consolidated Sanctions List
 *   - UK HM Treasury Sanctions List
 *   - TRM Labs proprietary risk DB (darknet, mixers, ransomware, scam wallets, DPRK)
 *
 * Risk threshold: wallets scoring ≥ 80 / 100 are blocked from depositing.
 * Screening logs retained 5 years (policy §10).
 *
 * Re-screening: all active depositors re-screened weekly (handled by backend worker;
 * frontend screens on every wallet connection event).
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'severe' | 'unknown'

export interface WalletScreeningResult {
  address:         string
  chainName:       string
  riskScore:       number      // 0–100; ≥80 = blocked
  riskLevel:       RiskLevel
  blocked:         boolean
  blockReason?:    string      // set when blocked = true
  matchedLists:    string[]    // e.g. ["OFAC SDN", "TRM Darknet"]
  screenedAt:      number      // unix ms timestamp
}

// ── Risk threshold ────────────────────────────────────────────────────────────

const BLOCK_THRESHOLD = 80 // per AML policy §6.2

function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'severe'
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  if (score >= 0)  return 'low'
  return 'unknown'
}

// ── TRM Labs API ──────────────────────────────────────────────────────────────

interface TrmEntity {
  address: string
  chain:   string
}

interface TrmRiskIndicator {
  category:    string
  categoryId:  string
  riskType:    string
  totalVolumeUsd: number
}

interface TrmEntityAssessment {
  address:          string
  chain:            string
  addressRiskScore: number
  riskIndicators:   TrmRiskIndicator[]
  entities?:        Array<{ category: string; name: string }>
  addressType?:     string
}

const TRM_API_BASE = 'https://api.trmlabs.com/public/v2'

async function callTrmApi(address: string, chain: string): Promise<TrmEntityAssessment | null> {
  const apiKey = import.meta.env.VITE_TRM_LABS_API_KEY
  if (!apiKey) return null

  try {
    const body: TrmEntity[] = [{ address, chain }]
    const res = await fetch(`${TRM_API_BASE}/entities/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    })

    if (!res.ok) return null
    const data: TrmEntityAssessment[] = await res.json()
    return data[0] ?? null
  } catch {
    return null
  }
}

/** Maps wagmi/viem chainId to the TRM Labs chain string. */
function chainIdToTrmChain(chainId: number): string {
  const MAP: Record<number, string> = {
    42161:   'arbitrum',
    421614:  'arbitrum',
    1:       'ethereum',
    8453:    'base',
    10:      'optimism',
    137:     'polygon',
    324:     'zksync_era',
    59144:   'linea',
    534352:  'scroll',
    11155111:'ethereum',
  }
  return MAP[chainId] || 'ethereum'
}

// ── Screening cache (in-memory, TTL 15 min) ───────────────────────────────────

interface CacheEntry {
  result: WalletScreeningResult
  ts:     number
}

const _cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 15 * 60 * 1000

function cacheKey(address: string, chainId: number) {
  return `${address.toLowerCase()}-${chainId}`
}

// ── Main screening function ───────────────────────────────────────────────────

/**
 * Screens a wallet address via TRM Labs.
 *
 * When VITE_ENABLE_WALLET_SCREENING is "false" (local dev), returns a safe result.
 * When TRM API key is not set, returns a low-risk pass (for staging without credentials).
 */
export async function screenWallet(
  address: string,
  chainId: number,
): Promise<WalletScreeningResult> {
  if (import.meta.env.VITE_ENABLE_WALLET_SCREENING === 'false') {
    return makeResult(address, chainId, 0, [], false)
  }

  const key = cacheKey(address, chainId)
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result
  }

  const chain      = chainIdToTrmChain(chainId)
  const assessment = await callTrmApi(address, chain)

  let result: WalletScreeningResult

  if (!assessment) {
    // TRM unavailable — fail-open with low risk; backend worker will re-screen
    result = makeResult(address, chainId, 0, [], false, 'TRM screening unavailable — allow pending re-screen')
  } else {
    const score       = Math.round(assessment.addressRiskScore * 100) // TRM returns 0–1
    const matchedLists = extractMatchedLists(assessment.riskIndicators)
    const blocked      = score >= BLOCK_THRESHOLD
    const blockReason  = blocked
      ? `Wallet risk score ${score}/100 exceeds threshold. Matched: ${matchedLists.join(', ') || 'proprietary risk database'}.`
      : undefined

    result = makeResult(address, chainId, score, matchedLists, blocked, blockReason)
  }

  _cache.set(key, { result, ts: Date.now() })
  return result
}

function makeResult(
  address:      string,
  chainId:      number,
  riskScore:    number,
  matchedLists: string[],
  blocked:      boolean,
  blockReason?: string,
): WalletScreeningResult {
  return {
    address,
    chainName:   chainIdToTrmChain(chainId),
    riskScore,
    riskLevel:   scoreToLevel(riskScore),
    blocked,
    blockReason,
    matchedLists,
    screenedAt:  Date.now(),
  }
}

function extractMatchedLists(indicators: TrmRiskIndicator[]): string[] {
  const SANCTION_CATEGORIES: Record<string, string> = {
    'sanctions':           'OFAC SDN / Sanctions List',
    'terrorist_financing': 'Terrorist Financing',
    'darknet_market':      'Darknet Market',
    'mixer':               'Mixer / Tumbler',
    'ransomware':          'Ransomware',
    'scam':                'Scam / Fraud',
    'stolen_funds':        'Stolen Funds',
  }

  const found = new Set<string>()
  for (const ind of indicators) {
    const label = SANCTION_CATEGORIES[ind.categoryId] || ind.category
    if (label) found.add(label)
  }
  return Array.from(found)
}

/** Evict a single address from the cache (e.g., after a CNMR/PNMR match is cleared). */
export function evictScreeningCache(address: string, chainId: number) {
  _cache.delete(cacheKey(address, chainId))
}
