import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useSignMessage } from "wagmi";
import { Bookmark, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  fetchUserWatchlist,
  fetchWatchlistNonce,
  postWatchlistMutate,
} from "@/lib/api/retropickApi";
import { openAppKitModal } from "@/lib/openAppKitModal";
import { buildWatchlistAddSignMessage, defaultWatchlistChainId } from "@/lib/watchlistSign";
import { cn } from "@/lib/utils";

type Props = {
  templateId: `0x${string}`;
  className?: string;
};

function normId(id: string): string {
  const t = id.trim().toLowerCase();
  return t.startsWith("0x") ? t : `0x${t}`;
}

export function ManualMarketWatchlistButton({ templateId, className }: Props) {
  const tid = useMemo(() => normId(templateId) as `0x${string}`, [templateId]);
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();
  const [busy, setBusy] = useState(false);

  const watchlistQ = useQuery({
    queryKey: ["retropick-api", "user-watchlist", address],
    queryFn: () => fetchUserWatchlist(address!),
    enabled: Boolean(address),
    staleTime: 15_000,
  });

  const onList = watchlistQ.data?.templateIds.map(normId) ?? [];
  const already = onList.includes(tid);

  const onAdd = useCallback(async () => {
    if (!isConnected || !address) {
      void openAppKitModal();
      return;
    }
    if (already) {
      toast({
        title: "Already on watchlist",
        description: "Open your portfolio to manage saved markets.",
      });
      return;
    }
    setBusy(true);
    try {
      const { nonce } = await fetchWatchlistNonce(address);
      const deadline = Math.floor(Date.now() / 1000) + 14 * 60;
      const message = buildWatchlistAddSignMessage(defaultWatchlistChainId(), address, tid, deadline, nonce);
      const signature = await signMessageAsync({ message, account: address });
      await postWatchlistMutate({
        wallet: address,
        action: "add",
        templateId: tid,
        deadline,
        nonce,
        signature,
      });
      void qc.invalidateQueries({ queryKey: ["retropick-api", "user-watchlist"] });
      void qc.invalidateQueries({ queryKey: ["retropick-api", "portfolio-summary"] });
      toast({
        title: "Added to watchlist",
        description: (
          <span>
            See it in{" "}
            <Link to="/app/portfolio?section=watchlist" className="font-semibold text-primary underline underline-offset-2">
              Portfolio → Watchlist
            </Link>
            .
          </span>
        ),
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not save watchlist",
        description: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }, [address, already, isConnected, qc, signMessageAsync, tid, toast]);

  const pending = busy || isSigning;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending || watchlistQ.isLoading}
      onClick={() => void onAdd()}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border-border/60 px-2.5 py-1.5 text-xs font-semibold dark:border-white/[0.12]",
        already ? "text-muted-foreground" : "text-foreground",
        className,
      )}
      aria-label={already ? "Already on watchlist" : "Add to watchlist"}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Bookmark className="size-3.5" aria-hidden />}
      {already ? "Saved" : "Watchlist"}
    </Button>
  );
}
