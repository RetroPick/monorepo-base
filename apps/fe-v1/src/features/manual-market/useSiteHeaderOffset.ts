import { useLayoutEffect, useRef } from "react";

const VAR_NAME = "--market-page-sticky-top";
/**
 * When the variable is not set, stickies should still clear the desktop header.
 * The measured value replaces this immediately after mount.
 */
const CSS_FALLBACK = "5rem";
/** Only used when header height reads implausibly small (layout not ready yet). */
const MIN_STICKY_TOP_PX_FALLBACK = 124;
/** Subpixel/header-border alignment; nonzero values create a visible band under `#app-site-header` where scrolled content showed through above the sticky market title row. */
const STICKY_TOP_BUFFER_PX = 0;

const SITE_HEADER_ID = "app-site-header";

function resolveSiteHeaderEl(): HTMLElement | null {
  return document.getElementById(SITE_HEADER_ID) ?? document.querySelector("header");
}

/** Measures the site `Header` (nav + sub-strip) and sets `--market-page-sticky-top` for sticky sub-nav + trade aside. */
export function useSiteHeaderOffset(): void {
  const lastApplied = useRef<string | null>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const setVar = (px: number) => {
      if (px < 0.5) {
        if (lastApplied.current === CSS_FALLBACK) return;
        lastApplied.current = CSS_FALLBACK;
        root.style.setProperty(VAR_NAME, CSS_FALLBACK);
        return;
      }
      let hPx = Math.ceil(px) + STICKY_TOP_BUFFER_PX;
      if (px < 40 || hPx < 80) hPx = MIN_STICKY_TOP_PX_FALLBACK;
      const value = `${hPx}px`;
      if (lastApplied.current === value) return;
      lastApplied.current = value;
      root.style.setProperty(VAR_NAME, value);
    };

    const header = resolveSiteHeaderEl();
    if (!header) {
      lastApplied.current = null;
      root.style.setProperty(VAR_NAME, CSS_FALLBACK);
      return;
    }

    const measure = () => {
      setVar(header.getBoundingClientRect().height);
    };
    lastApplied.current = null;
    measure();
    const t0 = window.setTimeout(measure, 0);
    const t1 = window.setTimeout(measure, 200);

    const ro = new ResizeObserver(measure);
    ro.observe(header);
    window.addEventListener("resize", measure);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty(VAR_NAME);
    };
  }, []);
}

/** Desktop trade column: see `.market-manual-trade-aside` in `index.css` (sticky + viewport max-height; avoids parent overflow clip breaking sticky). */
export function marketStickyClassName(): string {
  return "market-manual-trade-aside";
}

/** Sticky `top` offset class; see `.market-page-sticky-below-chrome` in `index.css`. */
export function marketTitleBarStickyTopClassName(): string {
  return "market-page-sticky-below-chrome";
}
