/**
 * useAmlCheck — Combined AML compliance hook
 *
 * Runs both layers of the AML policy's dual-layer enforcement:
 *   Layer 1: IP geofencing (§5)  — blocked if country is on hard-block list
 *   Layer 2: Wallet screening (§6) — blocked if TRM score ≥ 80 or sanctions match
 *
 * Usage:
 *   const { isBlocked, blockReason, isLoading, isEnhancedMonitoring } = useAmlCheck()
 *
 *   Render a <GeofenceBlockScreen> or <WalletBlockScreen> when isBlocked is true.
 */
import { useEffect, useState, useRef } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { checkGeofence }  from '@/lib/aml/geofencing'
import { screenWallet }   from '@/lib/aml/wallet-screening'

export type AmlStatus =
  | 'idle'
  | 'checking_geo'
  | 'checking_wallet'
  | 'allowed'
  | 'blocked_geo'
  | 'blocked_wallet'
  | 'error'

export interface AmlCheckResult {
  status:              AmlStatus
  isLoading:           boolean
  isBlocked:           boolean
  blockReason:         string | undefined
  countryCode:         string | undefined
  isEnhancedMonitoring: boolean
  /** Risk score 0–100; undefined until wallet screened */
  walletRiskScore:     number | undefined
  /** Re-run checks manually (e.g., after wallet switch) */
  recheck:             () => void
}

export function useAmlCheck(): AmlCheckResult {
  const { address, isConnected } = useAccount()
  const chainId                  = useChainId()

  const [status,       setStatus]       = useState<AmlStatus>('idle')
  const [blockReason,  setBlockReason]  = useState<string | undefined>()
  const [countryCode,  setCountryCode]  = useState<string | undefined>()
  const [isEnhanced,   setIsEnhanced]   = useState(false)
  const [riskScore,    setRiskScore]    = useState<number | undefined>()
  const [recheckKey,   setRecheckKey]   = useState(0)

  const lastAddressRef = useRef<string | undefined>()

  useEffect(() => {
    let cancelled = false

    async function run() {
      // ── Layer 1: Geofencing ────────────────────────────────────────────────
      setStatus('checking_geo')
      const geo = await checkGeofence()

      if (cancelled) return

      setCountryCode(geo.countryCode)

      if (!geo.allowed) {
        setBlockReason(geo.reason)
        setStatus('blocked_geo')
        return
      }

      setIsEnhanced(geo.isEnhancedMonitoring)

      // ── Layer 2: Wallet screening (only when wallet is connected) ──────────
      if (!isConnected || !address) {
        setStatus('allowed')
        return
      }

      // Skip re-screening if same address and already screened
      if (lastAddressRef.current === address && status === 'allowed') return

      setStatus('checking_wallet')
      const screening = await screenWallet(address, chainId)

      if (cancelled) return

      lastAddressRef.current = address
      setRiskScore(screening.riskScore)

      if (screening.blocked) {
        setBlockReason(screening.blockReason)
        setStatus('blocked_wallet')
        return
      }

      setBlockReason(undefined)
      setStatus('allowed')
    }

    run().catch(() => {
      if (!cancelled) setStatus('error')
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId, isConnected, recheckKey])

  return {
    status,
    isLoading:            status === 'checking_geo' || status === 'checking_wallet',
    isBlocked:            status === 'blocked_geo'  || status === 'blocked_wallet',
    blockReason,
    countryCode,
    isEnhancedMonitoring: isEnhanced,
    walletRiskScore:      riskScore,
    recheck:              () => setRecheckKey(k => k + 1),
  }
}
