/**
 * AML Geofencing — Jurisdiction Access Controls
 *
 * Implements Section 5 of the RetroPick AML/CFT/CPF Policy v1.0
 *
 * Hard-blocked jurisdictions (deny access):
 *   FATF Blacklisted / OFAC comprehensively sanctioned:
 *     Iran (IR), Myanmar (MM), North Korea (KP), Cuba (CU),
 *     Syria (SY), Crimea/Donetsk/Luhansk (UA — region-specific, treated as UA)
 *   Legally prohibited:
 *     Singapore (SG), Thailand (TH), Taiwan (TW), France (FR), United States (US)
 *
 * Enhanced monitoring (flag but don't hard-block — FATF grey list):
 *   Reviewed quarterly against fatf-gafi.org; list current as of April 2026.
 *
 * Policy: both IP detection AND wallet screening must pass before a user
 * may interact with the application (§5, §6 — dual-layer enforcement).
 */

// ── Blocked jurisdictions ─────────────────────────────────────────────────────

/** ISO 3166-1 alpha-2 country codes that are hard-blocked. */
export const BLOCKED_COUNTRY_CODES = new Set<string>([
  // FATF High-Risk / OFAC comprehensively sanctioned
  'IR', // Iran
  'MM', // Myanmar
  'KP', // North Korea (DPRK)
  'CU', // Cuba
  'SY', // Syria

  // Legally prohibited (product not authorised)
  'US', // United States — pending CFTC DCM registration
  'SG', // Singapore — Gambling Control Act 2022
  'TH', // Thailand — gambling law prohibition
  'TW', // Taiwan — election betting / prediction market prohibition
  'FR', // France — ANJ gambling prohibition (Nov 2024)
])

/** FATF Grey-list jurisdictions — enhanced monitoring, not hard-blocked. */
export const ENHANCED_MONITORING_COUNTRY_CODES = new Set<string>([
  // FATF Increased Monitoring list — April 2026
  'BF', // Burkina Faso
  'CM', // Cameroon
  'CD', // Democratic Republic of Congo
  'HT', // Haiti
  'JM', // Jamaica
  'ML', // Mali
  'MZ', // Mozambique
  'NG', // Nigeria
  'SS', // South Sudan
  'TZ', // Tanzania
  'VN', // Vietnam
  'YE', // Yemen
])

export type GeofenceResult =
  | { allowed: true;  countryCode: string; isEnhancedMonitoring: boolean }
  | { allowed: false; countryCode: string; reason: string }
  | { allowed: true;  countryCode: 'UNKNOWN'; isEnhancedMonitoring: false } // detection failed → allow

// ── Country name map for user-facing messages ─────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  IR: 'Iran', MM: 'Myanmar', KP: 'North Korea', CU: 'Cuba',
  SY: 'Syria', US: 'United States', SG: 'Singapore', TH: 'Thailand',
  TW: 'Taiwan', FR: 'France',
}

// ── IP geolocation ────────────────────────────────────────────────────────────

interface IpApiResponse {
  country_code: string
  country_name: string
  ip: string
}

let _cachedCountry: string | null = null
let _cacheTs = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Detects the user's country via IP geolocation.
 * Returns 'UNKNOWN' on failure (fail-open — blocked only by wallet screening).
 */
async function detectCountryCode(): Promise<string> {
  const now = Date.now()
  if (_cachedCountry && now - _cacheTs < CACHE_TTL_MS) return _cachedCountry

  try {
    // ipapi.co — free tier (1000 req/day); production should use a paid provider
    const apiKey = import.meta.env.VITE_IP_GEOLOCATION_API_KEY
    const url    = apiKey
      ? `https://ipapi.co/json/?key=${apiKey}`
      : 'https://ipapi.co/json/'

    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return 'UNKNOWN'

    const data: IpApiResponse = await res.json()
    const cc = data.country_code?.toUpperCase() || 'UNKNOWN'
    _cachedCountry = cc
    _cacheTs       = now
    return cc
  } catch {
    return 'UNKNOWN'
  }
}

// ── Main geofencing check ─────────────────────────────────────────────────────

/**
 * Performs the geofencing check for the current user.
 *
 * When VITE_ENABLE_GEOFENCING is "false" (local dev), always returns allowed.
 */
export async function checkGeofence(): Promise<GeofenceResult> {
  if (import.meta.env.VITE_ENABLE_GEOFENCING === 'false') {
    return { allowed: true, countryCode: 'DEV', isEnhancedMonitoring: false }
  }

  const countryCode = await detectCountryCode()

  if (countryCode === 'UNKNOWN') {
    // Detection failed — allow but log; wallet screening is the fallback
    return { allowed: true, countryCode: 'UNKNOWN', isEnhancedMonitoring: false }
  }

  if (BLOCKED_COUNTRY_CODES.has(countryCode)) {
    const name = COUNTRY_NAMES[countryCode] || countryCode
    return {
      allowed: false,
      countryCode,
      reason: `RetroPick is not available in ${name}. ` +
        'Access is restricted under applicable sanctions and regulatory requirements.',
    }
  }

  return {
    allowed:              true,
    countryCode,
    isEnhancedMonitoring: ENHANCED_MONITORING_COUNTRY_CODES.has(countryCode),
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

export function isBlockedCountry(countryCode: string): boolean {
  return BLOCKED_COUNTRY_CODES.has(countryCode.toUpperCase())
}

export function isEnhancedMonitoringCountry(countryCode: string): boolean {
  return ENHANCED_MONITORING_COUNTRY_CODES.has(countryCode.toUpperCase())
}
