import type { MarketHealthSnapshot, PriceHistoryResponse } from "@retropick/polymarket";
import { Link } from "react-router-dom";

import { formatPrice, formatSize } from "../lib/decimal";
import { marketPath } from "../routes/paths";
import { DataStateBanner } from "./DataState";
import { FreshnessBadge } from "./FreshnessBadge";

interface PriceHistoryPanelProps {
  history?: PriceHistoryResponse;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

function scaledPrice(value: string): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const fraction = (match[2] ?? "").slice(0, 4).padEnd(4, "0");
  const scaled = BigInt(match[1]) * 10_000n + BigInt(fraction);
  if (scaled < 0n || scaled > 10_000n) return null;
  return scaled;
}

const SVG_AXIS_SCALE = 10_000n;
const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysByMonth = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysByMonth[month - 1];
}

function parseCanonicalTimestamp(timestamp: string): bigint | null {
  const match = ISO_TIMESTAMP.exec(timestamp);
  if (!match) return null;

  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond, rawTimezone] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const second = Number(rawSecond);
  const timezoneHour = rawTimezone === "Z" ? 0 : Number(rawTimezone.slice(1, 3));
  const timezoneMinute = rawTimezone === "Z" ? 0 : Number(rawTimezone.slice(4, 6));
  if (
    !isValidCalendarDate(year, month, day) ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    timezoneHour > 23 ||
    timezoneMinute > 59
  ) {
    return null;
  }

  const epochMillis = Date.parse(timestamp);
  return Number.isSafeInteger(epochMillis) ? BigInt(epochMillis) : null;
}

export function PriceHistoryPanel({ history, isLoading, error, onRetry }: PriceHistoryPanelProps) {
  if (isLoading && !history) {
    return <p className="text-sm text-muted-foreground">Loading price history…</p>;
  }

  if (!history) {
    return (
      <section aria-label="Price history" className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">Price history</h2>
        <p className="mt-2 text-sm text-muted-foreground">History unavailable. No estimated prices are shown.</p>
        <DataStateBanner error={error} onRetry={onRetry} className="mt-3" />
      </section>
    );
  }

  const plottedPoints = history.points.flatMap((point) => {
      const price = scaledPrice(point.price);
      const timestamp = parseCanonicalTimestamp(point.timestamp);
      if (price == null || timestamp == null) return [];
      return [{ price, priceText: point.price, timestamp, derived: point.derived }];
    })
  const earliestTimestamp = plottedPoints.reduce<bigint | undefined>(
    (earliest, point) => (earliest == null || point.timestamp < earliest ? point.timestamp : earliest),
    undefined,
  );
  const latestTimestamp = plottedPoints.reduce<bigint | undefined>(
    (latest, point) => (latest == null || point.timestamp > latest ? point.timestamp : latest),
    undefined,
  );
  const timestampSpan = earliestTimestamp != null && latestTimestamp != null ? latestTimestamp - earliestTimestamp : 0n;
  const chartPoints = plottedPoints
    .map((point) => {
      const x = timestampSpan === 0n ? SVG_AXIS_SCALE / 2n : ((point.timestamp - earliestTimestamp!) * SVG_AXIS_SCALE) / timestampSpan;
      return `${x},${SVG_AXIS_SCALE - point.price}`;
    })
    .join(" ");
  const latest = plottedPoints.at(-1);

  return (
    <section aria-label="Price history" className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Price history</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sparse BFF observations · {history.interval ?? "selected interval"}
          </p>
        </div>
        <FreshnessBadge freshness={history.freshness} />
      </div>
      {chartPoints ? (
        <svg
          aria-label="Sparse price history chart"
          className="mt-4 h-32 w-full rounded-lg bg-muted/30"
          preserveAspectRatio="none"
          role="img"
          viewBox="0 0 10000 10000"
        >
          <polyline fill="none" points={chartPoints} stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No price observations are available for this interval.</p>
      )}
      {latest ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Latest observed price: <span className="font-mono text-foreground">{formatPrice(latest.priceText)}</span>
          {latest.derived ? " · derived by the BFF" : ""}
        </p>
      ) : null}
      <DataStateBanner error={error} onRetry={onRetry} className="mt-3" />
    </section>
  );
}

interface MarketHealthPanelProps {
  health?: MarketHealthSnapshot;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
}

export function MarketHealthPanel({ health, isLoading, error, onRetry }: MarketHealthPanelProps) {
  if (isLoading && !health) {
    return <p className="text-sm text-muted-foreground">Loading market health…</p>;
  }

  if (!health) {
    return (
      <section aria-label="Market health" className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">Market health</h2>
        <p className="mt-2 text-sm text-muted-foreground">Health unavailable. No liquidity estimate is shown.</p>
        <DataStateBanner error={error} onRetry={onRetry} className="mt-3" />
      </section>
    );
  }

  return (
    <section aria-label="Market health" className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Market health</h2>
          <p className="mt-1 text-xs text-muted-foreground">{health.algorithm}</p>
        </div>
        <FreshnessBadge freshness={health.freshness} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Best bid</dt><dd className="font-mono">{formatPrice(health.bestBid)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Best ask</dt><dd className="font-mono">{formatPrice(health.bestAsk)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Bid depth</dt><dd className="font-mono">{formatSize(health.bidDepth)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Ask depth</dt><dd className="font-mono">{formatSize(health.askDepth)}</dd></div>
      </dl>
      {health.crossed ? <p className="mt-3 text-sm text-amber-400">Crossed book reported; wait for a newer snapshot.</p> : null}
      <DataStateBanner error={error} onRetry={onRetry} className="mt-3" />
    </section>
  );
}

interface RelatedMarketsPanelProps {
  currentMarketId: string;
  markets?: Array<{ id: string; question: string }>;
  error?: unknown;
  onRetry?: () => void;
}

export function RelatedMarketsPanel({ currentMarketId, markets = [], error, onRetry }: RelatedMarketsPanelProps) {
  const related = markets.filter((market) => market.id !== currentMarketId).slice(0, 4);
  if (related.length === 0) {
    if (!error) return null;
    return (
      <section aria-label="Related markets" className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-bold text-foreground">Related markets</h2>
        <DataStateBanner error={error} onRetry={onRetry} title="Related markets unavailable" className="mt-3" />
      </section>
    );
  }

  return (
    <section aria-label="Related markets" className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-bold text-foreground">Related markets</h2>
      <ul className="mt-3 space-y-2" role="list">
        {related.map((market) => (
          <li key={market.id}>
            <Link className="block text-sm text-primary hover:underline" to={marketPath(market.id)}>
              {market.question}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
