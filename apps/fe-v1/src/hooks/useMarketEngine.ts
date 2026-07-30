/**
 * useMarketEngine — High-level MarketEngine interaction hook
 *
 * Orchestrates the full deposit flow with USDC approval management:
 *   1. Check USDC balance
 *   2. Check existing allowance
 *   3. Approve if allowance < amount
 *   4. Call depositToSide
 *
 * Also exposes claim, switchSide, and epoch reads.
 *
 * Usage:
 *   const engine = useMarketEngine()
 *   await engine.deposit({ templateId, epochId, outcomeIndex, amount })
 */
import { useCallback, useMemo }    from 'react'
import { useAccount, useChainId }  from 'wagmi'
import {
  useApproveUsdc,
  useDepositToSide,
  useSwitchSide,
  useClaim,
  useClaimMany,
  useUsdcAllowance,
  useUsdcBalance,
  useEpoch,
  useVaultBalances,
  useRollingLifecycle,
  useUserEpochs,
  computeTemplateId,
  formatEpochDisplay,
} from '@/lib/contracts/marketEngine'
import { DEPLOYMENT_CHAIN_ID }      from '@/config/chains'
import { getStakeTokenAddress }     from '@/config/tokens'
import type { DepositParams, SwitchSideParams, ClaimParams } from '@/types/engine'

export function useMarketEngine() {
  const { address } = useAccount()
  const chainId     = useChainId()

  const usdcAddress = useMemo(() => {
    try { return getStakeTokenAddress(chainId) }
    catch { return getStakeTokenAddress(DEPLOYMENT_CHAIN_ID) }
  }, [chainId])

  const balance   = useUsdcBalance(address, usdcAddress, chainId)
  const allowance = useUsdcAllowance(address, usdcAddress, chainId)

  const approveHook  = useApproveUsdc(usdcAddress, chainId)
  const depositHook  = useDepositToSide(chainId)
  const switchHook   = useSwitchSide(chainId)
  const claimHook    = useClaim(chainId)
  const claimManyHk  = useClaimMany(chainId)

  // ── Deposit flow (approve + deposit) ────────────────────────────────────────

  const deposit = useCallback(async (params: DepositParams) => {
    const { templateId, epochId, outcomeIndex, amount } = params

    const currentAllowance = (allowance.data as bigint | undefined) ?? 0n

    // Approve if needed — use MaxUint256 for gas efficiency in future txs
    if (currentAllowance < amount) {
      await approveHook.approve(
        BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
      )
      // Wait for approval to be picked up; wagmi auto-refetches allowance
      await new Promise(resolve => setTimeout(resolve, 2_000))
    }

    return depositHook.deposit(templateId, epochId, outcomeIndex, amount)
  }, [allowance.data, approveHook, depositHook])

  // ── Switch side ─────────────────────────────────────────────────────────────

  const switchSide = useCallback(async (params: SwitchSideParams) => {
    const { templateId, epochId, fromOutcomeIndex, toOutcomeIndex, amount } = params
    return switchHook.switchSide(templateId, epochId, fromOutcomeIndex, toOutcomeIndex, amount)
  }, [switchHook])

  // ── Claim ────────────────────────────────────────────────────────────────────

  const claim = useCallback(async (params: ClaimParams) => {
    return claimHook.claim(params.templateId, params.epochId)
  }, [claimHook])

  const claimMany = useCallback(async (params: ClaimParams[]) => {
    return claimManyHk.claimMany(
      params.map(p => p.templateId),
      params.map(p => p.epochId),
    )
  }, [claimManyHk])

  // ── Convenience states ───────────────────────────────────────────────────────

  const isDepositing  = approveHook.isPending || approveHook.isConfirming ||
                        depositHook.isPending  || depositHook.isConfirming
  const isSwitching   = switchHook.isPending   || switchHook.isConfirming
  const isClaiming    = claimHook.isPending    || claimHook.isConfirming ||
                        claimManyHk.isPending  || claimManyHk.isConfirming

  return {
    // ── User balances
    usdcBalance:    balance.data   as bigint | undefined,
    usdcAllowance:  allowance.data as bigint | undefined,
    usdcAddress,

    // ── Actions
    deposit,
    switchSide,
    claim,
    claimMany,

    // ── States
    isDepositing,
    isSwitching,
    isClaiming,
    depositTxHash:  depositHook.txHash,
    claimTxHash:    claimHook.txHash,

    // ── Errors
    depositError:   depositHook.error || approveHook.error,
    claimError:     claimHook.error,
    switchError:    switchHook.error,

    // ── Read helpers
    useEpoch:           (templateId: `0x${string}`, epochId: bigint) =>
                          useEpoch(templateId, epochId, chainId),
    useVaultBalances:   (templateId: `0x${string}`) =>
                          useVaultBalances(templateId, chainId),
    useRollingLifecycle:(templateId: `0x${string}`) =>
                          useRollingLifecycle(templateId, chainId),
    useUserEpochs:      (templateId: `0x${string}`) =>
                          useUserEpochs(address, templateId, chainId),

    // ── Utilities
    computeTemplateId,
    formatEpochDisplay,
  }
}
