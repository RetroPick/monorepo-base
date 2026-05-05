import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Gift, Loader2 } from "lucide-react";
import type { Market, MarketOutcome } from "@/types/market";
import Icon from "./Icon";
import BetModal from "./BetModal";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { formatPayoutMultiplier } from "@/lib/market-odds";
import { pickBinaryOutcomes, resolveMarketCardLayout } from "@/lib/market-card-layout";
import { useMarketBookmark } from "@/features/portfolio/useMarketBookmark";

interface MarketCardProps {
  market: Market;
  navigationState?: Record<string, unknown>;
  href?: string;
  /** Discover grid: navigate to market detail on bet / card instead of modal / external href. */
  variant?: "default" | "discover";
}

/**
 * Compact fixed shell shared by Direction, Threshold, Range, and Multi.
 * Multi/range lists keep their scroll container classes unchanged; only the outer box is shorter.
 */
const MARKET_CARD_SHELL_H =
  "h-[200px] max-h-[200px] shrink-0 sm:h-[212px] sm:max-h-[212px]";

const RING_R = 16;
const RING_C = 2 * Math.PI * RING_R;

/** Distinct segment colors for multi-outcome allocation (range / multi). */
const ALLOCATION_PALETTE = [
  "rgb(16 185 129)", // emerald-500
  "rgb(59 130 246)", // blue-500
  "rgb(139 92 246)", // violet-500
  "rgb(245 158 11)", // amber-500
  "rgb(244 63 94)", // rose-500
] as const;

const ringWrapClass =
  "relative flex size-11 shrink-0 items-center justify-center sm:size-12";

function AllocationRingBinary({ yesP, noP }: { yesP: number; noP: number }) {
  const y = Math.max(0, Math.min(100, yesP));
  const n = Math.max(0, Math.min(100, noP));
  const tot = y + n || 1;
  const yesLen = (y / tot) * RING_C;
  const noLen = (n / tot) * RING_C;
  const label = Math.round(y);
  return (
    <div className={ringWrapClass} aria-hidden>
      <svg className="size-11 -rotate-90 sm:size-12" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={RING_R} fill="none" strokeWidth="2.5" className="stroke-muted/40" />
        {yesLen >= 0.2 ? (
          <circle
            cx="22"
            cy="22"
            r={RING_R}
            fill="none"
            strokeWidth="2.5"
            stroke="rgb(16 185 129)"
            strokeLinecap="round"
            strokeDasharray={`${yesLen} ${RING_C}`}
            strokeDashoffset={0}
            className="transition-[stroke-dasharray] duration-300"
          />
        ) : null}
        {noLen >= 0.2 ? (
          <circle
            cx="22"
            cy="22"
            r={RING_R}
            fill="none"
            strokeWidth="2.5"
            stroke="rgb(244 63 94)"
            strokeLinecap="round"
            strokeDasharray={`${noLen} ${RING_C}`}
            strokeDashoffset={-yesLen}
            className="transition-[stroke-dasharray] duration-300"
          />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center leading-none">
        <span className="text-[10px] font-bold tabular-nums text-foreground sm:text-[11px]">{label}%</span>
      </div>
    </div>
  );
}

function AllocationRingMulti({ outcomes }: { outcomes: MarketOutcome[] }) {
  const weights = outcomes.map((o) => Math.max(0, o.probability));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const maxPct = Math.round(Math.max(...weights, 0));
  let cum = 0;
  return (
    <div className={ringWrapClass} aria-hidden>
      <svg className="size-11 -rotate-90 sm:size-12" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={RING_R} fill="none" strokeWidth="2.5" className="stroke-muted/40" />
        {weights.map((w, i) => {
          const len = (w / sum) * RING_C;
          if (len < 0.15) return null;
          const off = -cum;
          cum += len;
          return (
            <circle
              key={outcomes[i].id}
              cx="22"
              cy="22"
              r={RING_R}
              fill="none"
              strokeWidth="2.5"
              stroke={ALLOCATION_PALETTE[i % ALLOCATION_PALETTE.length]}
              strokeLinecap="butt"
              strokeDasharray={`${len} ${RING_C}`}
              strokeDashoffset={off}
              className="transition-[stroke-dasharray,stroke-dashoffset] duration-300"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center leading-none">
        <span className="text-[10px] font-bold tabular-nums text-foreground sm:text-[11px]">{maxPct}%</span>
      </div>
    </div>
  );
}

/** Small row Yes/No: original gradient 3D-style buttons. */
const outcomeYesClass =
  "min-w-[2.25rem] rounded border border-emerald-700/95 bg-gradient-to-b from-emerald-500 to-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_0_0_rgb(6,95,70),0_2px_6px_rgba(0,0,0,0.25)] transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:text-[10px]";

const outcomeNoClass =
  "min-w-[2.25rem] rounded border border-rose-700/95 bg-gradient-to-b from-rose-500 to-rose-700 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_0_0_rgb(159,18,57),0_2px_6px_rgba(0,0,0,0.25)] transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:text-[10px]";

/**
 * Range-bin **Pick!**: same gradient chrome as YES; hover only raises opacity (no brightness / press lift).
 */
const outcomePickClass =
  "min-h-8 min-w-[4.5rem] rounded-md border border-emerald-700/95 bg-gradient-to-b from-emerald-500 to-emerald-700 px-3 py-1.5 text-[11px] font-bold leading-none text-white opacity-80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_0_0_rgb(6,95,70),0_2px_6px_rgba(0,0,0,0.25)] transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:min-h-9 sm:min-w-[5rem] sm:px-3.5 sm:py-2 sm:text-xs";

type BetHandler = (e: React.MouseEvent, side: "YES" | "NO", outcomeLabel: string) => void;

/** Up vs Down: same two-column structure as `BinaryYesNoRow` (label · % · mult · full-width CTA). */
function UpDownBinaryRow({
  upOutcome,
  downOutcome,
  onBet,
}: {
  upOutcome: MarketOutcome;
  downOutcome: MarketOutcome;
  onBet: BetHandler;
}) {
  const upP = Math.round(upOutcome.probability);
  const downP = Math.round(downOutcome.probability);
  const upMult = formatPayoutMultiplier(upOutcome.probability);
  const downMult = formatPayoutMultiplier(downOutcome.probability);
  return (
    <div className="flex gap-1.5 pt-0.5 sm:gap-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-left text-[10px] font-medium text-foreground sm:text-[11px]">{upOutcome.label}</span>
          <span className="shrink-0 tabular-nums text-[11px] font-semibold text-foreground sm:text-[12px]">{upP}%</span>
        </div>
        <span
          className="text-[9px] font-medium tabular-nums text-muted-foreground"
          title="Approx. gross return on $1 stake if Up wins (illustrative)"
        >
          {upMult}
        </span>
        <button
          type="button"
          aria-label={`Up ${upMult}`}
          onClick={(e) => onBet(e, "YES", upOutcome.label)}
          className={cn(outcomeYesClass, "mt-0.5 w-full px-2 py-1 text-[10px] sm:text-[11px]")}
        >
          Up
        </button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-left text-[10px] font-medium text-foreground sm:text-[11px]">{downOutcome.label}</span>
          <span className="shrink-0 tabular-nums text-[11px] font-semibold text-foreground sm:text-[12px]">{downP}%</span>
        </div>
        <span
          className="text-[9px] font-medium tabular-nums text-muted-foreground"
          title="Approx. gross return on $1 stake if Down wins (illustrative)"
        >
          {downMult}
        </span>
        <button
          type="button"
          aria-label={`Down ${downMult}`}
          onClick={(e) => onBet(e, "NO", downOutcome.label)}
          className={cn(outcomeNoClass, "mt-0.5 w-full px-2 py-1 text-[10px] sm:text-[11px]")}
        >
          Down
        </button>
      </div>
    </div>
  );
}

/** Single-question binary: one YES and one NO (not repeated per outcome row). */
function BinaryYesNoRow({
  yesOutcome,
  noOutcome,
  onBet,
}: {
  yesOutcome: MarketOutcome;
  noOutcome: MarketOutcome;
  onBet: BetHandler;
}) {
  const yesP = Math.round(yesOutcome.probability);
  const noP = Math.round(noOutcome.probability);
  const yesMult = formatPayoutMultiplier(yesOutcome.probability);
  const noMult = formatPayoutMultiplier(noOutcome.probability);
  return (
    <div className="flex gap-1.5 pt-0.5 sm:gap-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-left text-[10px] font-medium text-foreground sm:text-[11px]">{yesOutcome.label}</span>
          <span className="shrink-0 tabular-nums text-[11px] font-semibold text-foreground sm:text-[12px]">{yesP}%</span>
        </div>
        <span
          className="text-[9px] font-medium tabular-nums text-muted-foreground"
          title="Approx. gross return on $1 stake if Yes wins (illustrative)"
        >
          {yesMult}
        </span>
        <button
          type="button"
          aria-label={`Yes ${yesMult}`}
          onClick={(e) => onBet(e, "YES", yesOutcome.label)}
          className={cn(outcomeYesClass, "mt-0.5 w-full px-2 py-1 text-[10px] sm:text-[11px]")}
        >
          YES
        </button>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-left text-[10px] font-medium text-foreground sm:text-[11px]">{noOutcome.label}</span>
          <span className="shrink-0 tabular-nums text-[11px] font-semibold text-foreground sm:text-[12px]">{noP}%</span>
        </div>
        <span
          className="text-[9px] font-medium tabular-nums text-muted-foreground"
          title="Approx. gross return on $1 stake if No wins (illustrative)"
        >
          {noMult}
        </span>
        <button
          type="button"
          aria-label={`No ${noMult}`}
          onClick={(e) => onBet(e, "NO", noOutcome.label)}
          className={cn(outcomeNoClass, "mt-0.5 w-full px-2 py-1 text-[10px] sm:text-[11px]")}
        >
          NO
        </button>
      </div>
    </div>
  );
}

/**
 * **Multi Yes/No**: each row is a **separate** Yes/No sub-market on that outcome (not one winner like range).
 * Strip layout matches range **visually** only (label · implied Yes% · mult · YES/NO).
 */
function MultiOutcomeRow({
  outcome,
  onBet,
}: {
  outcome: MarketOutcome;
  onBet: BetHandler;
}) {
  const p = Math.round(outcome.probability);
  const yesMult = formatPayoutMultiplier(outcome.probability);
  const noMult = formatPayoutMultiplier(Math.max(1, Math.min(99, 100 - outcome.probability)));
  return (
    <div className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left sm:gap-2 sm:py-2">
      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground sm:text-[11px]">{outcome.label}</span>
      <div className="flex shrink-0 flex-col items-end gap-0 sm:flex-row sm:items-center sm:gap-2">
        <span className="tabular-nums text-[11px] font-semibold text-foreground sm:text-[12px]">{p}%</span>
        <span
          className="text-[9px] font-medium tabular-nums text-muted-foreground"
          title="Implied Yes probability for this line; illustrative payout if Yes on this outcome wins."
        >
          {yesMult}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label={`Pick ${outcome.label}, ${yesMult}`}
          onClick={(e) => onBet(e, "YES", outcome.label)}
          className={outcomePickClass}
        >
          Pick!
        </button>
        <button
          type="button"
          aria-label={`No ${outcome.label} ${noMult}`}
          onClick={(e) => onBet(e, "NO", outcome.label)}
          className={outcomeNoClass}
        >
          NO
        </button>
      </div>
    </div>
  );
}

/**
 * **Range**: one contest, mutually exclusive bins, **one** winner from the pool; rows show pool share (not Yes/No pairs).
 * Strip shape matches multi **only for layout**; settlement rules differ.
 */
function RangeBinRow({
  outcome,
  onPickBin,
}: {
  outcome: MarketOutcome;
  /** Back this bin (single winner pool); uses YES + outcome label for modal compatibility. */
  onPickBin: (e: React.MouseEvent, outcomeLabel: string) => void;
}) {
  const p = Math.round(outcome.probability);
  const mult = formatPayoutMultiplier(outcome.probability);
  return (
    <div className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left sm:gap-2.5 sm:px-3 sm:py-2.5">
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground sm:text-xs">{outcome.label}</span>
      <div className="flex shrink-0 flex-col items-end gap-0 sm:flex-row sm:items-center sm:gap-2">
        <span className="tabular-nums text-[12px] font-semibold text-foreground sm:text-sm">{p}%</span>
        <span
          className="text-[10px] font-medium tabular-nums text-muted-foreground"
          title="Approx. gross return on $1 if this range wins (illustrative)"
        >
          {mult}
        </span>
      </div>
      <button
        type="button"
        className={outcomePickClass}
        aria-label={`Pick ${outcome.label}, ${mult}`}
        onClick={(e) => {
          e.stopPropagation();
          onPickBin(e, outcome.label);
        }}
      >
        Pick!
      </button>
    </div>
  );
}

const MarketCard = memo(({ market, navigationState, href, variant = "default" }: MarketCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [betModal, setBetModal] = useState<{ open: boolean; side: "YES" | "NO"; outcome: string } | null>(null);
  const bookmark = useMarketBookmark(market.id);

  const handleBet: BetHandler = (e, side, outcomeLabel) => {
    e.stopPropagation();
    if (variant === "discover") {
      if (href) {
        navigate(href);
        return;
      }
      navigate(`/app/market/${market.id}`, navigationState ? { state: navigationState } : { state: { market } });
      return;
    }
    if (href) {
      navigate(href);
      return;
    }
    setBetModal({ open: true, side, outcome: outcomeLabel });
  };

  const handleRangeBinPick = (e: React.MouseEvent, outcomeLabel: string) => {
    handleBet(e, "YES", outcomeLabel);
  };

  const handleCardClick = () => {
    if (href) {
      navigate(href);
      return;
    }
    navigate(`/app/market/${market.id}`, navigationState ? { state: navigationState } : {});
  };

  const statusLabel = (market.status ?? "Open").toLowerCase() === "open" ? "LIVE" : (market.status ?? "-").toUpperCase();
  const isLive = (market.status ?? "Open").toLowerCase() === "open";

  const cardLayout = resolveMarketCardLayout(market);
  const { yes: yesOutcome, no: noOutcome } = market.isBinary ? pickBinaryOutcomes(market) : { yes: undefined, no: undefined };

  const rowOutcomes = market.outcomes;
  const rawFooter = (market.totalPool || market.volume || "").trim();
  const footerPoolLabel =
    rawFooter === "" || /^0(\.0+)?$/.test(rawFooter.replace(/,/g, "")) ? "-" : rawFooter;

  const isDiscover = variant === "discover";
  const cardShell = cn(
    "group relative flex w-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm outline-none transition-colors duration-200 hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring dark:border-white/[0.08] dark:bg-card dark:hover:bg-card/90",
    MARKET_CARD_SHELL_H,
    isDiscover ? "p-1 dark:border-white/[0.06] sm:p-1.5" : "p-1.5 sm:p-2",
  );

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className={cardShell}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 gap-2 sm:gap-2.5">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border/40 sm:size-10",
                market.iconBg || "bg-muted",
              )}
            >
              {market.image ? (
                <img src={market.image} alt="" className="size-full object-cover" />
              ) : (
                <Icon name={market.icon} className={cn("text-lg", market.iconColor || "text-foreground")} />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-px">
              <h3 className="line-clamp-2 w-full min-w-0 text-left text-[12px] font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary sm:text-[13px]">
                {market.title}
              </h3>
            </div>
            {(cardLayout === "binary-yesno" || cardLayout === "updown") && yesOutcome && noOutcome ? (
              <AllocationRingBinary yesP={yesOutcome.probability} noP={noOutcome.probability} />
            ) : (cardLayout === "multi" || cardLayout === "range") && rowOutcomes.length > 0 ? (
              <AllocationRingMulti outcomes={rowOutcomes} />
            ) : null}
          </div>

          <div className="mt-1.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-0.5">
            {cardLayout === "updown" && yesOutcome && noOutcome ? (
              <UpDownBinaryRow upOutcome={yesOutcome} downOutcome={noOutcome} onBet={handleBet} />
            ) : cardLayout === "binary-yesno" && yesOutcome && noOutcome ? (
              <BinaryYesNoRow yesOutcome={yesOutcome} noOutcome={noOutcome} onBet={handleBet} />
            ) : cardLayout === "range" ? (
              <div
                className="flex min-h-0 flex-1 basis-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1 [scrollbar-gutter:stable]"
                data-testid="market-card-outcomes-scroll"
                aria-label="Market outcomes"
              >
                {rowOutcomes.map((outcome) => (
                  <RangeBinRow key={outcome.id} outcome={outcome} onPickBin={handleRangeBinPick} />
                ))}
              </div>
            ) : cardLayout === "multi" ? (
              <div
                className="flex min-h-0 flex-1 basis-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1 [scrollbar-gutter:stable]"
                data-testid="market-card-outcomes-scroll"
                aria-label="Market outcomes"
              >
                {rowOutcomes.map((outcome) => (
                  <MultiOutcomeRow key={outcome.id} outcome={outcome} onBet={handleBet} />
                ))}
              </div>
            ) : null}
          </div>

          {market.isFeatured ? (
            <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-amber-500/95 dark:text-amber-400">
              <span aria-hidden>✦</span> NEW
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex min-h-0 shrink-0 items-center justify-between pt-1 sm:pt-1.5">
          <div className="flex min-w-0 items-center gap-1.5 text-[9px] font-medium text-muted-foreground sm:text-[10px]">
            <span
              className={cn("size-1.5 shrink-0 rounded-full", isLive ? "bg-rose-500" : "bg-muted-foreground")}
              aria-hidden
            />
            <span className={cn("shrink-0 uppercase tracking-wide", isLive ? "text-rose-400" : "text-muted-foreground")}>
              {statusLabel}
            </span>
            <span className="truncate tabular-nums normal-case">
              · {t("market_card.volume")} {footerPoolLabel}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="Rewards"
              onClick={(e) => e.stopPropagation()}
              className="rounded p-1.5 text-muted-foreground opacity-50 transition-all hover:bg-muted hover:text-foreground hover:opacity-100"
            >
              <Gift className="size-3.5 sm:size-4" strokeWidth={1.75} />
            </button>
            {bookmark.templateId ? (
              <button
                type="button"
                aria-label={bookmark.isBookmarked ? "Remove bookmark" : "Bookmark market"}
                disabled={bookmark.busy || bookmark.watchlistLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  void bookmark.toggle();
                }}
                className={cn(
                  "rounded p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:opacity-100 disabled:pointer-events-none disabled:opacity-40",
                  bookmark.isBookmarked ? "opacity-100" : "opacity-50",
                )}
              >
                {bookmark.busy ? (
                  <Loader2 className="size-3.5 animate-spin sm:size-4" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Bookmark
                    className={cn("size-3.5 sm:size-4", bookmark.isBookmarked && "fill-primary text-primary")}
                    strokeWidth={1.75}
                  />
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!href && variant !== "discover" && betModal && (
        <BetModal
          open={betModal.open}
          onClose={() => setBetModal(null)}
          marketTitle={market.title}
          outcome={betModal.outcome}
          side={betModal.side}
          price={0.5}
        />
      )}
    </>
  );
});

export default MarketCard;
