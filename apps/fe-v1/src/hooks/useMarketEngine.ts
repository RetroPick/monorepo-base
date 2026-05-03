/**
 * useMarketEngine — High-level MarketEngine interaction hook
 *
 * Orchestrates the full deposit flow with USDC approval management:
 *   1. Check USDC balance
 *   2. Check existing allowance
 *   3. Approve (max) if allowance < amount, wait for the approval tx receipt, refetch allowance
 *   4. User clicks again to call depositToSide. Keeping the second wallet prompt tied to
 *      a fresh click avoids popup blocking in injected / embedded wallet connectors.
 *
 * Also exposes claim, switchSide, and epoch reads.
 *
 * Usage:
 *   const engine = useMarketEngine()
 *   await engine.deposit({ templateId, epochId, outcomeIndex, amount })
 */
import { useCallback, useMemo }    from 'react'
import { useAccount, useChainId, usePublicClient, useSendCalls } from 'wagmi'
import { encodeFunctionData, maxUint256 } from 'viem'
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
import { ABIS, getMarketEngineAddress } from '@/contracts/config'

export function useMarketEngine() {
  const { address } = useAccount()
  const chainId     = useChainId()
  const publicClient = usePublicClient({ chainId })

  const usdcAddress = useMemo(() => {
    try { return getStakeTokenAddress(chainId) }
    catch { return getStakeTokenAddress(DEPLOYMENT_CHAIN_ID) }
  }, [chainId])

  const balance   = useUsdcBalance(address, usdcAddress, chainId)
  const allowanceQ = useUsdcAllowance(address, usdcAddress, chainId)

  const approveHook  = useApproveUsdc(usdcAddress, chainId)
  const depositHook  = useDepositToSide(chainId)
  const sendCallsHook = useSendCalls()
  const switchHook   = useSwitchSide(chainId)
  const claimHook    = useClaim(chainId)
  const claimManyHk  = useClaimMany(chainId)

  // ── Deposit flow (approve + deposit) ────────────────────────────────────────

  const approveDepositSpending = useCallback(async (amount: bigint) => {
    const currentAllowance = (allowanceQ.data as bigint | undefined) ?? 0n
    if (currentAllowance >= amount) return undefined

    const approveHash = await approveHook.approve(maxUint256)
    if (!publicClient) {
      throw new Error("No RPC client: sign in again and try again.");
    }
    const receipt = await publicClient.waitForTransactionReceipt({ hash: approveHash })
    if (receipt.status === 'reverted') {
      throw new Error('Stake token approval transaction reverted')
    }
    await allowanceQ.refetch()
    const engineAddr = getMarketEngineAddress(chainId)
    let liveAllowance = (allowanceQ.data as bigint | undefined) ?? 0n
    if (publicClient && address) {
      // viem client typings may require `authorizationList` even for plain reads on some versions
      liveAllowance = (await publicClient.readContract({
        address: usdcAddress,
        abi: ABIS.ERC20,
        functionName: 'allowance',
        args: [address, engineAddr],
      } as never)) as bigint
    }
    if (liveAllowance < amount) {
      throw new Error(
        'USDC allowance is still below this amount after approval (chain may be catching up). Wait a few seconds and tap Buy again.',
      )
    }
    return approveHash
  }, [address, allowanceQ.data, allowanceQ.refetch, approveHook, chainId, publicClient, usdcAddress])

  const depositApproved = useCallback(async (params: DepositParams) => {
    const { templateId, epochId, outcomeIndex, amount } = params
    return depositHook.deposit(templateId, epochId, outcomeIndex, amount)
  }, [depositHook])

  const batchApproveAndDeposit = useCallback(async (params: DepositParams) => {
    const engineAddress = getMarketEngineAddress(chainId)
    const result = await sendCallsHook.sendCallsAsync({
      chainId,
      forceAtomic: true,
      calls: [
        {
          to: usdcAddress,
          data: encodeFunctionData({
            abi: ABIS.ERC20,
            functionName: 'approve',
            args: [engineAddress, maxUint256],
          }),
        },
        {
          to: engineAddress,
          data: encodeFunctionData({
            abi: ABIS.MarketEngine,
            functionName: 'depositToSide',
            args: [params.templateId, params.epochId, params.outcomeIndex, params.amount],
          }),
        },
      ],
    })
    return result.id as `0x${string}`
  }, [chainId, sendCallsHook, usdcAddress])

  const deposit = useCallback(async (params: DepositParams) => {
    await approveDepositSpending(params.amount)
    return depositApproved(params)
  }, [approveDepositSpending, depositApproved])


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
    const byTemplate = new Map<`0x${string}`, bigint[]>()
    for (const p of params) {
      const list = byTemplate.get(p.templateId) ?? []
      list.push(p.epochId)
      byTemplate.set(p.templateId, list)
    }
    let lastHash: `0x${string}` | undefined
    for (const [templateId, epochIds] of byTemplate) {
      lastHash = await claimManyHk.claimMany(templateId, epochIds)
    }
    return lastHash
  }, [claimManyHk])

  // ── Convenience states ───────────────────────────────────────────────────────

  const isApprovingDeposit = approveHook.isPending || approveHook.isConfirming
  const isDepositing  = depositHook.isPending || depositHook.isConfirming
  const isBatchingDeposit = sendCallsHook.isPending
  const isSwitching   = switchHook.isPending   || switchHook.isConfirming
  const isClaiming    = claimHook.isPending    || claimHook.isConfirming ||
                        claimManyHk.isPending  || claimManyHk.isConfirming

  return {
    // ── User balances
    usdcBalance:    balance.data   as bigint | undefined,
    usdcAllowance:  allowanceQ.data as bigint | undefined,
    refetchUsdcAllowance: allowanceQ.refetch,
    usdcAddress,

    // ── Actions
    deposit,
    approveDepositSpending,
    depositApproved,
    batchApproveAndDeposit,
    switchSide,
    claim,
    claimMany,

    // ── States
    isApprovingDeposit,
    isBatchingDeposit,
    isDepositing,
    isSwitching,
    isClaiming,
    depositTxHash:  depositHook.txHash,
    claimTxHash:    claimHook.txHash,

    // ── Errors
    depositError:   depositHook.error || approveHook.error || sendCallsHook.error,
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
