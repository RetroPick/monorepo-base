import { useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { EventSummary } from "@retropick/polymarket";
import { derivedVolumeUsd, calcProbabilityFromId } from "../../lib/cardStats";
import { eventPath } from "../../routes/paths";

interface MarketsTableListProps {
  events: EventSummary[];
  onViewAllClick?: () => void;
}

import { resolveMarketImage } from "../../lib/retropickData";

// Accurate Image Avatar component for table rows
function TableMarketAvatar({ event, categoryTag }: { event: any; categoryTag: string }) {
  const [imgError, setImgError] = useState(false);

  const resolved = resolveMarketImage({
    id: event.id,
    question: event.title,
    category: event.category || categoryTag,
    image: event.image || event.imageUrl,
    icon: event.icon || event.iconUrl,
    slug: event.slug,
    title: event.title,
  });

  if (resolved.url && !imgError) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800 shadow-sm flex items-center justify-center">
        <img
          src={resolved.url}
          alt={event.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white">
      ⚡
    </div>
  );
}

// Generates smooth SVG sparkline path matching green (upward) or red (downward) trend
function MiniSparkline({ prob }: { prob: number }) {
  const isGreen = prob >= 40;
  const strokeColor = isGreen ? "#34D399" : "#F87171"; // emerald or rose

  const points = isGreen
    ? [
        [0, 18], [10, 14], [20, 16], [30, 9], [40, 11], [50, 6], [60, 8], [70, 4], [80, 7], [90, 3]
      ]
    : [
        [0, 4], [10, 8], [20, 5], [30, 11], [40, 9], [50, 15], [60, 12], [70, 17], [80, 14], [90, 19]
      ];

  const pathData = points.reduce(
    (acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`),
    ""
  );

  return (
    <svg className="h-7 w-24 overflow-visible" viewBox="0 0 90 22">
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MarketsTableList({ events, onViewAllClick }: MarketsTableListProps) {
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0B0F19] shadow-2xl">
      {/* Table Header */}
      <div className="hidden grid-cols-[1.6fr_1fr_1.1fr_0.9fr_48px] items-center gap-4 border-b border-slate-800/80 px-6 py-3.5 text-xs font-medium text-slate-400 sm:grid">
        <div>Market</div>
        <div className="text-center">Yes %</div>
        <div className="text-center">Trend</div>
        <div className="text-right">Volume</div>
        <div className="text-center">Activity</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-800/60">
        {events.map((event) => {
          const yesProb = calcProbabilityFromId(event.id);
          const noProb = 100 - yesProb;
          const volume = derivedVolumeUsd(event.id);
          const isStarred = starredIds.has(event.id);
          const slugLower = (event.slug ?? "").toLowerCase();
          const categoryTag = slugLower.includes("btc") || slugLower.includes("eth")
            ? "Crypto"
            : slugLower.includes("ai") || slugLower.includes("gpt")
            ? "AI"
            : slugLower.includes("fed") || slugLower.includes("cpi")
            ? "Economy"
            : slugLower.includes("fifa") || slugLower.includes("world")
            ? "Sports"
            : "Markets";

          return (
            <Link
              key={event.id}
              to={eventPath(event.id)}
              className="group grid grid-cols-1 items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-900/60 sm:grid-cols-[1.6fr_1fr_1.1fr_0.9fr_48px] sm:gap-4 sm:px-6 sm:py-4.5"
            >
              {/* Column 1: Market Logo + Title + Tag */}
              <div className="flex items-center gap-3 min-w-0">
                <TableMarketAvatar event={event} categoryTag={categoryTag} />
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-blue-400 sm:text-[15px]">
                    {event.title}
                  </h3>
                  <span className="mt-1 inline-block rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    {categoryTag}
                  </span>
                </div>
              </div>

              {/* Column 2: Yes % / No % */}
              <div className="flex items-center justify-between sm:justify-center gap-4 font-mono text-sm sm:text-base font-bold tabular-nums">
                <div className="flex flex-col items-center">
                  <span className="text-emerald-400">{yesProb}%</span>
                  <span className="text-[10px] font-semibold text-emerald-400/80">Yes</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-rose-400">{noProb}%</span>
                  <span className="text-[10px] font-semibold text-rose-400/80">No</span>
                </div>
              </div>

              {/* Column 3: Sparkline Trend */}
              <div className="hidden items-center justify-center sm:flex">
                <MiniSparkline prob={yesProb} />
              </div>

              {/* Column 4: Volume */}
              <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center font-mono">
                <span className="text-sm sm:text-base font-bold text-white tabular-nums">{volume}</span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Volume</span>
              </div>

              {/* Column 5: Activity / Favorite Star */}
              <div className="flex items-center justify-end sm:justify-center">
                <button
                  type="button"
                  onClick={(e) => toggleStar(event.id, e)}
                  aria-label={isStarred ? "Remove favorite" : "Add favorite"}
                  className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-amber-400"
                >
                  <Star
                    className={`h-4 w-4 ${
                      isStarred ? "fill-amber-400 text-amber-400" : "text-slate-500"
                    }`}
                  />
                </button>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Action Button */}
      {onViewAllClick ? (
        <button
          type="button"
          onClick={onViewAllClick}
          className="w-full border-t border-slate-800/80 bg-slate-900/30 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:bg-slate-800/50 hover:text-white"
        >
          View all markets
        </button>
      ) : null}
    </div>
  );
}
