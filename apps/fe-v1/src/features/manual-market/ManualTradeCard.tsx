import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId } from "wagmi";
import { ArrowRight, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useMarketEngine } from "@/hooks/useMarketEngine";
import { parseUsdc, formatUsdc } from "@/config/tokens";
import { DEPLOYMENT_CHAIN_ID } from "@/config/chains";
import { openAppKitModal } from "@/lib/openAppKitModal";
import { RollingPhase, EpochState } from "@/types/engine";
import {
  buildYieldAmountHintLines,
  isEpochBettingOpenNow,
  type TemplateYieldView,
  useEpoch,
  useTemplateYieldView,
} from "@/lib/contracts/marketEngine";
import {
  fetchUserPositions,
  type PositionViewRow,
} from "@/lib/api/retropickApi";
import type { MarketOutcome } from "@/types/market";
import { formatPayoutMultiplier } from "@/lib/market-odds";
import {
  computeSwitchFeeTs,
  formatPayoutMultiple,
  parseEpochForProjection,
  projectWinnerPayoutIfSideWins,
} from "@/lib/market-payout-projection";
import type { ManualMarketTradeContext } from "./types";

/**
 * Match discover `MarketCard` chips: `opacity-50` → `hover:opacity-100 hover:brightness-[1.05]`,
 * plus a lighter gradient on hover (same 3D bottom shadow as base).
 */
const tradeUp3dClass =
  "w-full rounded-lg border border-emerald-700/95 bg-gradient-to-b from-emerald-500 to-emerald-700 py-3 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_0_0_rgb(6,95,70),0_2px_8px_rgba(0,0,0,0.25)] transition-[opacity,transform,box-shadow,filter,background] duration-200 hover:from-emerald-400 hover:to-emerald-600 hover:opacity-100 hover:brightness-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 active:translate-y-px active:from-emerald-500 active:to-emerald-700 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_0_0_rgb(6,95,70),0_1px_4px_rgba(0,0,0,0.2)] disabled:cursor-not-allowed disabled:opacity-40";

const tradeDown3dClass =
  "w-full rounded-lg border border-rose-800/90 bg-gradient-to-b from-rose-600 to-rose-800 py-3 text-sm font-bold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_0_0_rgb(100,20,40),0_2px_8px_rgba(0,0,0,0.3)] transition-[opacity,transform,box-shadow,filter,background,colors] duration-200 hover:from-rose-500 hover:to-rose-700 hover:text-zinc-100 hover:opacity-100 hover:brightness-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/80 active:translate-y-px active:from-rose-600 active:to-rose-800 active:text-zinc-300 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_0_0_rgb(100,20,40),0_1px_4px_rgba(0,0,0,0.22)] disabled:cursor-not-allowed disabled:opacity-40";

type Tab = "Buy" | "Move stake" | "Claim";

interface ManualTradeCardProps {
  outcomes: MarketOutcome[];
  tradeContext: ManualMarketTradeContext | null;
}

function toBigInt(raw: unknown): bigint {
  if (typeof raw === "bigint") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
  if (typeof raw === "string" && /^\d+$/.test(raw)) return BigInt(raw);
  return 0n;
}

function sameTemplate(a: string | undefined, b: string | undefined) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function formatShortToken(raw: bigint): string {
  if (raw <= 0n) return "0";
  return formatUsdc(raw, raw >= 100_000_000n ? 2 : 4);
}

function parseAmount(value: string): bigint {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0n;
  return parseUsdc(value);
}

/** Normalize epoch ids from bigint / indexed JSON numbers for comparisons. */
function epochEq(a: bigint, b: bigint | null): boolean {
  if (b == null) return false;
  try {
    return BigInt(a) === BigInt(b);
  } catch {
    return false;
  }
}

function approvedBuyMatchesOrder(
  approvedBuy: {
    templateId: `0x${string}`;
    epochId: bigint;
    outcomeIndex: number;
    amount: bigint;
  },
  tc: ManualMarketTradeContext,
  selectedOutcomeIndex: number,
  parsedAmount: bigint,
): boolean {
  return (
    approvedBuy.templateId.toLowerCase() === tc.templateId.toLowerCase() &&
    epochEq(approvedBuy.epochId, tc.activeEpochId) &&
    approvedBuy.outcomeIndex === selectedOutcomeIndex &&
    approvedBuy.amount >= parsedAmount
  );
}

/** Map decoded / raw MarketEngine reverts to clearer copy for manual traders. */
function friendlyMarketEngineError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? "");
  if (/BettingClosed\b/i.test(msg) || msg.includes("0x61c54c4a")) {
    return "Betting is closed for this epoch (outside the open window or epoch is locked). Wait until the epoch is open or try a different market.";
  }
  if (/PreviousEpochUnresolved\b/i.test(msg) || msg.includes("0x5bedc9d2")) {
    return "The previous epoch must be resolved before new deposits. If you operate this market, finish lock → resolve for the prior epoch first.";
  }
  return msg;
}

function positionStakeAt(position: PositionViewRow | undefined, index: number): bigint {
  const stakes = position?.stakes;
  if (!Array.isArray(stakes)) return 0n;
  return toBigInt(stakes[index]);
}

export function ManualTradeCard({ outcomes, tradeContext }: ManualTradeCardProps) {
  const [tab, setTab] = useState<Tab>("Buy");
  const [switchFromIndex, setSwitchFromIndex] = useState(0);
  const [switchToIndex, setSwitchToIndex] = useState(1);
  const [selectedOutcome, setSelectedOutcome] = useState(0);
  const [amount, setAmount] = useState<string>("");
  const [lastSubmitted, setLastSubmitted] = useState<`0x${string}` | undefined>();
  const [approvedBuy, setApprovedBuy] = useState<{
    templateId: `0x${string}`;
    epochId: bigint;
    outcomeIndex: number;
    amount: bigint;
    approveHash: `0x${string}`;
  } | null>(null);
  const { address } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();
  const qc = useQueryClient();
  const engine = useMarketEngine();

  const tc = tradeContext;
  const templateId = tc?.templateId;
  const activeEpochId = tc?.activeEpochId ?? null;
  const epochQ = useEpoch(templateId, activeEpochId ?? undefined, chainId);
  const yieldViewQ = useTemplateYieldView(templateId, chainId);
  const epoch = epochQ.data as { status?: number | bigint } | undefined;
  const epochStatus =
    epoch?.status === undefined ? undefined : Number(epoch.status);

  const positionsQ = useQuery({
    queryKey: ["retropick-api", "user-positions", address, templateId],
    queryFn: () => fetchUserPositions(address!, { templateId, epochId: activeEpochId }),
    enabled: Boolean(address && templateId),
    staleTime: 8_000,
  });

  const marketPositions = useMemo(() => {
    const rows = positionsQ.data?.positions ?? [];
    return rows.filter((p) => sameTemplate(p.templateId, templateId) && !p.error);
  }, [positionsQ.data?.positions, templateId]);

  const activePosition = useMemo(() => {
    if (activeEpochId == null) return undefined;
    return marketPositions.find((p) => BigInt(p.epochId) === activeEpochId);
  }, [activeEpochId, marketPositions]);

  const claimablePositions = useMemo(
    () =>
      marketPositions.filter(
        (p) =>
          p.claimableNow === true &&
          !p.claimed &&
          (toBigInt(p.pendingClaimAmount) > 0n || toBigInt(p.pendingRefundAmount) > 0n),
      ),
    [marketPositions],
  );

  const yesOutcome = outcomes[0];
  const noOutcome = outcomes[1];
  const yesMult = formatPayoutMultiplier(yesOutcome?.probability ?? 50);
  const noMult = formatPayoutMultiplier(noOutcome?.probability ?? 50);
  const selectedOutcomeIndex = Math.max(0, Math.min(selectedOutcome, Math.max(outcomes.length - 1, 0)));
  const outcomeCount = Math.max(1, tc?.outcomeCount ?? outcomes.length);

  const epochSnap = useMemo(() => parseEpochForProjection(epochQ.data), [epochQ.data]);

  const hasOpenPosition =
    toBigInt(activePosition?.totalStake) > 0n ||
    outcomes.some((_, index) => positionStakeAt(activePosition, index) > 0n);

  const isRollingHalted =
    tc != null &&
    (tc.rollingPhase === RollingPhase.Halted || tc.rollingHaltReason !== 0);

  const canTradeOnChain =
    tc != null &&
    tc.activeEpochId != null &&
    !isRollingHalted &&
    selectedOutcomeIndex >= 0 &&
    selectedOutcomeIndex < tc.outcomeCount;

  const canSwitchOnChain =
    tc != null &&
    tc.activeEpochId != null &&
    !isRollingHalted &&
    switchFromIndex >= 0 &&
    switchFromIndex < outcomeCount &&
    switchToIndex >= 0 &&
    switchToIndex < outcomeCount;

  /** On-chain betting window; `status===Open` alone is not enough (see `BettingClosed` / openAt–lockAt). */
  const depositOpen = isEpochBettingOpenNow(epochQ.data);
  const wrongChain = address != null && chainId !== DEPLOYMENT_CHAIN_ID;
  const parsedAmount = parseAmount(amount);
  const allowance = engine.usdcAllowance ?? 0n;
  const needsBuyApproval = tab === "Buy" && parsedAmount > 0n && allowance < parsedAmount;
  const approvedBuyMatches =
    approvedBuy != null &&
    tc != null &&
    approvedBuyMatchesOrder(approvedBuy, tc, selectedOutcomeIndex, parsedAmount);

  /** Pool-based payout preview for Buy: capped to post-deposit pool, multiplier vs marginal stake. */
  const buyAddPayoutPreview = useMemo(() => {
    if (tab !== "Buy" || parsedAmount <= 0n || !epochSnap) return null;
    const stakes = Array.from({ length: epochSnap.outcomeCount }, (_, i) =>
      positionStakeAt(activePosition, i),
    );
    const winIdx = Math.min(selectedOutcomeIndex, epochSnap.outcomeCount - 1);
    const proj = projectWinnerPayoutIfSideWins({
      outcomePools: epochSnap.outcomePools,
      totalPool: epochSnap.totalPool,
      outcomeCount: epochSnap.outcomeCount,
      settlementFeeBps: epochSnap.settlementFeeBps,
      feeOnLosingPool: epochSnap.feeOnLosingPool,
      refundMode: epochSnap.refundMode,
      winningOutcomeIndex: winIdx,
      userStakes: stakes,
      additionalStake: parsedAmount,
    });
    if (proj.payout == null || proj.basis !== "pool") return null;
    const totalPrime = epochSnap.totalPool + parsedAmount;
    const cappedPayout = proj.payout > totalPrime ? totalPrime : proj.payout;
    return {
      cappedPayout,
      multLabel: formatPayoutMultiple(cappedPayout, parsedAmount),
    };
  }, [tab, parsedAmount, epochSnap, activePosition, selectedOutcomeIndex]);

  const switchStakeOnFrom = positionStakeAt(activePosition, switchFromIndex);
  const switchFeePreview =
    tab === "Move stake" && parsedAmount > 0n && epochSnap
      ? computeSwitchFeeTs(parsedAmount, epochSnap.switchFeeBps)
      : 0n;

  const selectedWinLabel =
    outcomes[Math.min(selectedOutcomeIndex, Math.max(outcomes.length - 1, 0))]?.label ?? "this side";

  const syncMoveStakeSelection = useCallback(() => {
    const oc = Math.max(1, tc?.outcomeCount ?? outcomes.length);
    let from = 0;
    for (let i = 0; i < oc; i++) {
      if (positionStakeAt(activePosition, i) > 0n) {
        from = i;
        break;
      }
    }
    let to = 0;
    if (oc <= 1) {
      to = 0;
    } else if (oc === 2) {
      to = from === 0 ? 1 : 0;
    } else {
      to = (from + 1) % oc;
      if (to === from) to = (from + 2) % oc;
    }
    setSwitchFromIndex(from);
    setSwitchToIndex(to);
  }, [tc?.outcomeCount, outcomes.length, activePosition]);

  /** Rolling markets can advance epoch server-side; stale approve must not deposit into the wrong epoch. */
  useEffect(() => {
    if (approvedBuy == null || tc?.activeEpochId == null) return;
    if (epochEq(approvedBuy.epochId, tc.activeEpochId)) return;
    setApprovedBuy(null);
    toast({
      title: "Active epoch updated",
      description: "Approve again for the current epoch before buying.",
    });
  }, [approvedBuy, tc?.activeEpochId, toast]);

  const balanceLabel = useMemo(() => {
    const raw = engine.usdcBalance;
    if (raw === undefined) return "$0.00";
    return `$${formatUsdc(raw)}`;
  }, [engine.usdcBalance]);

  const yieldAmountHintLines = useMemo(() => {
    if (!tc) return null;
    if (tab !== "Buy" && tab !== "Move stake") return null;
    const buyMode = tab === "Move stake" ? "move" : "add";
    return buildYieldAmountHintLines(buyMode, yieldViewQ.data as TemplateYieldView | undefined, {
      isLoading: yieldViewQ.isLoading,
      isError: yieldViewQ.isError,
    });
  }, [tab, tc, yieldViewQ.data, yieldViewQ.isLoading, yieldViewQ.isError]);

  const commonBlockedReason = (() => {
    if (!tc) return "Indexed on-chain market required.";
    if (tc.activeEpochId == null) return "No active epoch indexed yet.";
    if (isRollingHalted) return "Rolling market halted.";
    if (epochQ.isFetching && epochStatus === undefined) return "Loading epoch state.";
    if (epochQ.isSuccess && epochQ.data != null && !depositOpen) {
      if (epochStatus === EpochState.Open) {
        return "Betting window is not active on-chain yet, or lock time has passed. Deposits are only allowed between the epoch open and lock times.";
      }
      return "Epoch is not open.";
    }
    if (wrongChain) return `Switch wallet to chain ${DEPLOYMENT_CHAIN_ID}.`;
    return null;
  })();

  const actionBlockedReason = (() => {
    if (tab === "Claim") {
      if (!tc) return "Indexed on-chain market required.";
      if (!address) return "Sign in to claim.";
      if (wrongChain) return `Switch wallet to chain ${DEPLOYMENT_CHAIN_ID}.`;
      if (positionsQ.isLoading) return "Loading indexed positions.";
      if (claimablePositions.length === 0) return "No claimable epochs for this market.";
      return null;
    }
    if (!address) return "Sign in to trade.";
    if (commonBlockedReason) return commonBlockedReason;
    if (tab === "Move stake") {
      if (parsedAmount <= 0n) return "Enter an amount.";
      const maxSwitch = positionStakeAt(activePosition, switchFromIndex);
      if (maxSwitch <= 0n) return "No stake on the selected \"from\" outcome.";
      if (parsedAmount > maxSwitch) return "Amount exceeds stake on that side.";
      if (switchFromIndex === switchToIndex) return "Pick a different outcome to move into.";
      return null;
    }
    if (parsedAmount <= 0n) return "Enter an amount.";
    return null;
  })();

  const setMax = () => {
    if (tab === "Move stake") {
      const m = positionStakeAt(activePosition, switchFromIndex);
      if (m <= 0n) return;
      setAmount(formatUsdc(m, 2).replace(/,/g, ""));
      return;
    }
    if (engine.usdcBalance == null) return;
    setAmount(formatUsdc(engine.usdcBalance, 2).replace(/,/g, ""));
  };

  const refreshPositionSoon = () => {
    if (!address || !templateId) return;
    void qc.invalidateQueries({ queryKey: ["retropick-api", "user-positions", address, templateId] });
    for (const delay of [3_000, 8_000, 15_000, 30_000]) {
      window.setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ["retropick-api", "user-positions", address, templateId] });
      }, delay);
    }
  };

  const handleBuy = async () => {
    if (tab !== "Buy") return;
    if (!address || !tc || tc.activeEpochId == null || !canTradeOnChain || parsedAmount <= 0n) return;
    try {
      const refetchResult = await engine.refetchUsdcAllowance?.();
      const allowanceFresh =
        refetchResult != null && typeof refetchResult.data === "bigint"
          ? refetchResult.data
          : (engine.usdcAllowance ?? 0n);

      const needsApprovalNow = allowanceFresh < parsedAmount;
      const approvedMatchesNow =
        approvedBuy != null &&
        approvedBuyMatchesOrder(approvedBuy, tc, selectedOutcomeIndex, parsedAmount);

      const order = {
        templateId: tc.templateId,
        epochId: tc.activeEpochId,
        outcomeIndex: selectedOutcomeIndex,
        amount: parsedAmount,
      };

      // Manual chain-markets UX: always sequential ERC20 approve then depositToSide (two wallet prompts).
      // EIP-5792 batching is intentionally not used here; bundled calls produce a single confirmation.
      if (needsApprovalNow && !approvedMatchesNow) {
        const approveHash = await engine.approveDepositSpending(parsedAmount);
        if (approveHash) {
          setLastSubmitted(undefined);
          setApprovedBuy({ ...order, approveHash });
          toast({
            title: "Stake token approved",
            description: "Tap Submit buy once to confirm the deposit transaction.",
          });
          return;
        }

        // Allowance already covers this amount (no new approve tx). Do not call deposit in the same
        // click: embedded / extension wallets often drop the second eth_sendTransaction in one gesture.
        void engine.refetchUsdcAllowance?.();
        toast({
          title: "Ready to deposit",
          description: "Tap Buy again to sign the deposit transaction.",
        });
        return;
      }

      const hash = await engine.depositApproved(order);
      setLastSubmitted(hash);
      setApprovedBuy(null);
      refreshPositionSoon();
      toast({
        title: "Deposit submitted",
        description: "Waiting for wallet confirmation and indexer refresh.",
      });
    } catch (e) {
      toast({
        title: "Deposit failed",
        description: friendlyMarketEngineError(e),
        variant: "destructive",
      });
    }
  };

  const handleSwitch = async () => {
    if (!address || !tc || tc.activeEpochId == null || !canSwitchOnChain || parsedAmount <= 0n) return;
    if (switchFromIndex === switchToIndex) return;
    try {
      const hash = await engine.switchSide({
        templateId: tc.templateId,
        epochId: tc.activeEpochId,
        fromOutcomeIndex: switchFromIndex,
        toOutcomeIndex: switchToIndex,
        amount: parsedAmount,
      });
      setLastSubmitted(hash);
      refreshPositionSoon();
      toast({
        title: "Switch submitted",
        description: "Waiting for wallet confirmation and indexer refresh.",
      });
    } catch (e) {
      toast({
        title: "Switch failed",
        description: friendlyMarketEngineError(e),
        variant: "destructive",
      });
    }
  };

  const handleClaim = async () => {
    if (!tc || claimablePositions.length === 0) return;
    try {
      const hash = await engine.claimMany(
        claimablePositions.map((p) => ({
          templateId: tc.templateId,
          epochId: BigInt(p.epochId),
        })),
      );
      setLastSubmitted(hash);
      toast({
        title: "Claim submitted",
        description: "Waiting for indexed confirmation.",
      });
    } catch (e) {
      toast({
        title: "Claim failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const isWorking = engine.isDepositing || engine.isClaiming;
  const isApprovingBuy = tab === "Buy" && engine.isApprovingDeposit;
  const isSwitchingStake = tab === "Move stake" && engine.isSwitching;
  const isAnyWorking = isWorking || isApprovingBuy || isSwitchingStake;
  const isConnectOnlyReason =
    actionBlockedReason === "Sign in to trade." || actionBlockedReason === "Sign in to claim.";
  const showErrorCallout = Boolean(actionBlockedReason && !isConnectOnlyReason);
  /** When disconnected, primary button opens AppKit instead of blocking with disabled. */
  const executionBlockedReason = address != null ? actionBlockedReason : null;

  const primaryLabel =
    tab === "Buy"
      ? isApprovingBuy
        ? "Confirm approval"
        : engine.isDepositing
          ? "Confirm buy"
          : needsBuyApproval && !approvedBuyMatches
            ? "Trade"
            : approvedBuyMatches
              ? "Submit buy"
              : "Trade"
      : tab === "Move stake"
        ? engine.isSwitching
          ? "Confirm switch"
          : "Switch stake"
        : engine.isClaiming
          ? "Confirm claim"
          : "Claim";

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm dark:border-white/[0.1]">
        <div className="flex items-end gap-1 border-b border-border/60 px-3 pt-3 dark:border-white/[0.08] sm:px-4">
          {(["Buy", "Move stake", "Claim"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                if (t === "Move stake") syncMoveStakeSelection();
                setTab(t);
              }}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition",
                tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {tab !== "Claim" ? (
            <>
              {tab === "Buy" ? (
                <div className="grid grid-cols-2 gap-3 pt-3 sm:gap-4">
                  {outcomes.length <= 2 ? (
                    <>
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-1.5">
                        <span
                          className="text-center text-[11px] font-medium tabular-nums text-muted-foreground sm:text-xs"
                          title="Approx. gross return on $1 if this side wins (from implied %)"
                        >
                          {yesMult}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedOutcome(0)}
                          className={cn(
                            tradeUp3dClass,
                            selectedOutcomeIndex === 0
                              ? "opacity-100 ring-2 ring-white/30 ring-offset-2 ring-offset-background"
                              : "opacity-[0.55]",
                          )}
                          aria-pressed={selectedOutcomeIndex === 0}
                          aria-label={`${yesOutcome?.label ?? "Yes"} ${yesMult}`}
                        >
                          {yesOutcome?.label ?? "Yes"}
                        </button>
                      </div>
                      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-1.5">
                        <span
                          className="text-center text-[11px] font-medium tabular-nums text-muted-foreground sm:text-xs"
                          title="Approx. gross return on $1 if this side wins (from implied %)"
                        >
                          {noMult}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedOutcome(1)}
                          className={cn(
                            tradeDown3dClass,
                            selectedOutcomeIndex === 1
                              ? "opacity-100 ring-2 ring-white/20 ring-offset-2 ring-offset-background"
                              : "opacity-[0.55]",
                          )}
                          aria-pressed={selectedOutcomeIndex === 1}
                          aria-label={`${noOutcome?.label ?? "No"} ${noMult}`}
                        >
                          {noOutcome?.label ?? "No"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      {outcomes.map((outcome, index) => (
                        <button
                          key={outcome.id}
                          type="button"
                          onClick={() => setSelectedOutcome(index)}
                          className={cn(
                            "min-h-12 rounded-lg border px-3 py-2 text-left transition",
                            selectedOutcomeIndex === index
                              ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20"
                              : "border-border/70 bg-background/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          aria-pressed={selectedOutcomeIndex === index}
                        >
                          <span className="block truncate text-sm font-semibold">{outcome.label}</span>
                          <span className="block font-mono text-xs">{formatPayoutMultiplier(outcome.probability)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-0">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Reallocate staked USDC from one outcome to another. Nothing is withdrawn to your wallet.
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <span className="block text-xs font-medium text-foreground">From</span>
                      <Select
                        value={String(switchFromIndex)}
                        onValueChange={(v) => {
                          const i = Number(v);
                          setSwitchFromIndex(i);
                          setSwitchToIndex((prev) =>
                            prev === i ? (i + 1) % outcomeCount : prev >= outcomeCount ? outcomeCount - 1 : prev,
                          );
                        }}
                      >
                        <SelectTrigger
                          className="h-11 w-full border-border/80 bg-muted/25 px-3 text-sm font-medium shadow-sm dark:border-white/[0.12] dark:bg-muted/20 [&>span]:w-full [&>span]:text-left"
                          aria-label="Outcome to move stake from"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={6} className="z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]">
                          {outcomes.slice(0, outcomeCount).map((o, i) => (
                            <SelectItem key={o.id} value={String(i)}>
                              {o.label} (${formatShortToken(positionStakeAt(activePosition, i))})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex shrink-0 justify-center sm:pb-2" aria-hidden>
                      <div className="rounded-full border border-border/70 bg-background/80 p-2 shadow-sm dark:border-white/[0.1] dark:bg-muted/30">
                        <ArrowRight className="size-4 rotate-90 text-muted-foreground sm:rotate-0" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <span className="block text-xs font-medium text-foreground">To</span>
                      <Select
                        value={String(switchToIndex)}
                        onValueChange={(v) => setSwitchToIndex(Number(v))}
                      >
                        <SelectTrigger
                          className="h-11 w-full border-border/80 bg-muted/25 px-3 text-sm font-medium shadow-sm dark:border-white/[0.12] dark:bg-muted/20 [&>span]:w-full [&>span]:text-left"
                          aria-label="Outcome to move stake to"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={6} className="z-[300] max-h-[min(18rem,var(--radix-select-content-available-height))]">
                          {outcomes
                            .slice(0, outcomeCount)
                            .map((o, i) => ({ o, i }))
                            .filter(({ i }) => i !== switchFromIndex)
                            .map(({ o, i }) => (
                              <SelectItem key={o.id} value={String(i)}>
                                {o.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "relative mt-4 overflow-hidden rounded-2xl border p-4 sm:p-5",
                  "border-border/60 bg-gradient-to-b from-muted/[0.12] to-background/90",
                  "dark:border-white/[0.07] dark:from-muted/15 dark:to-card/40",
                  "before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-px before:bg-gradient-to-b before:from-cyan-500/0 before:via-cyan-500/55 before:to-violet-500/0",
                  tab === "Move stake"
                    ? "ring-1 ring-primary/15 dark:ring-primary/20"
                    : "",
                )}
              >
                <div className="flex items-start justify-between gap-3 pl-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {tab === "Move stake" ? "Move" : "Stake"}
                  </span>
                  {tab === "Move stake" ? (
                    <div className="text-right">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        From {outcomes[switchFromIndex]?.label ?? "-"}
                      </div>
                      <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                        ${formatShortToken(switchStakeOnFrom)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] tabular-nums text-muted-foreground">{balanceLabel}</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1 pl-2">
                  <div className="flex min-w-0 flex-1 items-baseline gap-0.5">
                    <span className="text-2xl font-medium text-muted-foreground/80">$</span>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="0"
                      className="min-w-0 flex-1 bg-transparent text-4xl font-semibold tabular-nums tracking-tight text-foreground outline-none placeholder:text-muted-foreground/25"
                      aria-label="Amount in USDC"
                    />
                  </div>
                  {tab === "Buy" && buyAddPayoutPreview ? (
                    <span
                      className="mb-1 shrink-0 rounded-md border border-cyan-500/35 bg-cyan-500/[0.07] px-2 py-1 font-mono text-[11px] font-semibold tabular-nums text-cyan-700 dark:text-cyan-300"
                      title={`~${buyAddPayoutPreview.multLabel}× return on this stake if ${selectedWinLabel} wins (pool-sized, illustrative)`}
                    >
                      ×{buyAddPayoutPreview.multLabel}
                    </span>
                  ) : null}
                </div>
                {yieldAmountHintLines && yieldAmountHintLines.length > 0 ? (
                  <p
                    className="mt-2 line-clamp-2 pl-2 text-[10px] leading-snug text-muted-foreground"
                    title={yieldAmountHintLines.join(" ")}
                    role="note"
                  >
                    {yieldAmountHintLines.join(" ")}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-nowrap items-center justify-end gap-1.5 overflow-x-auto pl-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {["1", "5", "10", "100"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount((Number(amount || 0) + Number(val)).toString())}
                      className="shrink-0 rounded-md border border-border/70 bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-muted/40 hover:text-foreground"
                    >
                      +${val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={setMax}
                    className="shrink-0 rounded-md border border-foreground/20 bg-foreground/5 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-foreground/10"
                  >
                    Max
                  </button>
                </div>
                {tab === "Buy" && buyAddPayoutPreview ? (
                  <div
                    className="mt-4 flex items-baseline justify-between gap-3 border-t border-border/40 pt-4 pl-2 dark:border-white/[0.06]"
                    data-testid="stake-payout-preview"
                  >
                    <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
                      Return if{" "}
                      <span className="font-semibold text-foreground">{selectedWinLabel}</span>{" "}
                      <span className="text-muted-foreground/80">resolves</span>
                    </p>
                    <span className="shrink-0 text-right text-xl font-bold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-2xl">
                      ${formatUsdc(buyAddPayoutPreview.cappedPayout, 2)}
                    </span>
                  </div>
                ) : null}
                {tab === "Move stake" && parsedAmount > 0n && switchFeePreview > 0n ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Est. switch fee ~${formatUsdc(switchFeePreview, switchFeePreview >= 10n ** 16n ? 2 : 4)}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border/70 bg-background/60 p-3 dark:border-white/[0.08]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Claimable epochs</span>
                <span className="font-mono text-xs text-foreground">{claimablePositions.length}</span>
              </div>
              <div className="mt-3 space-y-2">
                {claimablePositions.length === 0 ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    No indexed winning or refundable epochs are ready for this wallet.
                  </p>
                ) : (
                  claimablePositions.slice(0, 4).map((p) => (
                    <div key={`${p.templateId}-${p.epochId}`} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">Epoch {p.epochId}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-300">
                        {formatShortToken(toBigInt(p.pendingClaimAmount) + toBigInt(p.pendingRefundAmount))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {hasOpenPosition && tab !== "Claim" ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Open{" "}
              {outcomes.slice(0, tc?.outcomeCount ?? 2).map((outcome, index) => (
                <span key={outcome.id}>
                  {index > 0 ? <span className="px-1">·</span> : null}
                  <span className="font-mono text-foreground">
                    {outcome.label} {formatShortToken(positionStakeAt(activePosition, index))}
                  </span>
                </span>
              ))}
            </p>
          ) : null}

          {isConnectOnlyReason && actionBlockedReason ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">{actionBlockedReason}</p>
          ) : null}

          {showErrorCallout && actionBlockedReason ? (
            <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{actionBlockedReason}</span>
            </div>
          ) : null}

          {lastSubmitted ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              <span>Transaction successful</span>
            </div>
          ) : null}

          {approvedBuyMatches && tab === "Buy" ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">Approved {approvedBuy?.approveHash.slice(0, 10)}… tap Submit buy</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (!address) {
                void openAppKitModal();
                return;
              }
              if (tab === "Move stake") void handleSwitch();
              else if (tab === "Buy") void handleBuy();
              else void handleClaim();
            }}
            disabled={Boolean(executionBlockedReason) || isAnyWorking}
            className="mt-4 flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
          >
            {isAnyWorking ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {primaryLabel}
          </button>

          <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
            By trading, you accept this market&apos;s rules. USDC funding and settlement are on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}
