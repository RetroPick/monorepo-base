import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ArrowLeft, Clock3, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { ThresholdRound } from "@/types/threshold";

interface ThresholdRoundCardProps {
  round: ThresholdRound;
  onRequestLogin?: () => void;
}

const statusStyles: Record<ThresholdRound["status"], { badge: string; frame: string; glow: string }> = {
  live: {
    badge: "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    frame: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(245,255,249,0.98),rgba(233,250,241,0.96))] dark:border-emerald-400/18 dark:bg-[linear-gradient(180deg,rgba(6,22,18,0.98),rgba(5,18,14,0.96))]",
    glow: "shadow-[0_28px_80px_-44px_rgba(16,185,129,0.45)]",
  },
  next: {
    badge: "border-blue-500/30 bg-blue-500/12 text-blue-700 dark:text-blue-300",
    frame: "border-blue-200/80 bg-[linear-gradient(180deg,rgba(244,249,255,0.98),rgba(231,240,255,0.96))] dark:border-blue-400/18 dark:bg-[linear-gradient(180deg,rgba(7,18,39,0.98),rgba(5,13,29,0.96))]",
    glow: "shadow-[0_28px_80px_-44px_rgba(37,99,235,0.48)]",
  },
  locked: {
    badge: "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    frame: "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,236,0.98),rgba(252,244,220,0.96))] dark:border-amber-400/18 dark:bg-[linear-gradient(180deg,rgba(33,23,8,0.98),rgba(22,16,7,0.96))]",
    glow: "shadow-[0_26px_76px_-44px_rgba(245,158,11,0.42)]",
  },
  resolved: {
    badge: "border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-300",
    frame: "border-slate-200/90 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(241,245,249,0.98))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(23,23,28,0.98),rgba(16,18,24,0.98))]",
    glow: "shadow-[0_24px_56px_-46px_rgba(100,116,139,0.42)]",
  },
  later: {
    badge: "border-slate-300/80 bg-slate-200/70 text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-300",
    frame: "border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(26,28,34,0.98),rgba(17,19,25,0.98))]",
    glow: "shadow-[0_24px_56px_-46px_rgba(100,116,139,0.38)]",
  },
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatLiveCountdown(targetMs: number, format: NonNullable<ThresholdRound["startsInFormat"]>) {
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

function sanitizeAmountInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...decimals] = normalized.split(".");
  const decimal = decimals.join("").slice(0, 2);
  return decimal.length > 0 ? `${whole}.${decimal}` : whole + (normalized.includes(".") ? "." : "");
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function ThresholdRoundCard({ round, onRequestLogin }: ThresholdRoundCardProps) {
  const { isConnected } = useAccount();
  const [entrySide, setEntrySide] = useState<"Above" | "Below" | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
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

  const style = statusStyles[round.status];
  const currentPrice = round.finalPrice ?? round.currentPrice;
  const isAboveThreshold = currentPrice !== undefined
    ? currentPrice >= round.thresholdValue
      : false;
  const relation = currentPrice !== undefined
    ? isAboveThreshold
      ? "Above"
      : "Below"
    : "Pending";
  const resultSide = round.finalPrice !== undefined
    ? round.finalPrice >= round.thresholdValue
      ? "Above"
      : "Below"
    : null;
  const selectedPayout = entrySide === "Above" ? round.abovePayout : round.belowPayout;
  const parsedAmount = Number(entryAmount);
  const potentialWin = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount * selectedPayout : null;
  const isActionable = round.status === "next" || round.status === "live";
  const marketTag = `#${round.id}`;
  const metricPriceLabel = round.finalPrice !== undefined ? "Final Price" : "Current Price";
  const stateCopy =
    round.status === "later"
      ? `Opens in ${liveStartsIn}`
      : round.status === "locked"
        ? `Locked · ${round.lockTime}`
        : round.status === "resolved"
          ? `Winner · ${resultSide ?? "--"}`
          : `${relation} threshold`;
  const resolvedTheme = round.status === "resolved"
    ? resultSide === "Above"
      ? "border-emerald-200/90 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(236,253,245,0.98),rgba(16,185,129,0.18))] shadow-[0_28px_72px_-48px_rgba(16,185,129,0.5)] dark:border-emerald-400/15 dark:bg-[linear-gradient(180deg,rgba(20,24,28,0.98),rgba(10,30,24,0.98),rgba(5,150,105,0.24))]"
      : resultSide === "Below"
        ? "border-rose-200/90 bg-[linear-gradient(180deg,rgba(249,250,251,0.98),rgba(255,241,242,0.98),rgba(244,63,94,0.16))] shadow-[0_28px_72px_-48px_rgba(244,63,94,0.46)] dark:border-rose-400/15 dark:bg-[linear-gradient(180deg,rgba(22,22,28,0.98),rgba(34,13,22,0.98),rgba(190,24,93,0.24))]"
        : style.frame
    : style.frame;

  const requestEntry = (side: "Above" | "Below") => {
    if (!isConnected) {
      onRequestLogin?.();
      return;
    }
    setEntrySide(side);
  };

  if (round.status === "later" && !entrySide) {
    return (
      <div className="min-w-[308px] max-w-[330px]">
        <div className={cn("min-h-[390px] rounded-[28px] border p-4", style.frame, style.glow)}>
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]", style.badge)}>
                  Later
                </div>
                <div className="mt-3 text-[12px] font-bold text-muted-foreground">{marketTag}</div>
              </div>
              {round.assetImage ? <img src={round.assetImage} alt="" className="size-9 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10" /> : null}
            </div>

            <div className="mt-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Time Left</div>
              <div className="mt-2 text-[2rem] font-black tracking-[-0.05em] text-foreground">{liveStartsIn}</div>
            </div>

            <div className="mt-auto rounded-[20px] border border-border/60 bg-background/70 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Status</div>
              <div className="mt-1 text-[1rem] font-semibold text-foreground">Waiting</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!entrySide) {
    return (
      <div className="min-w-[308px] max-w-[330px]">
        <div className={cn("min-h-[390px] overflow-hidden rounded-[28px] border p-4 text-card-foreground", resolvedTheme, style.glow)}>
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {round.assetImage ? <img src={round.assetImage} alt="" className="size-8 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10" /> : null}
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">{round.assetSymbol}</span>
                  <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]", style.badge)}>
                    {round.status}
                  </span>
                </div>
                <h3 className="mt-2.5 line-clamp-2 text-[0.98rem] font-black leading-[1.12] tracking-[-0.03em] text-foreground">
                  {round.title}
                </h3>
              </div>
              <div className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                {marketTag}
              </div>
            </div>

            <div className="mt-2.5">
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{round.familyLabel}</div>
                  <div className={cn("mt-1 flex items-center gap-1.5", isAboveThreshold ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                    <PlayCircle className="size-3.5" />
                    <span className="text-[1.15rem] font-semibold tracking-tight text-foreground">{relation} {isAboveThreshold ? round.abovePercent : round.belowPercent}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{metricPriceLabel}</div>
                  <div className="mt-1 text-base font-semibold tracking-tight text-foreground">{currentPrice !== undefined ? formatPrice(currentPrice) : "--"}</div>
                </div>
              </div>
            </div>

            <div className="mt-2.5 border-t border-border/60 pt-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em]">
                <span className="text-emerald-600 dark:text-emerald-300">{round.abovePercent}% Above</span>
                <span className="text-rose-600 dark:text-rose-300">{round.belowPercent}% Below</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-border/70 dark:bg-white/10">
                <div style={{ width: `${round.abovePercent}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300" />
                <div style={{ width: `${round.belowPercent}%` }} className="h-full bg-gradient-to-r from-rose-500 via-red-500 to-red-600" />
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-4 border-t border-border/60 pt-2.5 text-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Threshold</div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">{formatPrice(round.thresholdValue)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Prize Pool</div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">{round.prizePool}</div>
              </div>
            </div>

            <div className="mt-2.5 rounded-[18px] border border-border/60 bg-background/60 px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2 font-bold text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  <span>{stateCopy}</span>
                </div>
                <div className="font-semibold text-foreground">{round.resolveTime}</div>
              </div>
            </div>

            <div className="mt-auto pt-2.5">
              {round.status === "resolved" ? (
                <div className={cn(
                  "rounded-[18px] border px-4 py-3 text-center",
                  resultSide === "Above"
                    ? "border-emerald-200/80 bg-emerald-50/85 dark:border-emerald-400/20 dark:bg-emerald-950/30"
                    : resultSide === "Below"
                      ? "border-rose-200/80 bg-rose-50/85 dark:border-rose-400/20 dark:bg-rose-950/30"
                      : "border-border/70 bg-background/80",
                )}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Resolved Winner</div>
                  <div className={cn(
                    "mt-1 text-[15px] font-black",
                    resultSide === "Above"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : resultSide === "Below"
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-foreground",
                  )}>{resultSide}</div>
                </div>
              ) : round.status === "locked" ? (
                <div className="rounded-[18px] border border-border/70 bg-background/80 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Entry closed at {round.lockTime}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => requestEntry("Above")}
                    className="rounded-[18px] bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 px-4 py-2.5 text-sm font-black text-white transition hover:brightness-105"
                  >
                    Above
                  </button>
                  <button
                    type="button"
                    onClick={() => requestEntry("Below")}
                    className="rounded-[18px] bg-gradient-to-r from-rose-500 via-red-500 to-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:brightness-105"
                  >
                    Below
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[308px] max-w-[330px]">
      <div className={cn("min-h-[390px] overflow-hidden rounded-[28px] border p-4 text-card-foreground", style.frame, style.glow)}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setEntrySide(null)}
              className="inline-flex items-center gap-2 text-sm font-black text-foreground transition hover:opacity-80"
            >
              <ArrowLeft className="size-4.5" />
              Back
            </button>
            <div className={cn(
              "rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]",
              entrySide === "Above" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
            )}>
              {entrySide}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Stake</div>
            <Input
              value={entryAmount}
              onChange={(event) => setEntryAmount(sanitizeAmountInput(event.target.value))}
              inputMode="decimal"
              placeholder="Enter Amount"
              className="mt-2 h-14 rounded-[18px] border-border/70 bg-background/80 px-4 text-[1.4rem] font-black tracking-tight"
            />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {["1", "10", "25", "100"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEntryAmount(value)}
                  className="rounded-full border border-border/70 bg-background/75 px-2 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:bg-background hover:text-foreground"
                >
                  ${value}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-border/70 bg-background/80 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Threshold</span>
              <span className="font-bold text-foreground">{formatPrice(round.thresholdValue)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Potential payout</span>
              <span className="font-bold text-foreground">{potentialWin ? formatUsd(potentialWin) : "--"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Resolution</span>
              <span className="font-bold text-foreground">{round.resolveTime}</span>
            </div>
          </div>

          <button
            type="button"
            className={cn(
              "mt-auto rounded-[18px] px-4 py-3 text-sm font-black text-white transition hover:brightness-105",
              entrySide === "Above"
                ? "bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300"
                : "bg-gradient-to-r from-rose-500 via-red-500 to-red-600",
            )}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
