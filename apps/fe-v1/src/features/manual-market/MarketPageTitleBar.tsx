import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bookmark, Code2, Share2 } from "lucide-react";

import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import { marketTitleBarStickyTopClassName } from "./useSiteHeaderOffset";

function HeadlineGhostIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="rounded-lg p-2 text-muted-foreground/65 transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      {children}
    </button>
  );
}

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
  className?: string;
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
  className,
}: MarketPageTitleBarProps) {
  const [compact, setCompact] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const root = document.documentElement;
    const setHeightVar = () => {
      root.style.setProperty(
        "--market-page-titlebar-height",
        `${Math.ceil(bar.getBoundingClientRect().height)}px`,
      );
    };

    setHeightVar();

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(setHeightVar);
    resizeObserver?.observe(bar);
    window.addEventListener("resize", setHeightVar);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", setHeightVar);
      root.style.removeProperty("--market-page-titlebar-height");
    };
  }, []);

  useEffect(() => {
    let rafId = 0;

    const updateCompactState = () => {
      rafId = 0;

      const nextCompact = window.scrollY > COMPACT_AT_PX;

      setCompact((current) => {
        return current === nextCompact ? current : nextCompact;
      });
    };

    const handleScroll = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(updateCompactState);
    };

    updateCompactState();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div
      ref={barRef}
      className={cn(
        // Flat on canvas: solid page bg — no stripes (no borders / shadows vs page or header seam).
        "sticky z-40 isolate border-0 border-none bg-background shadow-none outline-none ring-0 ring-offset-0 [box-shadow:none]",
        marketTitleBarStickyTopClassName(),
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 items-start gap-3 transition-[padding] duration-200 sm:gap-4",
          compact ? "py-2" : "py-3",
        )}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="mt-1 flex shrink-0 items-center justify-center rounded-lg p-2 text-muted-foreground/75 transition-colors hover:bg-muted/50 hover:text-foreground sm:mt-0.5"
        >
          <Icon name="arrow_back" className="text-lg" />
        </button>

        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <div
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/25 ring-1 ring-border/35 transition-[width,height] duration-200 ease-out dark:bg-muted/20 dark:ring-white/[0.08]",
              compact ? "size-9 sm:size-10" : "size-11 sm:size-[3rem]",
            )}
          >
            {image ? (
              <img src={image} alt="" className="size-full object-cover" />
            ) : (
              <Icon
                name={icon ?? "explore"}
                className={cn(
                  "text-muted-foreground transition-[font-size] duration-200 ease-out",
                  compact ? "text-xl sm:text-[1.35rem]" : "text-2xl sm:text-[1.85rem]",
                  iconColor,
                )}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 pr-2">
            <p
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium text-muted-foreground",
                compact ? "mb-0 text-[11px]" : "mb-1 text-xs",
              )}
            >
              <span className="uppercase tracking-[0.14em]">{category}</span>
              {showLivePill ? (
                <>
                  <span aria-hidden className="text-muted-foreground/35">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                    <span className={compact ? "hidden sm:inline" : undefined}>Live</span>
                  </span>
                </>
              ) : null}
            </p>

            <h1
              className={cn(
                "max-w-[min(100%,42rem)] font-semibold leading-[1.2] tracking-tight text-foreground transition-[font-size,line-height] duration-200 ease-out",
                compact ? "text-lg sm:text-xl" : "text-2xl sm:text-[1.625rem]",
              )}
            >
              {title}
            </h1>

            {description && !compact ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div
            className={cn(
              "hidden shrink-0 pt-1 sm:flex sm:items-center sm:gap-0.5",
              compact ? "opacity-70" : undefined,
            )}
          >
            <HeadlineGhostIcon label="Embed market">
              <Code2 className="size-[18px]" strokeWidth={2} aria-hidden />
            </HeadlineGhostIcon>
            <HeadlineGhostIcon label="Share">
              <Share2 className="size-[18px]" strokeWidth={2} aria-hidden />
            </HeadlineGhostIcon>
            <HeadlineGhostIcon label="Bookmark">
              <Bookmark className="size-[18px]" strokeWidth={2} aria-hidden />
            </HeadlineGhostIcon>
          </div>
        </div>
      </div>
    </div>
  );
}
