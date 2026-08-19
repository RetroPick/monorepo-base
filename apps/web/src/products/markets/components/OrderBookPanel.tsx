import { useMemo } from "react";
import type { OrderBookSnapshot } from "@retropick/polymarket";

import { cn } from "@/shared/lib/utils";
import { formatPrice, formatSize } from "../lib/decimal";
import { FreshnessBadge } from "./FreshnessBadge";

interface OrderBookPanelProps {
  snapshot?: OrderBookSnapshot;
  isLoading?: boolean;
  onSelectPrice?: (price: string) => void;
}

function numericValue(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function OrderBookPanel({ snapshot, isLoading, onSelectPrice }: OrderBookPanelProps) {
  const spread = snapshot?.spread;
  const hasBothSides =
    snapshot && snapshot.bids.length > 0 && snapshot.asks.length > 0 && spread != null;

  const maxSize = useMemo(() => {
    if (!snapshot) return 1;
    return Math.max(
      1,
      ...[...snapshot.bids, ...snapshot.asks].map((l) => numericValue(l.size)),
    );
  }, [snapshot]);

  if (isLoading && !snapshot) {
    return <p className="text-sm text-muted-foreground">Loading order book…</p>;
  }

  if (!snapshot) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Order book unavailable.
      </p>
    );
  }

  const lastTrade = snapshot.lastTradePrice;

  return (
    <section aria-label="Order book snapshot" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FreshnessBadge freshness={snapshot.freshness} />
        <time dateTime={snapshot.timestamp} className="text-xs text-muted-foreground">
          {new Date(snapshot.timestamp).toLocaleTimeString()}
        </time>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasBothSides ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs">
            <span className="text-muted-foreground">Spread</span>
            <span className="font-mono font-bold text-cyan-300">{formatPrice(spread)}</span>
          </span>
        ) : (
          <span className="text-xs text-amber-400">One-sided or empty book — spread not shown.</span>
        )}
        {lastTrade != null && lastTrade !== "" ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs">
            <span className="text-muted-foreground">Last</span>
            <span className="font-mono font-bold text-white">{formatPrice(lastTrade)}</span>
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <OrderBookSide
          title="Bids"
          levels={snapshot.bids}
          tone="text-emerald-400"
          bestPrice={snapshot.bestBid}
          maxSize={maxSize}
          onSelectPrice={onSelectPrice}
        />
        <OrderBookSide
          title="Asks"
          levels={snapshot.asks}
          tone="text-rose-400"
          bestPrice={snapshot.bestAsk}
          maxSize={maxSize}
          onSelectPrice={onSelectPrice}
        />
      </div>
    </section>
  );
}

function OrderBookSide({
  title,
  levels,
  tone,
  bestPrice,
  maxSize,
  onSelectPrice,
}: {
  title: string;
  levels: OrderBookSnapshot["bids"];
  tone: string;
  bestPrice?: string | null;
  maxSize: number;
  onSelectPrice?: (price: string) => void;
}) {
  return (
    <div>
      <h4 className={cn("mb-2 font-medium", tone)}>{title}</h4>
      {levels.length === 0 ? (
        <p className="text-muted-foreground">Empty</p>
      ) : (
        <ul className="space-y-1" role="list">
          {levels.slice(0, 8).map((level) => {
            const depth = Math.max(8, Math.min(100, (numericValue(level.size) / maxSize) * 100));
            const isBest = bestPrice != null && level.price === bestPrice;
            return (
              <li key={`${level.price}-${level.size}`} className="relative font-mono">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded",
                    title === "Bids" ? "bg-emerald-500/15" : "bg-rose-500/15",
                  )}
                  style={{ width: `${depth}%` }}
                  aria-hidden
                />
                {onSelectPrice ? (
                  <button
                    type="button"
                    className={cn(
                      "relative flex w-full justify-between gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-white/[0.06]",
                      isBest && "font-bold",
                    )}
                    onClick={() => onSelectPrice(level.price)}
                  >
                    <span className={isBest ? "text-white" : undefined}>{formatPrice(level.price)}</span>
                    <span className="text-muted-foreground">{formatSize(level.size)}</span>
                  </button>
                ) : (
                  <div className={cn("relative flex justify-between gap-2 px-1.5 py-1", isBest && "font-bold")}>
                    <span className={isBest ? "text-white" : undefined}>{formatPrice(level.price)}</span>
                    <span className="text-muted-foreground">{formatSize(level.size)}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
