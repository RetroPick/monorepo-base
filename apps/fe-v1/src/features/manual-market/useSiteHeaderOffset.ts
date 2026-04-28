import { useLayoutEffect, useRef } from "react";

const VAR_NAME = "--market-page-sticky-top";
/**
 * When the variable is not set, stickies must still clear the full two-row header (nav + ticker).
 * 9.5rem ≈ 152px is a safe floor before/without measurement.
 */
const CSS_FALLBACK = "9.5rem";
/** Do not go below this after measuring; protects against an early/wrong getBoundingClientRect. */
const MIN_STICKY_TOP_PX = 150;
/** Extra pixels below the measured header (border, subpixel, toolbar rounding). */
const STICKY_TOP_BUFFER_PX = 10;

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
      const withBuffer = Math.max(MIN_STICKY_TOP_PX, Math.ceil(px) + STICKY_TOP_BUFFER_PX);
      const value = `${withBuffer}px`;
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

/** Sticky `top` offset class — see `.market-page-sticky-below-chrome` in `index.css`. */
export function marketTitleBarStickyTopClassName(): string {
  return "market-page-sticky-below-chrome";
}
