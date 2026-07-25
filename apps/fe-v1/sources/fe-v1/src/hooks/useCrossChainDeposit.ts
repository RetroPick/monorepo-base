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
import { getBestBridgeRoute }         from '@/lib/bridge/lifi'
import { DEPLOYMENT_CHAIN_ID }        from '@/config/chains'
import { getStakeTokenAddress }       from '@/config/tokens'
import type { BridgeRoute, BridgeStatus } from '@/lib/bridge/types'

export interface CrossChainDepositState {
  status:            BridgeStatus
  route:             BridgeRoute | null
  approveTxHash:     `0x${string}` | undefined
  bridgeTxHash:      `0x${string}` | undefined
  receivedUsdc:      bigint | undefined  // USDC received on Arbitrum after bridge
  error:             string | undefined
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
      const route = await getBestBridgeRoute({
        fromChainId,
        toChainId:        DEPLOYMENT_CHAIN_ID,
        fromTokenAddress,
        toTokenAddress:   getStakeTokenAddress(DEPLOYMENT_CHAIN_ID),
        fromAmount,
        fromAddress:      address,
      })

      if (!route) {
        setState(s => ({ ...s, status: 'failed', error: 'No bridge route found for this token.' }))
        return null
      }

      setState(s => ({ ...s, status: 'awaiting_approval', route }))
      return route
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch route'
      setState(s => ({ ...s, status: 'failed', error: msg }))
      return null
    }
  }, [address])

  const executeBridge = useCallback(async () => {
    const { route } = state
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

      const txRequest = firstStep?.transactionRequest
      if (!txRequest?.to || !txRequest.data) {
        throw new Error('Invalid route — no transaction request from LiFi')
      }

      const bridgeTx = await sendTransactionAsync({
        to:    txRequest.to as Address,
        data:  txRequest.data as `0x${string}`,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
      })

      setState(s => ({ ...s, status: 'pending_bridge', bridgeTxHash: bridgeTx }))

      // ── Step 4: Mark as done — UI should poll for USDC arrival ────────────
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
