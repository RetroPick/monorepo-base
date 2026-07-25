/**
 * useCrossChainDeposit
 *
 * Tier A cross-chain deposit flow (frontend-only, per abstraction docs):
 *
 *   1. Fetch bridge route  (LiFi: tokenIn/chainId → Arbitrum USDC)
 *   2. User approves tokenIn (if ERC-20)
 *   3. Execute LiFi route (writes tx on source chain)
 *   4. Poll for destination USDC arrival
 *   5. Call depositToSide on MarketEngine with received USDC
 *
 * For Tier C (router + depositToSideFor), step 5 is handled by the router.
 *
 * The hook only manages state for steps 1–4.
 * Step 5 is handled separately by useMarketEngine.depositToSide().
 */
import { useState, useCallback } from 'react'
import { useAccount, useChainId, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { encodeFunctionData, erc20Abi } from 'viem'
import type { Address } from 'viem'
import type { BridgeRoute, BridgeStatus } from '@/lib/bridge/types'
import {
  createFundingIntentV2,
  fetchFundingExecution,
  fetchFundingOptionsV2,
  markFundingExecutionStartedV2,
  markFundingRouteUpdateV2,
  markFundingSourceTxV2,
  scanFundingIntentBalances,
  selectFundingOption,
} from '@/lib/api/retropickApi'

export interface CrossChainDepositState {
  status:            BridgeStatus
  route:             BridgeRoute | null
  approveTxHash:     `0x${string}` | undefined
  bridgeTxHash:      `0x${string}` | undefined
  receivedUsdc:      bigint | undefined  // USDC received on Arbitrum after bridge
  error:             string | undefined
  fundingIntentId:   string | undefined
  executionId:       string | undefined
}

export interface CrossChainDepositActions {
  /** Step 1: fetch the best LiFi route for the user's selected token + chain */
  fetchRoute: (
    fromChainId:      number,
    fromTokenAddress: Address,
    fromAmount:       bigint,
  ) => Promise<BridgeRoute | null>

  /** Step 2+3: approve tokenIn (if needed) and execute the bridge route */
  executeBridge: () => Promise<void>

  reset: () => void
}

const INITIAL_STATE: CrossChainDepositState = {
  status:         'idle',
  route:          null,
  approveTxHash:  undefined,
  bridgeTxHash:   undefined,
  receivedUsdc:   undefined,
  error:          undefined,
  fundingIntentId: undefined,
  executionId: undefined,
}

export function useCrossChainDeposit(): [CrossChainDepositState, CrossChainDepositActions] {
  const { address } = useAccount()
  const chainId     = useChainId()
  const { sendTransactionAsync } = useSendTransaction()

  const [state, setState] = useState<CrossChainDepositState>(INITIAL_STATE)

  const fetchRoute = useCallback(async (
    fromChainId:      number,
    fromTokenAddress: Address,
    fromAmount:       bigint,
  ): Promise<BridgeRoute | null> => {
    if (!address) return null

    setState(s => ({ ...s, status: 'fetching_routes', error: undefined }))

    try {
      const intent = await createFundingIntentV2({
        userAddress: address,
        targetCurrency: "USD",
        targetAmount: (Number(fromAmount) / 1_000_000).toFixed(2),
        clientNonce: crypto.randomUUID(),
        mode: "AUTO_BEST_SOURCE",
      })
      await scanFundingIntentBalances(intent.intentId)
      const options = await fetchFundingOptionsV2(intent.intentId)
      const selected = options.options[0]
      let executionId: string | undefined
      let route: BridgeRoute | null = null
      if (selected) {
        const selectedResp = await selectFundingOption(intent.intentId, { optionId: selected.optionId })
        executionId = selectedResp.execution.executionId
        const execution = await fetchFundingExecution(executionId)
        route = bridgeRouteFromExecution(execution.serializedRoute)
      }

      if (!route) {
        setState(s => ({ ...s, status: 'failed', error: 'No executable backend route available; please refresh options.' }))
        return null
      }

      setState(s => ({ ...s, status: 'awaiting_approval', route, fundingIntentId: intent.intentId, executionId }))
      return route
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch route'
      setState(s => ({ ...s, status: 'failed', error: msg }))
      return null
    }
  }, [address])

  const executeBridge = useCallback(async () => {
    const { route, fundingIntentId, executionId } = state
    if (!route || !address) return

    try {
      // ── Step 2: Approve tokenIn if ERC-20 (not native ETH) ───────────────
      const rawRoute = route.raw as {
        steps: Array<{
          action: { fromToken: { address: string; chainId: number } }
          transactionRequest?: { to: string; data: string; value?: string }
        }>
        fromAmountUSD?: string
      }

      const firstStep        = rawRoute.steps[0]
      const fromTokenAddress = firstStep?.action.fromToken.address as Address
      const isNativeEth      = fromTokenAddress === '0x0000000000000000000000000000000000000000' ||
                               fromTokenAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

      if (!isNativeEth && firstStep?.transactionRequest?.to) {
        setState(s => ({ ...s, status: 'approving' }))

        // Approve the LiFi router to spend tokenIn
        const spender = firstStep.transactionRequest.to as Address
        const approveData = encodeFunctionData({
          abi:          erc20Abi,
          functionName: 'approve',
          args:         [spender, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
        })

        const approveTx = await sendTransactionAsync({
          to:   fromTokenAddress,
          data: approveData,
        })
        setState(s => ({ ...s, approveTxHash: approveTx }))

        // Brief wait for approval to propagate (not waiting for full confirmation)
        await new Promise(resolve => setTimeout(resolve, 3_000))
      }

      // ── Step 3: Execute the LiFi route transaction ────────────────────────
      setState(s => ({ ...s, status: 'executing' }))
      if (executionId) {
        await markFundingExecutionStartedV2(executionId, {
          walletAddress: address,
          clientRouteExecutionId: crypto.randomUUID(),
          idempotencyKey: crypto.randomUUID(),
        })
      }

      const txRequest = firstStep?.transactionRequest
      if (!txRequest?.to || !txRequest.data) {
        throw new Error('Invalid route: no transaction request from LiFi')
      }

      const bridgeTx = await sendTransactionAsync({
        to:    txRequest.to as Address,
        data:  txRequest.data as `0x${string}`,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
      })

      setState(s => ({ ...s, status: 'pending_bridge', bridgeTxHash: bridgeTx }))
      if (executionId) {
        await markFundingSourceTxV2(executionId, {
          chainId,
          txHash: bridgeTx,
          idempotencyKey: crypto.randomUUID(),
        })
        await markFundingRouteUpdateV2(executionId, {
          idempotencyKey: crypto.randomUUID(),
          status: 'BRIDGING',
          observedTxHashes: [{ chainId, txHash: bridgeTx, stepIndex: 0, type: 'SOURCE' }],
        })
      }

      // ── Step 4: Mark as done; UI should poll for USDC arrival ────────────
      // In production, use LiFi status API: GET /status?txHash=...
      // Here we set status to 'done' optimistically; the deposit step
      // (useMarketEngine.depositToSide) will validate the balance before depositing.
      setState(s => ({ ...s, status: 'done' }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bridge transaction failed'
      setState(s => ({ ...s, status: 'failed', error: msg }))
    }
  }, [state, address, sendTransactionAsync])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return [state, { fetchRoute, executeBridge, reset }]
}

function bridgeRouteFromExecution(serializedRoute: unknown): BridgeRoute | null {
  if (!serializedRoute || typeof serializedRoute !== 'object') return null
  const route = serializedRoute as {
    id?: string
    toAmount?: string
    toAmountMin?: string
    steps?: Array<{
      type?: string
      tool?: string
      action?: { fromToken?: { symbol?: string }; toToken?: { symbol?: string }; fromAmount?: string }
      estimate?: { toAmountMin?: string; executionDuration?: number; gasCosts?: Array<{ amountUSD?: string }> }
    }>
  }
  const steps = Array.isArray(route.steps) ? route.steps : []
  if (steps.length === 0) return null
  const gasCostUsd = steps
    .reduce((sum, step) => sum + Number(step.estimate?.gasCosts?.[0]?.amountUSD ?? 0), 0)
    .toFixed(2)
  const estimatedDuration = steps.reduce((sum, step) => sum + Number(step.estimate?.executionDuration ?? 0), 0)
  const bridgeStep = steps.find((s) => s.type === 'cross')
  return {
    id: route.id ?? `execution-route-${Date.now()}`,
    toAmountMin: BigInt(route.toAmountMin ?? route.toAmount ?? '0'),
    toAmount: BigInt(route.toAmount ?? route.toAmountMin ?? '0'),
    gasCostUsd,
    estimatedDuration,
    bridgeName: bridgeStep?.tool ?? steps[0]?.tool ?? 'LiFi',
    steps: steps.map((s) => ({
      type: s.type === 'cross' ? 'cross' : 'swap',
      tool: s.tool ?? 'unknown',
      fromToken: s.action?.fromToken?.symbol ?? 'unknown',
      toToken: s.action?.toToken?.symbol ?? 'unknown',
      fromAmount: s.action?.fromAmount ?? '0',
      toAmountMin: s.estimate?.toAmountMin ?? '0',
    })),
    raw: serializedRoute,
  }
}
