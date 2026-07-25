/**
 * MarketEngine contract integration helpers
 *
 * Low-level typed wrappers around wagmi's useReadContract / useWriteContract.
 * These functions are consumed by useMarketEngine hook and other hooks.
 *
 * Contract: MarketEngineDispatcher (UUPS proxy + module pattern)
 * Chain:    Arbitrum One (42161) / Arbitrum Sepolia (421614)
 */
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, keccak256, toBytes } from 'viem'
import type { Address } from 'viem'
import { ABIS, getMarketEngineAddress }    from '@/contracts/config'
import { STAKE_TOKEN_DECIMALS, formatUsdc } from '@/config/tokens'
import type {
  Epoch,
  EpochDisplay,
  RollingLifecycle,
  VaultBalances,
  EpochState,
  RollingPhase,
} from '@/types/engine'

// ── templateId computation ────────────────────────────────────────────────────

/**
 * Computes on-chain templateId = keccak256(bytes(slug)).
 * Matches MarketEngineState: `keccak256(bytes(slug))`.
 */
export function computeTemplateId(slug: string): `0x${string}` {
  return keccak256(toBytes(slug))
}

// ── Read hooks ────────────────────────────────────────────────────────────────

/** Read stakeToken address from the engine (should match USDC on deployment chain). */
export function useStakeToken(chainId: number) {
  return useReadContract({
    address:      getMarketEngineAddress(chainId),
    abi:          ABIS.MarketEngineDispatcher,
    functionName: 'stakeToken',
    chainId,
  })
}

/** Read whether a given address is a registered deposit executor. */
export function useIsDepositExecutor(address: Address | undefined, chainId: number) {
  return useReadContract({
    address:      getMarketEngineAddress(chainId),
    abi:          ABIS.MarketEngineDispatcher,
    functionName: 'isDepositExecutor',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
    chainId,
  })
}

/** Read full Epoch struct for (templateId, epochId). */
export function useEpoch(
  templateId: `0x${string}` | undefined,
  epochId:    bigint | undefined,
  chainId:    number,
) {
  return useReadContract({
    address:      getMarketEngineAddress(chainId),
    abi:          ABIS.MarketEngineDispatcher,
    functionName: 'getEpoch',
    args:         templateId && epochId !== undefined ? [templateId, epochId] : undefined,
    query:        { enabled: !!templateId && epochId !== undefined },
    chainId,
  })
}

/** Read VaultBalances for a template. */
export function useVaultBalances(templateId: `0x${string}` | undefined, chainId: number) {
  return useReadContract({
    address:      getMarketEngineAddress(chainId),
    abi:          ABIS.MarketEngineDispatcher,
    functionName: 'getVaultBalances',
    args:         templateId ? [templateId] : undefined,
    query:        { enabled: !!templateId },
    chainId,
  })
}

/** Read RollingLifecycle for a template. */
export function useRollingLifecycle(templateId: `0x${string}` | undefined, chainId: number) {
  return useReadContract({
    address:      getMarketEngineAddress(chainId),
    abi:          ABIS.MarketEngineDispatcher,
    functionName: 'getRollingLifecycle',
    args:         templateId ? [templateId] : undefined,
    query:        { enabled: !!templateId },
    chainId,
  })
}

/** Read epoch IDs a user has participated in for a template. */
export function useUserEpochs(
  userAddress: Address | undefined,
  templateId:  `0x${string}` | undefined,
  chainId:     number,
) {
  return useReadContract({
    address:      getMarketEngineAddress(chainId),
    abi:          ABIS.MarketEngineDispatcher,
    functionName: 'getUserEpochs',
    args:         userAddress && templateId ? [userAddress, templateId] : undefined,
    query:        { enabled: !!userAddress && !!templateId },
    chainId,
  })
}

/** Read USDC allowance — how much user has approved the MarketEngine to spend. */
export function useUsdcAllowance(
  userAddress:  Address | undefined,
  usdcAddress:  Address,
  chainId:      number,
) {
  const engineAddress = getMarketEngineAddress(chainId)
  return useReadContract({
    address:      usdcAddress,
    abi:          ABIS.ERC20,
    functionName: 'allowance',
    args:         userAddress ? [userAddress, engineAddress] : undefined,
    query:        { enabled: !!userAddress },
    chainId,
  })
}

/** Read user's USDC balance. */
export function useUsdcBalance(
  userAddress: Address | undefined,
  usdcAddress: Address,
  chainId:     number,
) {
  return useReadContract({
    address:      usdcAddress,
    abi:          ABIS.ERC20,
    functionName: 'balanceOf',
    args:         userAddress ? [userAddress] : undefined,
    query:        { enabled: !!userAddress },
    chainId,
  })
}

// ── Write hooks ───────────────────────────────────────────────────────────────

/** Approve MarketEngine to spend USDC (call before depositToSide). */
export function useApproveUsdc(usdcAddress: Address, chainId: number) {
  const engineAddress = getMarketEngineAddress(chainId)
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  async function approve(amount: bigint) {
    return writeContractAsync({
      address:      usdcAddress,
      abi:          ABIS.ERC20,
      functionName: 'approve',
      args:         [engineAddress, amount],
      chainId,
    })
  }

  return { approve, isPending, isConfirming, isSuccess, txHash, error }
}

/** Call depositToSide on the engine (user must have approved USDC first). */
export function useDepositToSide(chainId: number) {
  const engineAddress = getMarketEngineAddress(chainId)
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  async function deposit(
    templateId:   `0x${string}`,
    epochId:      bigint,
    outcomeIndex: number,
    amount:       bigint,
  ) {
    return writeContractAsync({
      address:      engineAddress,
      abi:          ABIS.MarketEngineDispatcher,
      functionName: 'depositToSide',
      args:         [templateId, epochId, outcomeIndex, amount],
      chainId,
    })
  }

  return { deposit, isPending, isConfirming, isSuccess, txHash, error }
}

/** Call switchSide — move stake from one outcome to another within an open epoch. */
export function useSwitchSide(chainId: number) {
  const engineAddress = getMarketEngineAddress(chainId)
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  async function switchSide(
    templateId:       `0x${string}`,
    epochId:          bigint,
    fromOutcomeIndex: number,
    toOutcomeIndex:   number,
    amount:           bigint,
  ) {
    return writeContractAsync({
      address:      engineAddress,
      abi:          ABIS.MarketEngineDispatcher,
      functionName: 'switchSide',
      args:         [templateId, epochId, fromOutcomeIndex, toOutcomeIndex, amount],
      chainId,
    })
  }

  return { switchSide, isPending, isConfirming, isSuccess, txHash, error }
}

/** Claim winnings for a single (templateId, epochId). */
export function useClaim(chainId: number) {
  const engineAddress = getMarketEngineAddress(chainId)
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  async function claim(templateId: `0x${string}`, epochId: bigint) {
    return writeContractAsync({
      address:      engineAddress,
      abi:          ABIS.MarketEngineDispatcher,
      functionName: 'claim',
      args:         [templateId, epochId],
      chainId,
    })
  }

  return { claim, isPending, isConfirming, isSuccess, txHash, error }
}

/** Batch-claim across multiple (templateId, epochId) pairs. */
export function useClaimMany(chainId: number) {
  const engineAddress = getMarketEngineAddress(chainId)
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  async function claimMany(
    templateIds: `0x${string}`[],
    epochIds:    bigint[],
  ) {
    return writeContractAsync({
      address:      engineAddress,
      abi:          ABIS.MarketEngineDispatcher,
      functionName: 'claimMany',
      args:         [templateIds, epochIds],
      chainId,
    })
  }

  return { claimMany, isPending, isConfirming, isSuccess, txHash, error }
}

// ── Display helpers ───────────────────────────────────────────────────────────

const EPOCH_STATE_LABELS: Record<number, string> = {
  0: 'Uninitialized',
  1: 'Open',
  2: 'Locked',
  3: 'Resolved',
  4: 'Cancelled',
}

export function formatEpochDisplay(
  templateId: `0x${string}`,
  epochId:    number,
  raw:        Epoch,
): EpochDisplay {
  const now = Date.now() / 1000
  const lockAt    = Number(raw.lockAt)
  const resolveAt = Number(raw.resolveAt)

  let timeRemaining = ''
  if (raw.state === 1 /* Open */) {
    const secs = Math.max(0, lockAt - now)
    timeRemaining = formatCountdown(secs)
  } else if (raw.state === 2 /* Locked */) {
    const secs = Math.max(0, resolveAt - now)
    timeRemaining = `Resolves in ${formatCountdown(secs)}`
  }

  return {
    templateId,
    epochId,
    state:          raw.state as EpochState,
    stateLabel:     EPOCH_STATE_LABELS[raw.state] || 'Unknown',
    totalPool:      formatUsdc(raw.totalPool),
    winningOutcome: raw.winningOutcome,
    openAt:         new Date(Number(raw.openAt) * 1000),
    lockAt:         new Date(lockAt * 1000),
    resolveAt:      new Date(resolveAt * 1000),
    outcomePools:   raw.outcomePools.map(p => formatUsdc(p)),
    timeRemaining,
  }
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
