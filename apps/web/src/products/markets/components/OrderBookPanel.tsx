import { useMemo } from "react";
import type { OrderBookSnapshot } from "@retropick/polymarket";

import { formatPrice, formatSize } from "../lib/decimal";
import { FreshnessBadge } from "./FreshnessBadge";

interface OrderBookPanelProps {
  snapshot?: OrderBookSnapshot;
  isLoading?: boolean;
  onSelectPrice?: (price: string) => void;
}

export function OrderBookPanel({ snapshot, isLoading, onSelectPrice }: OrderBookPanelProps) {
  const spread = snapshot?.spread;
  const hasBothSides =
    snapshot && snapshot.bids.length > 0 && snapshot.asks.length > 0 && spread != null;

  const maxSize = useMemo(() => {
    if (!snapshot) return "1";
    const sizes = [...snapshot.bids, ...snapshot.asks].map((l) => l.size);
    return sizes.reduce((a, b) => (a.length >= b.length ? a : b), "0");
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

  return (
    <section aria-label="Order book snapshot" className="space-y-3">
      <FreshnessBadge freshness={snapshot.freshness} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Snapshot · not guaranteed execution</span>
        <time dateTime={snapshot.timestamp}>{new Date(snapshot.timestamp).toLocaleTimeString()}</time>
      </div>
      {hasBothSides ? (
        <p className="text-sm">
          Spread: <span className="font-mono">{formatPrice(spread)}</span>
        </p>
      ) : (
        <p className="text-sm text-amber-400">One-sided or empty book — spread not shown.</p>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <OrderBookSide
          title="Bids"
          levels={snapshot.bids}
          tone="text-emerald-400"
          maxSize={maxSize}
          onSelectPrice={onSelectPrice}
        />
        <OrderBookSide
          title="Asks"
          levels={snapshot.asks}
          tone="text-rose-400"
          maxSize={maxSize}
          onSelectPrice={onSelectPrice}
        />
      </div>
    </section>
  );
}

function depthBarWidth(size: string, maxSize: string): number {
  if (size.length > maxSize.length) return 100;
  if (size.length < maxSize.length) return 10;
  return 60;
}

function OrderBookSide({
  title,
  levels,
  tone,
  maxSize,
  onSelectPrice,
}: {
  title: string;
  levels: OrderBookSnapshot["bids"];
  tone: string;
  maxSize: string;
  onSelectPrice?: (price: string) => void;
}) {
  return (
    <div>
      <h4 className={`mb-2 font-medium ${tone}`}>{title}</h4>
      {levels.length === 0 ? (
        <p className="text-muted-foreground">Empty</p>
      ) : (
        <ul className="space-y-1" role="list">
          {levels.slice(0, 8).map((level) => (
            <li key={`${level.price}-${level.size}`} className="relative font-mono">
              <div
                className="absolute inset-y-0 left-0 rounded bg-muted/40"
                style={{ width: `${depthBarWidth(level.size, maxSize)}%` }}
                aria-hidden
              />
              {onSelectPrice ? (
                <button
                  type="button"
                  className="relative flex w-full justify-between gap-2 px-1 py-0.5 text-left hover:bg-muted/30"
                  onClick={() => onSelectPrice(level.price)}
                >
                  <span>{formatPrice(level.price)}</span>
                  <span className="text-muted-foreground">{formatSize(level.size)}</span>
                </button>
              ) : (
                <div className="relative flex justify-between gap-2 px-1 py-0.5">
                  <span>{formatPrice(level.price)}</span>
                  <span className="text-muted-foreground">{formatSize(level.size)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
