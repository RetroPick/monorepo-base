import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MarketTypeExplainDialog from "@/components/discover/MarketTypeExplainDialog";
import { discoverMarketTypeEntries } from "@/lib/market-data/marketTypeDiscoverContent";
import type { DiscoverMarketTypeEntry } from "@/lib/market-data/marketTypeDiscoverContent";
import { cn } from "@/lib/utils";

/** Horizontal gap between cards (`gap-3`). */
const CARD_GAP_PX = 12;

export default function DiscoverMarketTypesStrip() {
  const entries = useMemo(() => [...discoverMarketTypeEntries()], []);
  const [dialogEntry, setDialogEntry] = useState<DiscoverMarketTypeEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ canLeft: false, canRight: false });

  const openExplain = (entry: DiscoverMarketTypeEntry) => {
    setDialogEntry(entry);
    setDialogOpen(true);
  };

  const onDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setDialogEntry(null);
    }
  };

  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setEdge({
      canLeft: scrollLeft > 2,
      canRight: scrollLeft + clientWidth < scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const RO = typeof ResizeObserver === "undefined" ? null : ResizeObserver;
    const ro = RO ? new RO(updateEdges) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro?.disconnect();
    };
  }, [updateEdges, entries.length]);

  const scrollStep = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector("article");
    const cardW = firstCard ? firstCard.getBoundingClientRect().width : 160;
    const delta = cardW + CARD_GAP_PX;
    const distance = Math.max(delta, el.clientWidth * 0.72) * dir;
    el.scrollBy({ left: distance, behavior: "smooth" });
  }, []);

  return (
    <section
      className="min-w-0"
      data-testid="discover-market-types-strip"
      aria-labelledby="discover-market-types-heading"
    >
      <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="discover-market-types-heading" className="text-lg font-semibold tracking-tight text-foreground">
            Market types
          </h2>
          <p className="text-sm text-muted-foreground">How RetroPick settles each engine template.</p>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          data-testid="discover-market-types-scroll-prev"
          className={cn(
            "absolute left-0 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full",
            "border border-border/35 bg-background/15 text-foreground/90 shadow-none backdrop-blur-md",
            "transition-[opacity,transform,background-color] hover:bg-background/30 disabled:pointer-events-none disabled:opacity-25",
            "max-sm:-translate-x-1",
          )}
          aria-label="Scroll market types left"
          disabled={!edge.canLeft}
          onClick={() => scrollStep(-1)}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          data-testid="discover-market-types-scroll-next"
          className={cn(
            "absolute right-0 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full",
            "border border-border/35 bg-background/15 text-foreground/90 shadow-none backdrop-blur-md",
            "transition-[opacity,transform,background-color] hover:bg-background/30 disabled:pointer-events-none disabled:opacity-25",
            "max-sm:translate-x-1",
          )}
          aria-label="Scroll market types right"
          disabled={!edge.canRight}
          onClick={() => scrollStep(1)}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>

        <div
          ref={scrollRef}
          className={cn(
            "flex snap-x snap-mandatory gap-3 overflow-x-auto px-11 pb-2 no-scrollbar sm:px-12",
            "scroll-smooth",
          )}
        >
          {entries.map((entry) => (
            <article
              key={entry.marketType}
              className={cn(
                "relative isolate min-h-[200px] w-[min(42vw,160px)] shrink-0 snap-start overflow-hidden rounded-xl border border-border/60",
                "aspect-[3/4] shadow-sm dark:border-white/[0.08] sm:min-w-[150px]",
              )}
            >
              <div
                className={cn("absolute inset-0 bg-gradient-to-br opacity-95", entry.cardGradientClass)}
                aria-hidden
              />
              <img
                src={entry.imageSrc}
                alt=""
                className="absolute inset-0 size-full object-cover mix-blend-overlay"
                loading="lazy"
                decoding="async"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent"
                aria-hidden
              />

              <button
                type="button"
                className={cn(
                  "absolute right-2 top-2 z-10 flex size-8 items-center justify-center rounded-full",
                  "border border-white/30 bg-background/15 text-sm font-bold text-foreground/95 shadow-none backdrop-blur-md",
                  "transition-[background-color,color] hover:bg-background/35",
                )}
                aria-label={`Learn how ${entry.title} markets work`}
                onClick={(e) => {
                  e.stopPropagation();
                  openExplain(entry);
                }}
              >
                ?
              </button>

              <div className="absolute inset-x-0 bottom-0 z-[1] p-3 pt-8">
                <h3 className="text-sm font-bold uppercase leading-tight tracking-wide text-foreground">
                  {entry.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[10px] font-medium uppercase leading-snug tracking-wide text-muted-foreground">
                  {entry.tag}
                </p>
              </div>
            </article>
          ))}
          {/* Spacer so the last card can scroll fully into view beside the right control */}
          <div className="w-1 shrink-0 snap-none sm:w-2" aria-hidden />
        </div>
      </div>

      <MarketTypeExplainDialog open={dialogOpen} onOpenChange={onDialogOpenChange} entry={dialogEntry} />
    </section>
  );
}
