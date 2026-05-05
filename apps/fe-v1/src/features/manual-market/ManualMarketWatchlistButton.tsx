import { Bookmark, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMarketBookmark } from "@/features/portfolio/useMarketBookmark";
import { cn } from "@/lib/utils";

type Props = {
  templateId: `0x${string}`;
  className?: string;
};

export function ManualMarketWatchlistButton({ templateId, className }: Props) {
  const { isBookmarked, toggle, busy, watchlistLoading, templateId: norm } = useMarketBookmark(templateId);

  if (!norm) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy || watchlistLoading}
      onClick={() => void toggle()}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border-border/60 px-2.5 py-1.5 text-xs font-semibold dark:border-white/[0.12]",
        isBookmarked ? "text-muted-foreground" : "text-foreground",
        className,
      )}
      aria-label={isBookmarked ? "Remove from watchlist" : "Add to watchlist"}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Bookmark className="size-3.5" aria-hidden />}
      {isBookmarked ? "Saved" : "Watchlist"}
    </Button>
  );
}
