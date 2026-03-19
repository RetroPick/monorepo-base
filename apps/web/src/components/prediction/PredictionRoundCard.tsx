import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Clock3, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { PredictionRound } from "@/types/prediction";

interface PredictionRoundCardProps {
  round: PredictionRound;
  onRequestLogin?: () => void;
}

const statusStyles: Record<string, {
  badge: string;
  frame: string;
  glow: string;
  accent: string;
}> = {
  live: {
    badge: "border-blue-500/30 bg-blue-500/12 text-blue-700 dark:text-blue-300",
    frame: "border-blue-200/70 bg-[linear-gradient(180deg,rgba(244,249,255,0.98),rgba(227,239,255,0.96))] dark:border-blue-400/20 dark:bg-[linear-gradient(180deg,rgba(7,18,39,0.98),rgba(4,11,24,0.96))]",
    glow: "shadow-[0_30px_90px_-46px_rgba(37,99,235,0.5)]",
    accent: "before:bg-blue-400",
  },
  next: {
    badge: "border-sky-400/30 bg-sky-400/12 text-sky-700 dark:text-sky-300",
    frame: "border-sky-200/70 bg-[linear-gradient(180deg,rgba(247,251,255,0.98),rgba(232,244,255,0.96))] dark:border-sky-400/15 dark:bg-[linear-gradient(180deg,rgba(8,19,38,0.98),rgba(5,13,28,0.96))]",
    glow: "shadow-[0_26px_80px_-46px_rgba(59,130,246,0.45)]",
    accent: "before:bg-sky-400",
  },
  expired: {
    badge: "border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-300",
    frame: "border-slate-200/90 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(241,245,249,0.98))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(23,23,28,0.98),rgba(16,18,24,0.98))]",
    glow: "shadow-[0_24px_56px_-46px_rgba(100,116,139,0.42)]",
    accent: "before:bg-slate-400",
  },
  later: {
    badge: "border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-300",
    frame: "border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,28,34,0.98),rgba(17,19,25,0.98))]",
    glow: "shadow-[0_24px_56px_-46px_rgba(100,116,139,0.38)]",
    accent: "before:bg-slate-400",
  },
};

function formatStatus(status: PredictionRound["status"]) {
  if (status === "expired") return "Expired";
  if (status === "live") return "Live";
  if (status === "later") return "Later";
  return "Next";
}

function formatPrice(value: number) {
  return `$${value.toFixed(2)}`;
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

function getResolvedOutcome(round: PredictionRound) {
  if (round.closePrice === undefined) return null;
  if (round.closePrice > round.lockPrice) return "Up";
  if (round.closePrice < round.lockPrice) return "Down";
  return "Tie";
}

function formatLiveCountdown(targetMs: number, format: NonNullable<PredictionRound["startsInFormat"]>) {
  const totalSeconds = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (format === "mm:ss") {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PredictionRoundCard({ round, onRequestLogin }: PredictionRoundCardProps) {
  const { isConnected } = useAccount();
  const marketTag = `#${round.id}`;
  const isNext = round.status === "next";
  const isLive = round.status === "live";
  const isLater = round.status === "later";
  const isExpired = round.status === "expired";
  const statusStyle = statusStyles[round.status] || statusStyles.expired;
  const marketPrice = round.closePrice ?? round.lastPrice;
  const priceLabel = round.closePrice !== undefined ? "Closed Price" : round.lastPrice !== undefined ? "Last Price" : undefined;
  const resolvedOutcome = getResolvedOutcome(round);
  const favoredSide = round.upPercent >= round.downPercent ? "Up" : "Down";
  const favoredPercent = Math.max(round.upPercent, round.downPercent);
  const favoredPayout = favoredSide === "Up" ? round.upPayout : round.downPayout;
  const opposingPayout = favoredSide === "Up" ? round.downPayout : round.upPayout;
  const isUpFavored = favoredSide === "Up";
  const isExtremeLean = favoredPercent >= 80;
  const outcomePayout = resolvedOutcome === "Up" ? round.upPayout : resolvedOutcome === "Down" ? round.downPayout : null;
  const [entrySide, setEntrySide] = useState<"Up" | "Down" | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [isEntryFocused, setIsEntryFocused] = useState(false);
  const [liveStartsIn, setLiveStartsIn] = useState(() =>
    round.startsInTargetMs && round.startsInFormat
      ? formatLiveCountdown(round.startsInTargetMs, round.startsInFormat)
      : round.startsIn,
  );

  useEffect(() => {
    if (!round.startsInTargetMs || !round.startsInFormat) {
      setLiveStartsIn(round.startsIn);
      return;
    }

    const updateCountdown = () => {
      setLiveStartsIn(formatLiveCountdown(round.startsInTargetMs!, round.startsInFormat!));
    };

    updateCountdown();
    const timerId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timerId);
  }, [round.startsIn, round.startsInFormat, round.startsInTargetMs]);

  const setQuickAmount = (value: string) => setEntryAmount((current) => addAmount(current, value));

  if (isNext) {
    const isUp = entrySide === "Up";
    const nextUpPercent = round.upPercent;
    const nextDownPercent = round.downPercent;
    const selectedPayout = isUp ? round.upPayout : round.downPayout;
    const parsedEntryAmount = Number(entryAmount);
    const potentialWin = Number.isFinite(parsedEntryAmount) && parsedEntryAmount > 0 ? parsedEntryAmount * selectedPayout : null;

    return (
      <div className="min-w-[300px] max-w-[320px] [perspective:1600px]">
        <div
          className="relative min-h-[382px] transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: entrySide ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div
            className={cn(
              "absolute inset-0 overflow-hidden rounded-[26px] border border-sky-400/20 bg-[linear-gradient(180deg,rgba(34,74,154,0.98),rgba(10,23,52,0.98))] p-3 text-white shadow-[0_28px_80px_-42px_rgba(37,99,235,0.65)]",
              entrySide ? "pointer-events-none" : "pointer-events-auto",
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="pointer-events-none absolute inset-x-8 top-8 h-40 bg-[radial-gradient(circle,rgba(56,189,248,0.22),transparent_70%)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {round.assetImage ? (
                    <img src={round.assetImage} alt="" className="size-8 rounded-full object-cover ring-1 ring-white/15" />
                  ) : null}
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-100">
                    <PlayCircle className="size-3.5" />
                    Next
                  </div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70">
                  {marketTag}
                </div>
              </div>

              <div className="mt-2.5">
                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/55">Open Bias</div>
                    <div className="mt-1 flex items-center gap-1.5 text-emerald-300">
                      <ArrowUpRight className="size-4" />
                      <span className="text-[1.25rem] font-semibold tracking-tight text-white">Up {nextUpPercent}%</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/55">Use current price</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Down</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight text-white">{nextDownPercent}%</div>
                  </div>
                </div>
              </div>

              <div className="mt-2.5 border-t border-white/10 pt-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em]">
                  <span className="text-emerald-300">Up {nextUpPercent}%</span>
                  <span className="text-rose-300">Down {nextDownPercent}%</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    style={{ width: `${nextUpPercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300"
                  />
                  <div
                    style={{ width: `${nextDownPercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-red-600"
                  />
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-4 border-t border-white/10 pt-2.5 text-sm">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Price</div>
                  <div className="mt-0.5 text-sm font-semibold text-white">
                    {round.lastPrice !== undefined ? formatPrice(round.lastPrice) : "--"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Prize Pool</div>
                  <div className="mt-0.5 text-sm font-semibold text-white">{round.prizePool}</div>
                </div>
              </div>

              <div className="relative z-10 mt-auto grid gap-2 border-t border-white/10 pt-2.5">
                <button
                  type="button"
                  onClick={() => setEntrySide("Up")}
                  className="rounded-[15px] bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 px-5 py-2.5 text-sm font-black text-white transition hover:brightness-105"
                >
                  Enter Up
                </button>
                <button
                  type="button"
                  onClick={() => setEntrySide("Down")}
                  className="rounded-[15px] bg-gradient-to-r from-rose-500 via-red-500 to-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:brightness-105"
                >
                  Enter Down
                </button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "absolute inset-0 overflow-hidden rounded-[26px] border border-sky-400/20 bg-[linear-gradient(180deg,rgba(34,74,154,0.98),rgba(10,23,52,0.98))] text-white shadow-[0_28px_80px_-42px_rgba(37,99,235,0.65)]",
              entrySide ? "pointer-events-auto" : "pointer-events-none",
            )}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="flex items-center justify-between bg-white/6 px-4 py-3">
              <button
                type="button"
                onClick={() => setEntrySide(null)}
                className="inline-flex items-center gap-2 text-lg font-bold text-white/90 transition hover:text-white"
              >
                <ArrowLeft className="size-5" />
                Set Position
              </button>
              <button
                type="button"
                onClick={() => setEntrySide(isUp ? "Down" : "Up")}
                className={cn(
                  "rounded-xl border border-white/10 px-4 py-2 text-xs font-black uppercase transition",
                  isUp
                    ? "bg-emerald-400 text-white shadow-[0_12px_30px_-18px_rgba(52,211,153,0.9)]"
                    : "bg-rose-500 text-white shadow-[0_12px_30px_-18px_rgba(244,63,94,0.9)]",
                )}
              >
                {entrySide}
              </button>
            </div>

            <div className="px-4 py-3">
              <div className="flex items-center justify-between text-base font-bold text-white/70">
                <span>Commit:</span>
                <span>USD</span>
              </div>

              <div className="mt-2">
                <Input
                  id={`entry-amount-${round.id}`}
                  value={entryAmount}
                  onChange={(event) => setEntryAmount(sanitizeAmountInput(event.target.value))}
                  onFocus={() => setIsEntryFocused(true)}
                  onBlur={() => setIsEntryFocused(false)}
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]{0,2}"
                  placeholder={isEntryFocused ? "" : "Enter Amount"}
                  dir="ltr"
                  className="h-12 border-0 bg-transparent px-0 text-left text-[1.7rem] font-black text-white placeholder:text-left placeholder:text-[1.7rem] placeholder:font-black placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[1.9rem] md:placeholder:text-[1.9rem]"
                />
              </div>

              <div className="mt-2.5">
                <div className="grid grid-cols-4 gap-2">
                  {["0.5", "1", "10", "100"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuickAmount(value)}
                      className="rounded-full border border-white/8 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/14 hover:text-white"
                    >
                      +${value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-2.5 rounded-[16px] border border-white/10 bg-white/6 px-4 py-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">To Win</div>
                    <div className="mt-1 text-xl font-black text-white">
                      {potentialWin ? formatUsd(potentialWin) : "--"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Payout</div>
                    <div className="mt-1 text-base font-bold text-white/85">{selectedPayout.toFixed(2)}x</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  if (!isConnected) {
                    onRequestLogin?.();
                    return;
                  }
                }}
                className={cn(
                  "relative z-10 mt-3 w-full rounded-[16px] px-5 py-3 text-lg font-black transition duration-200 will-change-transform hover:-translate-y-0.5 hover:scale-[1.01] hover:brightness-110 hover:shadow-[0_16px_38px_-18px_rgba(15,23,42,0.45)] active:translate-y-0 active:scale-[0.995]",
                  isUp ? "bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 text-white" : "bg-gradient-to-r from-rose-500 via-red-500 to-red-600 text-white",
                )}
              >
                {!isConnected ? "Connect Wallet" : entryAmount ? `Commit $${entryAmount}` : "Commit $0"}
              </button>

              <p className="mt-1.5 text-xs font-semibold leading-4 text-white/55">
                You won&apos;t be able to remove or change your position once you enter it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mutedCard = isExpired || isLater;
  const expiredOutcomeTheme = isExpired
    ? resolvedOutcome === "Up"
      ? "border-emerald-200/90 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(236,253,245,0.98),rgba(16,185,129,0.18))] shadow-[0_28px_72px_-48px_rgba(16,185,129,0.5)] dark:border-emerald-400/15 dark:bg-[linear-gradient(180deg,rgba(20,24,28,0.98),rgba(10,30,24,0.98),rgba(5,150,105,0.24))]"
      : resolvedOutcome === "Down"
        ? "border-rose-200/90 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(255,241,242,0.98),rgba(244,63,94,0.16))] shadow-[0_28px_72px_-48px_rgba(244,63,94,0.46)] dark:border-rose-400/15 dark:bg-[linear-gradient(180deg,rgba(22,22,28,0.98),rgba(34,13,22,0.98),rgba(190,24,93,0.24))]"
        : statusStyle.frame
    : "";

  return (
    <div
      className={cn(
        "group relative min-w-[272px] max-w-[292px] overflow-hidden rounded-[24px] border p-3.5 text-slate-950 transition-all duration-300 hover:-translate-y-1 dark:text-white",
        isExpired ? expiredOutcomeTheme : statusStyle.frame,
        statusStyle.glow,
        mutedCard && "opacity-85 saturate-75",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-y-5 left-0 w-1 rounded-r-full opacity-90", statusStyle.accent)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {round.assetImage ? (
            <img src={round.assetImage} alt="" className="size-8 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15" />
          ) : null}
          <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em]", statusStyle.badge)}>
            {isLive || isNext ? <PlayCircle className="size-3.5" /> : <Clock3 className="size-3.5" />}
            {formatStatus(round.status)}
          </div>
        </div>
        <div className="rounded-full border border-black/5 bg-black/[0.03] px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
          {marketTag}
        </div>
      </div>

      <div className="relative mt-3">
        {isExpired ? (
          <div className="grid gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.22em]",
                  resolvedOutcome === "Up" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
                )}>
                  Outcome
                </div>
                <div className={cn(
                  "mt-1.5 text-[1.6rem] font-black tracking-tight",
                  resolvedOutcome === "Up" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
                )}>
                  {resolvedOutcome}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {outcomePayout?.toFixed(2)}x
                </div>
                <div className="mt-1.5 text-base font-semibold text-slate-900 dark:text-white">Payout</div>
              </div>
            </div>
          </div>
        ) : !isLater && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-4">
            <div>
              <div className="mt-1.5 flex items-center gap-2">
                {favoredSide === "Up" ? (
                  <ArrowUpRight className="size-5 text-sky-600 dark:text-sky-300" />
                ) : (
                  <ArrowDownRight className="size-5 text-blue-700 dark:text-blue-300" />
                )}
                <span className="text-[1.45rem] font-semibold tracking-tight text-slate-950 dark:text-white">
                  {favoredSide} {favoredPercent}%
                </span>
              </div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isLive ? "Calculating resolution" : `${favoredPayout}x payout`}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Other</div>
              <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{opposingPayout}x</div>
            </div>
          </div>
        )}

        {!isLater && (
        <div className={cn("mt-3 pt-3", !isNext && "border-t border-slate-200/80 dark:border-white/10")}>
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em]">
            <span className={cn(
              isExtremeLean
                ? isUpFavored
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-rose-400 dark:text-rose-300"
                : "text-emerald-600 dark:text-emerald-300",
            )}>
              Up {round.upPercent}%
            </span>
            <span className={cn(
              isExtremeLean
                ? !isUpFavored
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-emerald-500/75 dark:text-emerald-200/75"
                : "text-rose-600 dark:text-rose-300",
            )}>
              Down {round.downPercent}%
            </span>
          </div>
          <div className={cn(
            "flex h-2.5 overflow-hidden rounded-full dark:bg-white/10",
            isExtremeLean ? (isUpFavored ? "bg-emerald-100/90" : "bg-rose-100/90") : "bg-slate-200/80",
          )}>
            <div
              style={{ width: `${round.upPercent}%` }}
              className={cn(
                "h-full rounded-full",
                isExtremeLean
                  ? (isUpFavored
                    ? "bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300"
                    : "bg-gradient-to-r from-rose-300 via-rose-400 to-red-500")
                  : "bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300",
              )}
            />
            <div
              style={{ width: `${round.downPercent}%` }}
              className={cn(
                "h-full rounded-full",
                isExtremeLean
                  ? (!isUpFavored
                    ? "bg-gradient-to-r from-rose-500 via-red-500 to-red-600"
                    : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500")
                  : "bg-gradient-to-r from-rose-500 via-red-500 to-red-600",
              )}
            />
          </div>
        </div>
        )}

        <div
          className={cn(
            "grid gap-2.5 border-t border-slate-200/80 dark:border-white/10",
            isExpired ? "mt-2 pt-2" : "mt-3 pt-3",
            (isExpired || isLive) && !isLater && "grid-cols-2 items-start",
            isLive && !isLater && "grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3",
          )}
        >
          {!isLater && priceLabel && marketPrice !== undefined ? (
            <div className={cn("grid min-w-0 content-start gap-1", isLive && "text-sm")}>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{isLive ? "Last Price" : "Close"}</div>
              <div className={cn(
                "font-semibold text-slate-950 dark:text-white tabular-nums",
                isLive ? "min-h-[1.75rem] whitespace-nowrap text-base leading-7 sm:text-lg" : "text-[1.45rem] tracking-tight",
              )}>
                {formatPrice(marketPrice)}
              </div>
            </div>
          ) : null}

          {isExpired && (
            <div className="text-right text-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Prize Pool</div>
              <div className="mt-1 font-semibold text-slate-950 dark:text-white">{round.prizePool}</div>
            </div>
          )}

          {isLive && (
            <div className="grid min-w-0 content-start gap-1 text-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Locked Price</div>
              <div className="min-h-[1.75rem] whitespace-nowrap text-base font-semibold leading-7 text-slate-950 dark:text-white tabular-nums sm:text-lg">{formatPrice(round.lockPrice)}</div>
            </div>
          )}

          {isLive && (
            <div className="col-span-2 text-sm">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Prize Pool</div>
              <div className="mt-1 font-semibold text-slate-950 dark:text-white">{round.prizePool}</div>
            </div>
          )}

          {isLater && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Time Left</div>
              <div className="mt-1.5 text-[1.55rem] font-black tracking-tight text-slate-800 dark:text-slate-100">
                {liveStartsIn ?? "--"}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-slate-200/80 pt-3 dark:border-white/10">
          {mutedCard ? (
            <div className="ml-auto flex items-center justify-between gap-3">
              <button
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-colors",
                  "border border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
                )}
                disabled
              >
                {isLater ? "Waiting" : "Settled"}
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center justify-between gap-3">
              <button
                className="border border-blue-200/70 bg-white/55 text-blue-900 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-blue-100 dark:hover:bg-white/[0.06] rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-colors"
              >
                Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
