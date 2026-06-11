/**
 * MarketEngine contract integration helpers
 *
 * Low-level typed wrappers around wagmi's useReadContract / useWriteContract.
 * ABI: `IMarketEngine` against the UUPS **proxy** (see .dev/abi-map.md).
 */
import {
  useAccount,
  useChainId,
  useConfig,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { keccak256, toBytes } from "viem";
import type { Address } from "viem";
import { ABIS, getMarketEngineAddress } from "@/contracts/config";
import { STAKE_TOKEN_DECIMALS, formatUsdc } from "@/config/tokens";
import type { EpochDisplay, RollingLifecycle, VaultBalances, RollingPhase } from "@/types/engine";
import { EpochState } from "@/types/engine";

/** Matches on-chain `MarketTypes.isEpochOpen`: status Open and `now ∈ [openAt, lockAt)`. */
export function isEpochBettingOpenNow(
  epochRaw: unknown,
  nowSec = BigInt(Math.floor(Date.now() / 1000)),
): boolean {
  const e = asEpochDisplay(epochRaw);
  if (!e) return false;
  if (e.status !== EpochState.Open) return false;
  return nowSec >= e.timing.openAt && nowSec < e.timing.lockAt;
}

export function computeTemplateId(slug: string): `0x${string}` {
  return keccak256(toBytes(slug));
}

function asEpochDisplay(raw: unknown): {
  status: number;
  timing: { openAt: bigint; lockAt: bigint; resolveAt: bigint };
  totalPool: bigint;
  outcomePools: readonly bigint[];
  winningOutcomeMask: bigint;
  outcomeCount: number;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const timing = r.timing as { openAt?: bigint; lockAt?: bigint; resolveAt?: bigint } | undefined;
  const pools = r.outcomePools as readonly bigint[] | undefined;
  // `openAt` may be 0n at genesis; do not use `!timing?.openAt` (0n is falsy).
  if (!timing || timing.openAt === undefined || !pools) return null;
  return {
    status: Number(r.status),
    timing: {
      openAt: timing.openAt,
      lockAt: timing.lockAt ?? 0n,
      resolveAt: timing.resolveAt ?? 0n,
    },
    totalPool: r.totalPool as bigint,
    outcomePools: pools,
    winningOutcomeMask: r.winningOutcomeMask as bigint,
    outcomeCount: Number(r.outcomeCount),
  };
}

export function useStakeToken(chainId: number) {
  return useReadContract({
    address: getMarketEngineAddress(chainId),
    abi: ABIS.MarketEngine,
    functionName: "stakeToken",
    chainId,
  });
}

export function useIsDepositExecutor(address: Address | undefined, chainId: number) {
  return useReadContract({
    address: getMarketEngineAddress(chainId),
    abi: ABIS.MarketEngine,
    functionName: "isDepositExecutor",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
    chainId,
  });
}

export function useEpoch(
  templateId: `0x${string}` | undefined,
  epochId: bigint | undefined,
  chainId: number,
) {
  return useReadContract({
    address: getMarketEngineAddress(chainId),
    abi: ABIS.MarketEngine,
    functionName: "getEpoch",
    args: templateId && epochId !== undefined ? [templateId, epochId] : undefined,
    query: { enabled: !!templateId && epochId !== undefined },
    chainId,
  });
}

export function useVaultBalances(templateId: `0x${string}` | undefined, chainId: number) {
  return useReadContract({
    address: getMarketEngineAddress(chainId),
    abi: ABIS.MarketEngine,
    functionName: "getVaultBalances",
    args: templateId ? [templateId] : undefined,
    query: { enabled: !!templateId },
    chainId,
  });
}

export function useRollingLifecycle(templateId: `0x${string}` | undefined, chainId: number) {
  return useReadContract({
    address: getMarketEngineAddress(chainId),
    abi: ABIS.MarketEngine,
    functionName: "getRollingLifecycle",
    args: templateId ? [templateId] : undefined,
    query: { enabled: !!templateId },
    chainId,
  });
}

/** Matches `IMarketEngine.TemplateYieldView` from `getTemplateYieldView` (see MarketEngineViewModule). */
export type TemplateYieldView = {
  routerAssigned: boolean;
  routerDisabled: boolean;
  recoveryPending: boolean;
  yieldPath: number;
  currentPrincipal: bigint;
  currentValue: bigint;
  unrealizedYieldAmount: bigint;
  yieldRatioE6: bigint;
  scaledPrincipal: bigint;
  stataShares: bigint;
  yieldFeeBpsCurrent: number;
  yieldRouteId: `0x${string}`;
  yieldStrategy: `0x${string}`;
  yieldStrategyKind: number;
  yieldRouteEnabled: boolean;
  yieldRouteLocked: boolean;
  yieldRouteCap: bigint;
};

export function useTemplateYieldView(templateId: `0x${string}` | undefined, chainId: number) {
  return useReadContract({
    address: getMarketEngineAddress(chainId),
    abi: ABIS.MarketEngine,
    functionName: "getTemplateYieldView",
    args: templateId ? [templateId] : undefined,
    query: { enabled: !!templateId },
    chainId,
  });
}

/** `yieldRatioE6 = unrealizedYield * 1e6 / currentPrincipal` → display % = ratio / 10000. */
export function formatYieldRatioPercent(yieldRatioE6: bigint): string {
  if (yieldRatioE6 <= 0n) return "";
  const n = Number(yieldRatioE6) / 10000;
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 0.005) return "<0.01";
  return n >= 10 ? n.toFixed(1) : n.toFixed(2);
}

function formatYieldFeePercent(bps: number): string {
  if (bps <= 0) return "";
  const pct = bps / 100;
  return pct >= 10 || bps % 100 === 0 ? pct.toFixed(0) : pct.toFixed(2);
}

/**
 * Plain-language lines for the trade “Amount” card, driven by `getTemplateYieldView` /
 * `TemplateYieldView` (see package/prediction-v2 `MarketEngineViewModule`).
 */
export function buildYieldAmountHintLines(
  buyMode: "add" | "move",
  view: TemplateYieldView | undefined,
  status: { isLoading: boolean; isError: boolean },
): string[] {
  if (status.isLoading) {
    return ["Checking yield routing on-chain…"];
  }
  if (status.isError || view == null) {
    return [
      buyMode === "add"
        ? "When yield routing is on, pooled USDC can earn passive DeFi yield until settlement. A larger stake increases your share of the epoch pool."
        : "When yield routing is on, returns accrue on routed pool capital until the epoch resolves.",
    ];
  }

  const lines: string[] = [];
  const feeLine =
    view.yieldFeeBpsCurrent > 0
      ? `Protocol yield fee: up to ${formatYieldFeePercent(view.yieldFeeBpsCurrent)}% of gross yield at settlement.`
      : null;

  if (!view.routerAssigned) {
    return [];
  }
  if (view.routerDisabled) {
    lines.push("Yield routing is paused; deposits are held on the engine until routing is restored.");
    return lines;
  }
  if (view.recoveryPending) {
    lines.push(
      "Operator recovery is in progress for routed funds. Check market status before sizing a new deposit.",
    );
    return lines;
  }

  const pct = formatYieldRatioPercent(view.yieldRatioE6);
  if (view.currentPrincipal > 0n) {
    if (pct) {
      lines.push(
        `Routed pool principal shows ~${pct}% unrealized yield (vs. principal) in the engine view. Settlement splits gross yield after fees.`,
      );
    } else {
      lines.push("Routed principal is on deposit; unrealized yield is negligible in this snapshot.");
    }
  } else {
    lines.push(
      buyMode === "add"
        ? "No routed principal yet for this template. Yield appears as the pool routes to DeFi. Adding stake scales the epoch and your position."
        : "No routed principal in this snapshot yet.",
    );
  }

  if (feeLine) lines.push(feeLine);
  if (buyMode === "add") {
    lines.push(
      "Bigger stakes increase how much of the epoch pool is yours if your outcome wins. Any accrued pool yield lifts payouts for participants after fees.",
    );
  }

  return lines;
}

const DEFAULT_USER_EPOCHS_PAGE = 100n;

export function useUserEpochs(
  userAddress: Address | undefined,
  templateId: `0x${string}` | undefined,
  chainId: number,
  cursor = 0n,
  size = DEFAULT_USER_EPOCHS_PAGE,
) {
  return useReadContract({
    address: getMarketEngineAddress(chainId),
    abi: ABIS.MarketEngine,
    functionName: "getUserEpochs",
    args: userAddress && templateId ? [templateId, userAddress, cursor, size] : undefined,
    query: { enabled: !!userAddress && !!templateId },
    chainId,
  });
}

export function useUsdcAllowance(userAddress: Address | undefined, usdcAddress: Address, chainId: number) {
  const engineAddress = getMarketEngineAddress(chainId);
  return useReadContract({
    address: usdcAddress,
    abi: ABIS.ERC20,
    functionName: "allowance",
    args: userAddress ? [userAddress, engineAddress] : undefined,
    query: { enabled: !!userAddress },
    chainId,
  });
}

export function useUsdcBalance(userAddress: Address | undefined, usdcAddress: Address, chainId: number) {
  return useReadContract({
    address: usdcAddress,
    abi: ABIS.ERC20,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
    chainId,
  });
}

export function useApproveUsdc(usdcAddress: Address, chainId: number) {
  const { address } = useAccount();
  const { chains } = useConfig();
  const chain = chains.find((c) => c.id === chainId);
  const engineAddress = getMarketEngineAddress(chainId);
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function approve(amount: bigint) {
    if (!address) throw new Error("Sign in to approve USDC.");
    if (!chain) throw new Error(`Chain ${chainId} is not enabled in the wallet config.`);
    return writeContractAsync({
      address: usdcAddress,
      abi: ABIS.ERC20,
      functionName: "approve",
      args: [engineAddress, amount],
      chain,
      account: address,
    });
  }

  return { approve, isPending, isConfirming, isSuccess, txHash, error };
}

export function useDepositToSide(chainId: number) {
  const { address } = useAccount();
  const connectedChainId = useChainId();
  const { chains } = useConfig();
  const chain = chains.find((c) => c.id === chainId);
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient({ chainId });
  const engineAddress = getMarketEngineAddress(chainId);
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function deposit(
    templateId: `0x${string}`,
    epochId: bigint,
    outcomeIndex: number,
    amount: bigint,
  ) {
    if (!address) throw new Error("Sign in to deposit.");
    if (!chain) throw new Error(`Chain ${chainId} is not enabled in the wallet config.`);

    const yieldToUi = () => new Promise<void>((resolve) => queueMicrotask(resolve));

    if (connectedChainId !== chainId) {
      if (!switchChainAsync) {
        throw new Error(`Switch your wallet to the market chain (chain ${chainId}) and try again.`);
      }
      await switchChainAsync({ chainId });
      await yieldToUi();
    }

    if (publicClient) {
      await publicClient.simulateContract({
        address: engineAddress,
        abi: ABIS.MarketEngine,
        functionName: "depositToSide",
        args: [templateId, epochId, outcomeIndex, amount],
        account: address,
      } as never);
    }

    await yieldToUi();
    return writeContractAsync({
      address: engineAddress,
      abi: ABIS.MarketEngine,
      functionName: "depositToSide",
      args: [templateId, epochId, outcomeIndex, amount],
      chain,
      account: address,
    });
  }

  return { deposit, isPending, isConfirming, isSuccess, txHash, error };
}

export function useSwitchSide(chainId: number) {
  const { address } = useAccount();
  const { chains } = useConfig();
  const chain = chains.find((c) => c.id === chainId);
  const engineAddress = getMarketEngineAddress(chainId);
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function switchSide(
    templateId: `0x${string}`,
    epochId: bigint,
    fromOutcomeIndex: number,
    toOutcomeIndex: number,
    amount: bigint,
  ) {
    if (!address) throw new Error("Sign in to switch sides.");
    if (!chain) throw new Error(`Chain ${chainId} is not enabled in the wallet config.`);
    return writeContractAsync({
      address: engineAddress,
      abi: ABIS.MarketEngine,
      functionName: "switchSide",
      args: [templateId, epochId, fromOutcomeIndex, toOutcomeIndex, amount],
      chain,
      account: address,
    });
  }

  return { switchSide, isPending, isConfirming, isSuccess, txHash, error };
}

export function useClaim(chainId: number) {
  const { address } = useAccount();
  const { chains } = useConfig();
  const chain = chains.find((c) => c.id === chainId);
  const engineAddress = getMarketEngineAddress(chainId);
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function claim(templateId: `0x${string}`, epochId: bigint) {
    if (!address) throw new Error("Sign in to claim.");
    if (!chain) throw new Error(`Chain ${chainId} is not enabled in the wallet config.`);
    return writeContractAsync({
      address: engineAddress,
      abi: ABIS.MarketEngine,
      functionName: "claim",
      args: [templateId, epochId],
      chain,
      account: address,
    });
  }

  return { claim, isPending, isConfirming, isSuccess, txHash, error };
}

/** `claimMany(templateId, epochIds[])`: single template per call. */
export function useClaimMany(chainId: number) {
  const { address } = useAccount();
  const { chains } = useConfig();
  const chain = chains.find((c) => c.id === chainId);
  const engineAddress = getMarketEngineAddress(chainId);
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  async function claimMany(templateId: `0x${string}`, epochIds: bigint[]) {
    if (!address) throw new Error("Sign in to claim.");
    if (!chain) throw new Error(`Chain ${chainId} is not enabled in the wallet config.`);
    return writeContractAsync({
      address: engineAddress,
      abi: ABIS.MarketEngine,
      functionName: "claimMany",
      args: [templateId, epochIds],
      chain,
      account: address,
    });
  }

  return { claimMany, isPending, isConfirming, isSuccess, txHash, error };
}

const EPOCH_STATE_LABELS: Record<number, string> = {
  0: "Scheduled",
  1: "Open",
  2: "Locked",
  3: "Resolved",
  4: "Cancelled",
  5: "Voided",
};

function firstWinningOutcome(mask: bigint, outcomeCount: number): number {
  const n = Math.min(outcomeCount, 8);
  for (let i = 0; i < n; i++) {
    if (((mask >> BigInt(i)) & 1n) === 1n) return i;
  }
  return 0;
}

export function formatEpochDisplay(
  templateId: `0x${string}`,
  epochId: number,
  raw: unknown,
): EpochDisplay {
  const e = asEpochDisplay(raw);
  const now = Date.now() / 1000;
  if (!e) {
    return {
      templateId,
      epochId,
      state: 0 as EpochState,
      stateLabel: "Unknown",
      totalPool: "0",
      winningOutcome: 0,
      openAt: new Date(0),
      lockAt: new Date(0),
      resolveAt: new Date(0),
      outcomePools: [],
      timeRemaining: "",
    };
  }

  const lockAt = Number(e.timing.lockAt);
  const resolveAt = Number(e.timing.resolveAt);
  const status = e.status;

  let timeRemaining = "";
  if (status === EpochState.Open) {
    const secs = Math.max(0, lockAt - now);
    timeRemaining = formatCountdown(secs);
  } else if (status === EpochState.Locked) {
    const secs = Math.max(0, resolveAt - now);
    timeRemaining = `Resolves in ${formatCountdown(secs)}`;
  }

  const poolsSlice = e.outcomePools.slice(0, e.outcomeCount);

  return {
    templateId,
    epochId,
    state: status as EpochState,
    stateLabel: EPOCH_STATE_LABELS[status] ?? "Unknown",
    totalPool: formatUsdc(e.totalPool),
    winningOutcome: firstWinningOutcome(e.winningOutcomeMask, e.outcomeCount),
    openAt: new Date(Number(e.timing.openAt) * 1000),
    lockAt: new Date(lockAt * 1000),
    resolveAt: new Date(resolveAt * 1000),
    outcomePools: poolsSlice.map((p) => formatUsdc(p)),
    timeRemaining,
  };
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
