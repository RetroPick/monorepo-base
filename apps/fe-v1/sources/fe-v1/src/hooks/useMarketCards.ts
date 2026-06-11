import { useEffect, useState } from "react";
import { buildMockRetroPickRoundCards } from "@/lib/market-data/market-cards";
import { RetroPickRoundCardDTO } from "@/lib/market-data/types";

export function useMarketCards() {
  const [data, setData] = useState<RetroPickRoundCardDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const next = await buildMockRetroPickRoundCards();
        if (cancelled) return;
        setData(next);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
  }, []);

  return { data, loading, error };
}
