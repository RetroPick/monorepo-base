import { cn } from "@/shared/lib/utils";

export const discoverChipActive = "border border-primary/30 bg-primary/15 text-primary";

export const discoverChipIdle =
  "border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted dark:border-white/[0.12]";

export function discoverChipPill(base?: string) {
  return cn(base ?? "rounded-full px-3 py-1.5 text-xs font-medium", "transition-colors duration-150");
}
