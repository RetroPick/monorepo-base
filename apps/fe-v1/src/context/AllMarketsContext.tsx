import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fallbackMarkets } from '@/data/allMarkets';
import { Market } from '@/types/market';

const CACHE_KEY = 'retropick_all_markets_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface AllMarketsContextType {
  markets: Market[];
  isLoading: boolean;
  error: string | null;
  refreshMarkets: () => Promise<void>;
}

const AllMarketsContext = createContext<AllMarketsContextType | undefined>(undefined);

export const AllMarketsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cachedMarkets = (() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts < CACHE_TTL_MS) return parsed.data as Market[];
      }
    } catch {
      /* ignore */
    }
    return null;
  })();

  const [markets, setMarkets] = useState<Market[]>(cachedMarkets || fallbackMarkets);
  const [isLoading, setIsLoading] = useState(!cachedMarkets);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const nextMarkets = cachedMarkets || fallbackMarkets;
      setMarkets(nextMarkets);

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: nextMarkets, ts: Date.now() }));
      } catch {
        /* quota exceeded */
      }
    } catch (err) {
      console.error('Error loading all markets context', err);
      setError('Using local fallback markets.');
      setMarkets(fallbackMarkets);
    } finally {
      setIsLoading(false);
    }
  }, [cachedMarkets]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  return (
    <AllMarketsContext.Provider value={{ markets, isLoading, error, refreshMarkets: loadMarkets }}>
      {children}
    </AllMarketsContext.Provider>
  );
};

export const useAllMarkets = () => {
  const context = useContext(AllMarketsContext);
  if (context === undefined) {
    throw new Error('useAllMarkets must be used within an AllMarketsProvider');
  }
  return context;
};
