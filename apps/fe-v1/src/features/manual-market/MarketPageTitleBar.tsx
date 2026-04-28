import { useEffect, useState } from "react";

import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import { marketTitleBarStickyTopClassName } from "./useSiteHeaderOffset";

export interface MarketPageTitleBarProps {
  title: string;
  image?: string;
  icon?: string;
  iconColor?: string;
  category: string;
  onBack: () => void;
  backLabel: string;
  description?: string | null;
  showLivePill: boolean;
}

const COMPACT_AT_PX = 48;

export function MarketPageTitleBar({
  title,
  image,
  icon,
  iconColor,
  category,
  onBack,
  backLabel,
  description,
  showLivePill,
}: MarketPageTitleBarProps) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let rafId = 0;

    const flush = () => {
      rafId = 0;
      const next = window.scrollY > COMPACT_AT_PX;
      setCompact((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(flush);
    };

    flush();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className={cn(
        "sticky z-40 border-b border-border/60 bg-background transition-[padding] duration-200 dark:border-white/[0.07]",
        marketTitleBarStickyTopClassName(),
        compact ? "py-2.5" : "py-4",
      )}
    >
      <div className="flex w-full min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:mt-0"
          aria-label={backLabel}
        >
          <Icon name="arrow_back" className="text-lg" />
        </button>

        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card transition-[width,height] duration-200 ease-out dark:border-white/[0.08]",
            compact ? "size-9 sm:size-10" : "size-12 sm:size-14",
          )}
        >
          {image ? (
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <Icon
              name={icon ?? "explore"}
              className={cn(
                "text-muted-foreground transition-[font-size] duration-200 ease-out",
                compact ? "text-2xl" : "text-3xl",
                iconColor,
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "mb-1.5 flex flex-wrap items-center gap-2 transition-[margin] duration-200",
              compact && "mb-0.5",
            )}
          >
            <span
              className={cn(
                "rounded border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-[padding] duration-200 dark:border-white/[0.07]",
                compact && "py-0",
              )}
            >
              {category}
            </span>
            {showLivePill ? (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground",
                  compact && "hidden sm:inline-flex",
                )}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
                Live
              </span>
            ) : null}
          </div>
          <h1
            className={cn(
              "max-w-5xl font-bold leading-tight tracking-tight text-foreground transition-[font-size,line-height] duration-200 ease-out",
              compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl lg:text-[2rem] lg:leading-tight",
            )}
          >
            {title}
          </h1>
          {description && !compact ? (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
