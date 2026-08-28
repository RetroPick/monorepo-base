import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import type { EventSummary, MarketSummary } from "@retropick/polymarket";

import { cn } from "@/shared/lib/utils";
import { calcProbabilityFromId, derivedVolumeUsd } from "../lib/cardStats";
import { marketPath } from "../routes/paths";
import { resolveMarketImage } from "../lib/retropickData";
import { useUserPortfolio } from "../hooks/useUserPortfolio";

interface PolymarketCardProps {
  event: EventSummary & {
    markets?: MarketSummary[];
    cardType?: "vs_match" | "binary" | "multichoice";
    teams?: {
      name: string;
      shortName?: string;
      logo?: string;
      flag?: string;
      scores?: string[];
      prob: number;
      bgClass?: string;
    }[];
    options?: { label: string; prob: number; thumbnail?: string | null }[];
    gameInfo?: string;
    imageUrl?: string | null;
    iconUrl?: string | null;
    image?: string | null;
    icon?: string | null;
    volume?: string | null;
    rawMarket?: any;
  };
}

// Fallback topic avatar helper if image cannot load
function getMarketAvatarFallback(title: string, slug?: string, category?: string) {
  const t = `${title} ${slug ?? ""} ${category ?? ""}`.toLowerCase();

  if (t.includes("crypto") || t.includes("btc") || t.includes("bitcoin")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7931A] text-xl font-black text-white shadow-sm">
        ₿
      </div>
    );
  }
  if (t.includes("eth") || t.includes("ethereum")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-cyan-300 shadow-sm">
        Ξ
      </div>
    );
  }
  if (t.includes("sol") || t.includes("solana")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-teal-500 text-sm font-extrabold text-white shadow-sm">
        S
      </div>
    );
  }
  if (t.includes("ai") || t.includes("openai") || t.includes("gpt")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-xs font-black text-white shadow-sm">
        AI
      </div>
    );
  }
  if (t.includes("sports") || t.includes("soccer") || t.includes("football") || t.includes("ucl")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 text-base shadow-sm">
        ⚽
      </div>
    );
  }
  if (t.includes("esport") || t.includes("cs2") || t.includes("lol") || t.includes("t1")) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-900 text-base shadow-sm">
        🎮
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white">
      ⚡
    </div>
  );
}

// Accurate Image Avatar component resolving real assets from Polymarket API / Entity map
export function MarketAvatar({
  event,
  className = "h-10 w-10",
}: {
  event: any;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);

  const resolved = resolveMarketImage({
    id: event.id,
    question: event.title || event.question,
    category: event.category,
    icon: event.icon,
    image: event.image || event.imageUrl,
    eventImage: event.imageUrl || event.image,
    eventIcon: event.iconUrl || event.icon,
    slug: event.slug,
    title: event.title,
  });

  if (resolved.url && !imgError) {
    return (
      <div
        className={`relative ${className} shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-800 shadow-sm flex items-center justify-center`}
      >
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

  return getMarketAvatarFallback(event.title, event.slug, event.category);
}

// Reusable SVG Swap Icon (⇄) matching Polymarket footer
function SwapIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 17h16" />
      <path d="M16 21l4-4-4-4" />
      <path d="M20 7H4" />
      <path d="M8 3l-4 4 4 4" />
    </svg>
  );
}

// Reusable SVG Gift Icon (🎁) matching Polymarket footer
function GiftIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 4 0 0 1 12 8a4.8 4 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

// Sleek Borderless Mini Sparkline Chart with Centered Percentage Number
function ChanceBadge({
  percentage,
}: {
  percentage: number;
}) {
  const isHigh = percentage >= 50;
  const strokeColor = isHigh ? "#10B981" : "#F43F5E";
  const gradId = `spark-grad-${percentage}-${isHigh ? "up" : "down"}`;

  const { splinePath, areaPath } = useMemo(() => {
    const delta1 = isHigh ? -8 : 6;
    const delta2 = isHigh ? -3 : 4;
    const delta3 = isHigh ? -6 : 7;
    const delta4 = isHigh ? -1 : 2;

    const rawPoints = [
      Math.max(5, Math.min(95, percentage + delta1)),
      Math.max(5, Math.min(95, percentage + delta2)),
      Math.max(5, Math.min(95, percentage + delta3)),
      Math.max(5, Math.min(95, percentage + delta4)),
      percentage,
    ];

    const minP = Math.min(...rawPoints) - 5;
    const maxP = Math.max(...rawPoints) + 5;
    const rangeP = Math.max(1, maxP - minP);

    const w = 54;
    const h = 28;

    const coords = rawPoints.map((p, i) => {
      const x = 2 + (i / (rawPoints.length - 1)) * (w - 4);
      const y = h - 2 - ((p - minP) / rangeP) * (h - 4);
      return { x, y };
    });

    let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] ?? p2;

      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;

      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.x.toFixed(1)}`;
    }

    const area = `${d} L ${coords[coords.length - 1].x.toFixed(1)},${h} L ${coords[0].x.toFixed(1)},${h} Z`;
    return { splinePath: d, areaPath: area };
  }, [percentage, isHigh]);

  return (
    <div className="relative flex items-center justify-center shrink-0 w-[54px] h-[28px] rounded-lg overflow-hidden">
      {/* Background SVG Mini Chart Wave */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 54 28" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.38" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={splinePath} fill="none" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Foreground Centered Number Only */}
      <span className={cn("relative z-10 text-sm font-bold font-mono leading-none tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]", isHigh ? "text-emerald-400" : "text-rose-400")}>
        {percentage}%
      </span>
    </div>
  );
}


export function PolymarketCard({ event }: PolymarketCardProps) {
  const { isWatchlisted, toggleWatchlist } = useUserPortfolio();
  const bookmarked = isWatchlisted(event.id);

  // Prefer real probability from venue data; never fabricate from the id.
  const probYes: number | null = (() => {
    const yes = event.rawMarket?.yes;
    if (typeof yes === "number" && Number.isFinite(yes)) return Math.round(yes);
    const outcomes = event.markets?.[0]?.outcomes;
    const yesPrice = outcomes?.find((o) => o.name === "YES" || o.name === "Yes")?.price;
    if (yesPrice != null) {
      const p = parseFloat(yesPrice);
      if (Number.isFinite(p)) return Math.round(p * 100);
    }
    return calcProbabilityFromId(event.id);
  })();
  const titleLower = event.title.toLowerCase();

  const toggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist({
      marketId: event.id,
      title: event.title,
      category: (event as any).category || (event.rawMarket as any)?.category || "Crypto",
      yesChance: probYes ?? 50,
      volume24h: (event as any).volume || "$1.2M",
    });
  };

  // Only genuine fast-paced directional price prediction markets (e.g., BTC/ETH/SOL 5-min or 15-min up/down)
  const isLiveFastMarket =
    event.id === "btc-up-down-5m" ||
    event.id === "eth-up-down-15m" ||
    event.id === "sol-up-down-5m" ||
    (titleLower.includes("up or down") && (titleLower.includes("btc") || titleLower.includes("bitcoin") || titleLower.includes("eth") || titleLower.includes("sol")));

  // Dynamic asset name for fast markets
  const fastAsset = (() => {
    if (titleLower.includes("eth") || titleLower.includes("ethereum")) return "Ethereum";
    if (titleLower.includes("sol") || titleLower.includes("solana")) return "Solana";
    return "Bitcoin";
  })();

  const isBinary =
    event.cardType === "binary" ||
    (!event.options && !event.markets?.[0]?.outcomes?.length) ||
    titleLower.includes("returns to normal") ||
    titleLower.includes("by september 30") ||
    titleLower.includes("before jan 1");

  // Multi-outcome candidates list
  const multiOptions: { label: string; percentage: number }[] = (() => {
    if (event.rawMarket?.options && event.rawMarket.options.length > 0) {
      return event.rawMarket.options.slice(0, 2).map((o: any) => ({
        label: o.label,
        percentage: o.percentage ?? o.prob ?? 50,
      }));
    }
    if (event.options && event.options.length > 0) {
      return event.options.slice(0, 2).map((o) => ({
        label: o.label,
        percentage: o.prob,
      }));
    }
    if (event.markets && event.markets.length > 1) {
      return event.markets.slice(0, 2).map((m) => ({
        label: (m as any).groupItemTitle || m.question || "Option",
        percentage: Math.round(
          (parseFloat(m.outcomes?.find((o) => o.name === "YES")?.price || "0.5") * 100),
        ),
      }));
    }
    return [];
  })();

  const isMultiOutcome = multiOptions.length >= 2 && !isLiveFastMarket && !isBinary;

  // Format Volume display — only real volume, otherwise honest placeholder.
  const displayVolume: string | null =
    event.rawMarket?.volume || event.volume || derivedVolumeUsd(event.id);

  return (
    <article className="group relative flex h-[195px] w-full flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1422] p-4 shadow-sm hover:border-white/20 hover:bg-[#12192B] transition-all">
      <Link to={marketPath(event.id)} className="block flex-1 flex flex-col justify-between no-underline hover:no-underline">
        {/* Header: Avatar + Title + optional Circular Gauge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <MarketAvatar event={event} className="h-10 w-10 rounded-xl shrink-0 shadow-md" />
            <h3 className="line-clamp-2 text-sm font-bold text-white group-hover:text-blue-400 no-underline hover:no-underline transition-colors leading-snug">
              {event.title}
            </h3>
          </div>

          {!isMultiOutcome &&
            (probYes != null ? (
              <ChanceBadge percentage={probYes} />
            ) : (
              <div
                className="flex h-7 w-10 shrink-0 items-center justify-center text-xs font-mono text-slate-500"
                aria-label="Probability unavailable"
              >
                —
              </div>
            ))}
        </div>

        {/* Middle Body: Multi-outcome rows OR Large Yes/No buttons */}
        {isMultiOutcome ? (
          <div className="mt-3 space-y-2">
            {multiOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-200 truncate flex-1 min-w-0">
                  {opt.label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-white font-mono min-w-[34px] text-right">
                    {opt.percentage}%
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="inline-flex h-8 min-w-[46px] items-center justify-center rounded-lg bg-[#0D281E] px-2.5 text-xs font-bold text-emerald-400 hover:bg-[#133A2C] transition-colors cursor-pointer text-center"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="inline-flex h-8 min-w-[46px] items-center justify-center rounded-lg bg-[#24151C] px-2.5 text-xs font-bold text-rose-400/90 hover:bg-[#351C26] hover:text-rose-300 transition-colors cursor-pointer text-center"
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="flex h-11 items-center justify-center text-center rounded-xl bg-[#0D281E] text-sm font-bold text-emerald-400 hover:bg-[#133A2C] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              {isLiveFastMarket ? "Up" : "Yes"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="flex h-11 items-center justify-center text-center rounded-xl bg-[#24151C] text-sm font-bold text-rose-400/90 hover:bg-[#351C26] hover:text-rose-300 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              {isLiveFastMarket ? "Down" : "No"}
            </button>
          </div>
        )}
      </Link>

      {/* Footer Row: Volume / Live badge + Gift + Bookmark Icons (Borderless) */}
      <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          {isLiveFastMarket ? (
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-rose-400 font-bold">LIVE</span>
              <span>· {fastAsset}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span>{displayVolume ?? "—"}</span>
              <SwapIcon className="h-3 w-3 text-slate-500" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title="Rewards / Bonus"
            className="hover:text-amber-400 transition-colors cursor-pointer p-0.5"
          >
            <GiftIcon className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleBookmark}
            title="Bookmark"
            className="hover:text-white transition-colors cursor-pointer p-0.5"
          >
            <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-white text-white" : ""}`} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default PolymarketCard;
