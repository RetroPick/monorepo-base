import { cn } from "@/lib/utils";

/** Matches Discover Crypto chips ([`DiscoverLeftNav`](@/components/discover/DiscoverLeftNav.tsx) mobile row). */
export const discoverChipActive =
  "border border-primary/30 bg-primary/15 text-primary";

export const discoverChipIdle =
  "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted dark:border-white/[0.12]";

/** Rounded pill chrome shared by Discover-style filter chips (`text-xs font-medium`). */
export function discoverChipPill(base?: string) {
  return cn(base ?? "rounded-full px-3 py-1.5 text-xs font-medium", "transition-colors duration-150");
}
