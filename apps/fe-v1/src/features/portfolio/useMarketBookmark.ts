import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { useToast } from "@/components/ui/use-toast";
import { fetchUserWatchlist, postWatchlistMutate } from "@/lib/api/retropickApi";
import {
  normalizeTemplateId,
  readWatchlist,
  removeFromGuestAndLocalWatchlist,
  toggleGuestWatchlist,
} from "@/features/portfolio/watchlistStorage";

import { useGuestWatchlistSnapshot } from "@/features/portfolio/useGuestWatchlistSnapshot";
import { useBackendAuthSession } from "@/context/BackendAuthContext";

function mergeTemplateIds(...lists: (string[] | undefined)[]): string[] {
  const s = new Set<string>();
  for (const list of lists) {
    if (!list) continue;
    for (const id of list) {
      const n = normalizeTemplateId(id);
      if (n) s.add(n);
    }
  }
  return [...s].sort();
}

export function useMarketBookmark(templateIdRaw: string) {
  const tid = useMemo(() => normalizeTemplateId(templateIdRaw), [templateIdRaw]);
  const guestSnap = useGuestWatchlistSnapshot();
  const guestIds = useMemo(() => {
    try {
      const p = JSON.parse(guestSnap) as unknown;
      return Array.isArray(p) ? (p.filter((x): x is string => typeof x === "string") as string[]) : [];
    } catch {
      return [];
    }
  }, [guestSnap]);

  const { address } = useAccount();
  const qc = useQueryClient();
  const { toast } = useToast();
  const auth = useBackendAuthSession();
  const [busy, setBusy] = useState(false);

  const watchlistQ = useQuery({
    queryKey: ["retropick-api", "user-watchlist", address],
    queryFn: () => fetchUserWatchlist(address!),
    enabled: Boolean(address) && auth.isAuthenticated,
    staleTime: 15_000,
  });

  const serverIds = watchlistQ.data?.templateIds;
  const serverSet = useMemo(
    () => new Set(mergeTemplateIds(serverIds)),
    [serverIds],
  );

  const walletLocal = useMemo(() => (address ? readWatchlist(address) : []), [address]);

  const isBookmarked = useMemo(() => {
    if (!tid) return false;
    if (!address) return guestIds.includes(tid);
    return mergeTemplateIds(serverIds, guestIds, walletLocal).includes(tid);
  }, [tid, address, guestIds, serverIds, walletLocal]);

  const onServer = tid != null && serverSet.has(tid);

  const toggle = useCallback(async () => {
    if (!tid) return;
    if (!address || !auth.isAuthenticated) {
      toggleGuestWatchlist(tid, !isBookmarked);
      toast({
        title: !isBookmarked ? "Saved locally" : "Removed",
        description: !isBookmarked ? "Connect a wallet to sync to your portfolio." : undefined,
      });
      return;
    }

    const addr = address as `0x${string}`;
    const nextOn = !isBookmarked;
    setBusy(true);
    try {
      if (nextOn) {
        await postWatchlistMutate({
          wallet: addr,
          action: "add",
          templateId: tid,
        });
      } else if (onServer) {
        await postWatchlistMutate({
          wallet: addr,
          action: "remove",
          templateId: tid,
        });
      }
      removeFromGuestAndLocalWatchlist(address, tid);
      void qc.invalidateQueries({ queryKey: ["retropick-api", "user-watchlist", address] });
      void qc.invalidateQueries({ queryKey: ["retropick-api", "portfolio-summary", address] });
      toast({
        title: nextOn ? "Added to watchlist" : "Removed from watchlist",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not update watchlist",
        description: e instanceof Error ? e.message : "Try again.",
      });
    } finally {
      setBusy(false);
    }
  }, [address, auth.isAuthenticated, isBookmarked, onServer, qc, tid, toast]);

  return {
    templateId: tid,
    isBookmarked,
    toggle,
    busy,
    watchlistLoading: Boolean(address) && auth.isAuthenticated && watchlistQ.isLoading,
  };
}
