import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import type { Market } from "@/types/market";
import { pickBinaryOutcomes } from "@/lib/market-card-layout";

type DiscoverFeaturedHeroProps = {
  market: Market;
  /** Top-line context, e.g. schedule tag */
  eyebrow?: string;
  countdownLabel?: string;
  onOpen: () => void;
};

export default function DiscoverFeaturedHero({ market, eyebrow, countdownLabel, onOpen }: DiscoverFeaturedHeroProps) {
  const { yes, no } = pickBinaryOutcomes(market);
  const yesPct = yes ? Math.round(yes.probability) : 50;
  const vol = market.totalPool || market.volume || "—";

  return (
    <section
      data-testid="discover-featured-hero"
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/[0.08] sm:p-6 lg:p-8"
      aria-labelledby="discover-featured-heading"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-border/50 sm:size-14",
                market.iconBg || "bg-muted",
              )}
            >
              {market.image ? (
                <img src={market.image} alt="" className="size-full object-cover" />
              ) : (
                <Icon name={market.icon} className={cn("text-2xl", market.iconColor || "text-foreground")} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow ?? market.category}
              </p>
              <h2 id="discover-featured-heading" className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {market.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Vol {vol}</span>
                {countdownLabel ? (
                  <span className="tabular-nums">
                    Ends <span className="text-foreground">{countdownLabel}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {yes && no ? (
            <div className="mt-6 grid max-w-md grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-center dark:bg-muted/20">
                <div className="text-2xl font-semibold tabular-nums text-foreground">{yesPct}%</div>
                <div className="mt-0.5 text-xs font-medium text-muted-foreground">{yes.label}</div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-center dark:bg-muted/20">
                <div className="text-2xl font-semibold tabular-nums text-foreground">{100 - yesPct}%</div>
                <div className="mt-0.5 text-xs font-medium text-muted-foreground">{no.label}</div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:brightness-110"
            >
              View market
              <ChevronRight className="size-4 opacity-90" aria-hidden />
            </button>
            <Link
              to={`/app/market/${market.id}`}
              state={{ market }}
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Open full page
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
