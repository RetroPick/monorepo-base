import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Clock3, PlayCircle } from "lucide-react";
import { marketCtaDown3d, marketCtaUp3d } from "@/lib/marketCtaStyles";
import { cn } from "@/lib/utils";
import type { PredictionRound } from "@/types/prediction";
import type { ThresholdRound } from "@/types/threshold";
import { formatLiveCountdown, outcomeBorderForResult, ROUND_CARD_SHELL } from "./roundCardConstants";

export type UnifiedRoundCardProps =
  | { variant: "direction"; round: PredictionRound; onRequestLogin?: () => void }
  | { variant: "threshold"; round: ThresholdRound; onRequestLogin?: () => void };

type UiStatus = "next" | "live" | "expired" | "later" | "locked";

const statusStyles: Record<"live" | "next" | "expired" | "later", { badge: string; frame: string; glow: string; accent: string }> = {
  live: {
    badge: "border-primary/30 bg-primary/10 text-primary",
    frame: "border-blue-200/70 bg-[linear-gradient(180deg,rgba(244,249,255,0.98),rgba(227,239,255,0.96))] dark:border-border/80 dark:bg-card dark:bg-none",
    glow: "shadow-sm dark:shadow-none",
    accent: "before:bg-primary",
  },
  next: {
    badge: "border-primary/25 bg-primary/10 text-primary",
    frame: "border-sky-200/70 bg-[linear-gradient(180deg,rgba(247,251,255,0.98),rgba(232,244,255,0.96))] dark:border-border/80 dark:bg-card dark:bg-none",
    glow: "shadow-sm dark:shadow-none",
    accent: "before:bg-primary",
  },
  expired: {
    badge: "border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-border dark:bg-muted dark:text-muted-foreground",
    frame: "border-slate-200/90 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(241,245,249,0.98))] dark:border-border/80 dark:bg-card dark:bg-none",
    glow: "shadow-sm dark:shadow-none",
    accent: "before:bg-muted-foreground",
  },
  later: {
    badge: "border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-border dark:bg-muted dark:text-muted-foreground",
    frame: "border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] dark:border-border/80 dark:bg-card dark:bg-none",
    glow: "shadow-sm dark:shadow-none",
    accent: "before:bg-muted-foreground",
  },
};

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatPriceThreshold(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...decimals] = normalized.split(".");
  const decimal = decimals.join("").slice(0, 2);
  return decimal.length > 0 ? `${whole}.${decimal}` : whole + (normalized.includes(".") ? "." : "");
}

function addAmount(currentValue: string, increment: string) {
  const current = Number.parseFloat(currentValue || "0");
  const next = Number.parseFloat(increment);
  if (!Number.isFinite(next)) return currentValue;
  const total = (Number.isFinite(current) ? current : 0) + next;
  return sanitizeAmountInput(total.toFixed(2));
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function directionUiStatus(s: PredictionRound["status"]): UiStatus {
  if (s === "expired") return "expired";
  if (s === "later") return "later";
  if (s === "next") return "next";
  return "live";
}

function thresholdUiStatus(s: ThresholdRound["status"]): UiStatus {
  if (s === "resolved") return "expired";
  if (s === "later") return "later";
  if (s === "next") return "next";
  if (s === "locked") return "locked";
  return "live";
}

function directionResolved(r: PredictionRound): string | null {
  if (r.closePrice === undefined) return null;
  if (r.closePrice > r.lockPrice) return "Up";
  if (r.closePrice < r.lockPrice) return "Down";
  return "Tie";
}

function thresholdResolved(r: ThresholdRound): string | null {
  if (r.finalPrice === undefined) return null;
  if (r.finalPrice > r.thresholdValue) return "Above";
  if (r.finalPrice < r.thresholdValue) return "Below";
  return "Tie";
}

function formatStatusLabel(ui: UiStatus, variant: UnifiedRoundCardProps["variant"]) {
  if (ui === "expired") return variant === "threshold" ? "Resolved" : "Expired";
  if (ui === "live") return "Live";
  if (ui === "later") return "Later";
  if (ui === "locked") return "Locked";
  return "Next";
}

export function UnifiedRoundCard(props: UnifiedRoundCardProps) {
  const { isConnected } = useAccount();
  const variant = props.variant;
  const isThreshold = variant === "threshold";

  const round = props.round;
  const marketTag = `#${round.id}`;
  const assetImage = round.assetImage;

  const uiStatus: UiStatus = isThreshold
    ? thresholdUiStatus((round as ThresholdRound).status)
    : directionUiStatus((round as PredictionRound).status);

  const isNext = uiStatus === "next";
  const isLive = uiStatus === "live";
  const isLater = uiStatus === "later";
  const isExpired = uiStatus === "expired";
  const isLocked = uiStatus === "locked";

  const positiveLabel = isThreshold ? "Above" : "Up";
  const negativeLabel = isThreshold ? "Below" : "Down";

  const primaryPct = isThreshold ? (round as ThresholdRound).abovePercent : (round as PredictionRound).upPercent;
  const secondaryPct = isThreshold ? (round as ThresholdRound).belowPercent : (round as PredictionRound).downPercent;
  const primaryPayout = isThreshold ? (round as ThresholdRound).abovePayout : (round as PredictionRound).upPayout;
  const secondaryPayout = isThreshold ? (round as ThresholdRound).belowPayout : (round as PredictionRound).downPayout;

  const resolvedOutcome = isThreshold ? thresholdResolved(round as ThresholdRound) : directionResolved(round as PredictionRound);

  const favoredPositive = primaryPct >= secondaryPct;
  const favoredSideLabel = favoredPositive ? positiveLabel : negativeLabel;
  const favoredPercent = Math.max(primaryPct, secondaryPct);
  const favoredPayout = favoredPositive ? primaryPayout : secondaryPayout;
  const opposingPayout = favoredPositive ? secondaryPayout : primaryPayout;
  const isExtremeLean = favoredPercent >= 80;

  const outcomePayout =
    resolvedOutcome === positiveLabel || resolvedOutcome === "Up" || resolvedOutcome === "Above"
      ? primaryPayout
      : resolvedOutcome === negativeLabel || resolvedOutcome === "Down" || resolvedOutcome === "Below"
        ? secondaryPayout
        : null;

  const tr = isThreshold ? (round as ThresholdRound) : null;
  const pr = !isThreshold ? (round as PredictionRound) : null;

  const marketPrice = pr ? pr.closePrice ?? pr.lastPrice : tr ? tr.finalPrice ?? tr.currentPrice : undefined;
  const priceLabel = pr
    ? pr.closePrice !== undefined
      ? "Close"
      : pr.lastPrice !== undefined
        ? "Last Price"
        : undefined
    : tr
      ? tr.finalPrice !== undefined
        ? "Final"
        : "Last Price"
      : undefined;

  const lockOrThresholdPrice = pr ? pr.lockPrice : tr ? tr.thresholdValue : undefined;

  const statusKey: keyof typeof statusStyles = isExpired ? "expired" : isLater ? "later" : isNext ? "next" : "live";
  const statusStyle = statusStyles[statusKey];

  const [entryPolarity, setEntryPolarity] = useState<"positive" | "negative" | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [isEntryFocused, setIsEntryFocused] = useState(false);

  const startsIn = round.startsIn;
  const startsInTargetMs = round.startsInTargetMs;
  const startsInFormat = round.startsInFormat;

  const [liveStartsIn, setLiveStartsIn] = useState(() =>
    startsInTargetMs && startsInFormat ? formatLiveCountdown(startsInTargetMs, startsInFormat) : startsIn,
  );

  useEffect(() => {
    if (!startsInTargetMs || !startsInFormat) {
      setLiveStartsIn(startsIn);
      return;
    }
    const tick = () => setLiveStartsIn(formatLiveCountdown(startsInTargetMs, startsInFormat));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startsIn, startsInFormat, startsInTargetMs]);

  const setQuickAmount = (value: string) => setEntryAmount((c) => addAmount(c, value));

  const isPositiveEntry = entryPolarity === "positive";
  const selectedPayout = isPositiveEntry ? primaryPayout : secondaryPayout;
  const parsedEntryAmount = Number(entryAmount);
  const potentialWin = Number.isFinite(parsedEntryAmount) && parsedEntryAmount > 0 ? parsedEntryAmount * selectedPayout : null;
  const hasCommitAmount = entryAmount.trim().length > 0;

  const requestThresholdEntry = (polarity: "positive" | "negative") => {
    if (!isConnected) {
      props.onRequestLogin?.();
      return;
    }
    setEntryPolarity(polarity);
  };

  if (isNext) {
    const nextFaceBase =
      "absolute inset-0 overflow-hidden rounded-2xl bg-card text-foreground shadow-sm dark:shadow-none";
    const nextFaceFront = cn(nextFaceBase, "border border-border/80 dark:border-white/[0.1]");
    const nextFaceBack = cn(
      nextFaceBase,
      isPositiveEntry
        ? "border-2 border-emerald-500/70 dark:border-emerald-400/55"
        : "border-2 border-rose-500/70 dark:border-rose-400/55",
    );

    const spotPrice = isThreshold ? tr!.currentPrice : pr!.lastPrice;
    const titleLine = isThreshold ? tr!.title : null;
    const biasLeft = isThreshold ? tr!.familyLabel : "Open bias";
    const biasRight = isThreshold ? tr!.thresholdLabel : "Current price";

    return (
      <div className={ROUND_CARD_SHELL}>
        <div
          className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: entryPolarity ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div
            className={cn(nextFaceFront, entryPolarity ? "pointer-events-none" : "pointer-events-auto")}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="relative flex h-full min-h-0 flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {assetImage ? (
                    <img src={assetImage} alt="" className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border" />
                  ) : null}
                  <div className="flex min-w-0 items-center gap-1 text-xs font-semibold text-foreground">
                    <PlayCircle className="size-3.5 shrink-0 text-primary" aria-hidden />
                    <span>Next</span>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">{marketTag}</span>
              </div>

              {titleLine ? (
                <h3 className="line-clamp-2 text-[10px] font-semibold leading-snug text-foreground">{titleLine}</h3>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-muted-foreground">{biasLeft}</span>
                  <span className="line-clamp-1 text-right font-medium text-foreground">{biasRight}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold tracking-tight tabular-nums">
                  <span className="text-up">
                    {positiveLabel} {primaryPct}%
                  </span>
                  <span className="text-down">
                    {negativeLabel} {secondaryPct}%
                  </span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                  <div style={{ width: `${primaryPct}%` }} className="h-full bg-up" />
                  <div style={{ width: `${secondaryPct}%` }} className="h-full bg-down" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground">{isThreshold ? "Price" : "Price"}</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                    {spotPrice !== undefined ? (isThreshold ? formatPriceThreshold(spotPrice) : formatPrice(spotPrice)) : "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-medium text-muted-foreground">{isThreshold ? "Threshold" : "Pool"}</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                    {isThreshold && tr ? formatPriceThreshold(tr.thresholdValue) : round.prizePool}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => (isThreshold ? requestThresholdEntry("positive") : setEntryPolarity("positive"))}
                  className={cn(marketCtaUp3d, "w-full py-2 text-xs font-semibold")}
                >
                  Enter {positiveLabel.toLowerCase()}
                </button>
                <button
                  type="button"
                  onClick={() => (isThreshold ? requestThresholdEntry("negative") : setEntryPolarity("negative"))}
                  className={cn(marketCtaDown3d, "w-full py-2 text-xs font-semibold")}
                >
                  Enter {negativeLabel.toLowerCase()}
                </button>
              </div>
            </div>
          </div>

          <div
            className={cn(nextFaceBack, entryPolarity ? "pointer-events-auto" : "pointer-events-none")}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="relative flex h-full min-h-0 flex-col gap-2 px-3 pb-2.5 pt-2">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setEntryPolarity(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-foreground transition hover:text-muted-foreground"
                >
                  <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
                  Set position
                </button>
                <button
                  type="button"
                  onClick={() => setEntryPolarity(isPositiveEntry ? "negative" : "positive")}
                  className={cn(
                    "min-h-[1.75rem] shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]",
                    isPositiveEntry
                      ? "border-up/40 bg-up/15 text-up focus-visible:outline-up/50"
                      : "border-down/40 bg-down/15 text-down focus-visible:outline-down/50",
                  )}
                  aria-pressed={true}
                  aria-label={`Side: ${isPositiveEntry ? positiveLabel : negativeLabel}`}
                >
                  {isPositiveEntry ? positiveLabel : negativeLabel}
                </button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col justify-start gap-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`entry-amount-${round.id}`} className="sr-only">
                    Amount in USD
                  </label>
                  <div className="flex min-h-[2rem] items-center">
                    <input
                      id={`entry-amount-${round.id}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(sanitizeAmountInput(e.target.value))}
                      onFocus={() => setIsEntryFocused(true)}
                      onBlur={() => setIsEntryFocused(false)}
                      pattern="[0-9]*[.]?[0-9]{0,2}"
                      placeholder={isEntryFocused && !hasCommitAmount ? "" : "Enter amount"}
                      dir="ltr"
                      className={cn(
                        "m-0 block w-full min-w-0 appearance-none bg-transparent p-0",
                        "border-0 shadow-none outline-none ring-0 ring-offset-0",
                        "rounded-none focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                        "[color-scheme:dark]",
                        "font-mono text-xl font-semibold tabular-nums tracking-tight leading-none sm:text-2xl",
                        "caret-primary",
                        hasCommitAmount
                          ? "text-foreground"
                          : "text-foreground/90 placeholder:font-sans placeholder:font-medium placeholder:text-muted-foreground",
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {(isThreshold ? ["1", "10", "25", "100"] : ["0.5", "1", "10", "100"]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setQuickAmount(value)}
                        className="rounded-md border border-border bg-muted py-1.5 text-[10px] font-medium text-foreground transition hover:bg-muted/80"
                      >
                        +${value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground">To win</span>
                    <span className="text-base font-semibold tabular-nums text-foreground">
                      {potentialWin ? formatUsd(potentialWin) : "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{selectedPayout.toFixed(2)}× payout</p>
                  {isThreshold && tr ? (
                    <p className="text-[9px] text-muted-foreground line-clamp-2">{tr.ruleText}</p>
                  ) : null}
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      if (!isConnected) {
                        props.onRequestLogin?.();
                        return;
                      }
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-xs font-semibold",
                      isPositiveEntry ? marketCtaUp3d : marketCtaDown3d,
                    )}
                  >
                    {!isConnected ? "Connect wallet" : entryAmount ? `Commit $${entryAmount}` : "Commit $0"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mutedCard = isExpired || isLater || isLocked;
  const expiredShell = isExpired
    ? cn(
        "bg-card",
        outcomeBorderForResult(resolvedOutcome),
        (resolvedOutcome === "Up" || resolvedOutcome === "Above") && "bg-emerald-500/[0.06]",
        (resolvedOutcome === "Down" || resolvedOutcome === "Below") && "bg-rose-500/[0.06]",
      )
    : null;

  const outcomeColor =
    resolvedOutcome === "Tie"
      ? "text-muted-foreground"
      : resolvedOutcome === "Up" || resolvedOutcome === "Above"
        ? "text-up"
        : resolvedOutcome === "Down" || resolvedOutcome === "Below"
          ? "text-down"
          : "text-muted-foreground";

  return (
    <div className={ROUND_CARD_SHELL}>
      <div
        className={cn(
          "group relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl p-2.5 text-foreground transition-colors duration-200",
          isExpired && expiredShell,
          !isExpired && cn("border", statusStyle.frame, !isLocked && "hover:border-primary/20"),
          !isExpired && statusStyle.glow,
          mutedCard && "opacity-85 saturate-75 dark:opacity-100 dark:saturate-100",
        )}
      >
        <div className={cn("pointer-events-none absolute inset-y-3 left-0 w-0.5 rounded-r-full opacity-90", statusStyle.accent)} />
        <div className="relative flex shrink-0 items-start justify-between gap-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {assetImage ? (
              <img src={assetImage} alt="" className="size-7 shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15" />
            ) : null}
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]",
                statusStyle.badge,
              )}
            >
              {isLive || isNext ? <PlayCircle className="size-3" /> : <Clock3 className="size-3" />}
              {formatStatusLabel(uiStatus, variant)}
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-black/5 bg-black/[0.03] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground dark:border-border dark:bg-muted/50">
            {marketTag}
          </div>
        </div>

        {isThreshold && tr && (isLive || isLocked) ? (
          <h3 className="mt-1 line-clamp-2 text-[10px] font-semibold leading-snug text-foreground">{tr.title}</h3>
        ) : null}

        <div className="relative mt-1.5 flex min-h-0 flex-1 flex-col gap-0">
          {isExpired ? (
            <div className="grid gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={cn("text-[9px] font-bold uppercase tracking-[0.2em]", outcomeColor)}>Outcome</div>
                  <div className={cn("mt-1 text-xl font-black leading-none tracking-tight sm:text-2xl", outcomeColor)}>
                    {resolvedOutcome}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {outcomePayout != null ? `${outcomePayout.toFixed(2)}x` : "—"}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-foreground">Payout</div>
                </div>
              </div>
            </div>
          ) : !isLater ? (
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {favoredPositive ? (
                    <ArrowUpRight className="size-4 shrink-0 text-sky-600 dark:text-sky-300" />
                  ) : (
                    <ArrowDownRight className="size-4 shrink-0 text-blue-700 dark:text-blue-300" />
                  )}
                  <span className="text-lg font-semibold leading-tight tracking-tight text-foreground">
                    {favoredSideLabel} {favoredPercent}%
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {isLive ? "Calculating resolution" : `${favoredPayout}x payout`}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Other</div>
                <div className="mt-0.5 text-base font-semibold tabular-nums tracking-tight text-foreground">{opposingPayout}x</div>
              </div>
            </div>
          ) : null}

          {!isLater && (
            <div className={cn("mt-2 border-t border-slate-200/80 pt-2 dark:border-white/10")}>
              <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em]">
                <span className={cn(isExtremeLean ? (favoredPositive ? "text-up" : "text-down/80") : "text-up")}>
                  {positiveLabel} {primaryPct}%
                </span>
                <span className={cn(isExtremeLean ? (!favoredPositive ? "text-down" : "text-up/80") : "text-down")}>
                  {negativeLabel} {secondaryPct}%
                </span>
              </div>
              <div className={cn("flex h-2 overflow-hidden rounded-full bg-muted", !isExtremeLean && "bg-slate-200/80 dark:bg-muted")}>
                <div style={{ width: `${primaryPct}%` }} className="h-full rounded-full bg-up" />
                <div style={{ width: `${secondaryPct}%` }} className="h-full rounded-full bg-down" />
              </div>
            </div>
          )}

          <div
            className={cn(
              "grid gap-1.5 border-t border-slate-200/80 dark:border-white/10",
              isExpired ? "mt-1.5 pt-1.5" : "mt-2 pt-2",
              (isExpired || isLive || isLocked) && !isLater && "grid-cols-2 items-start",
              isLive && !isLater && "grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-2",
              isLocked && "grid-cols-2 items-start",
            )}
          >
            {!isLater && priceLabel && marketPrice !== undefined ? (
              <div className={cn("grid min-w-0 content-start gap-0.5", (isLive || isLocked) && "text-xs")}>
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{priceLabel}</div>
                <div
                  className={cn(
                    "font-semibold leading-tight text-foreground tabular-nums",
                    isLive || isLocked ? "whitespace-nowrap text-sm" : "text-base tracking-tight",
                  )}
                >
                  {isThreshold ? formatPriceThreshold(marketPrice) : formatPrice(marketPrice)}
                </div>
              </div>
            ) : null}

            {isExpired && (
              <div className="text-right text-xs">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Prize Pool</div>
                <div className="mt-0.5 font-semibold text-foreground">{round.prizePool}</div>
              </div>
            )}

            {(isLive || isLocked) && lockOrThresholdPrice !== undefined && (
              <div className="grid min-w-0 content-start gap-0.5 text-xs">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {isThreshold ? "Threshold" : "Locked Price"}
                </div>
                <div className="whitespace-nowrap text-sm font-semibold leading-snug text-foreground tabular-nums">
                  {isThreshold ? formatPriceThreshold(lockOrThresholdPrice) : formatPrice(lockOrThresholdPrice)}
                </div>
              </div>
            )}

            {isLive && (
              <div className="col-span-2 flex items-end justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Prize Pool</div>
                  <div className="mt-0.5 font-semibold text-foreground">{round.prizePool}</div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl border border-blue-200/70 bg-white/55 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-blue-900 transition-colors hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-blue-100 dark:hover:bg-white/[0.06]"
                >
                  Details
                </button>
              </div>
            )}

            {isLater && (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Time Left</div>
                <div className="mt-1 font-mono text-xl font-black leading-none tracking-tight text-foreground">
                  {liveStartsIn ?? "--"}
                </div>
              </div>
            )}

            {isLocked && tr ? (
              <div className="col-span-2 flex items-center justify-between gap-2 border-t border-border/40 pt-1.5 text-xs dark:border-white/10">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Prize Pool</span>
                <span className="font-semibold text-foreground">{tr.prizePool}</span>
              </div>
            ) : null}
          </div>

          {isLocked && tr ? (
            <div className="mt-auto border-t border-slate-200/80 pt-2 dark:border-white/10">
              <div className="rounded-lg border border-border/70 bg-muted/30 px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Entry closed · {tr.lockTime}
              </div>
            </div>
          ) : mutedCard && !isLocked ? (
            <div className="mt-auto border-t border-slate-200/80 pt-2 dark:border-white/10">
              <div className="flex justify-end">
                <button
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition-colors",
                    "border border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-border dark:bg-muted/60 dark:text-muted-foreground",
                  )}
                  disabled
                >
                  {isLater ? "Waiting" : "Settled"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
