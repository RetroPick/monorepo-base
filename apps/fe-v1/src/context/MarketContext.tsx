import React, { createContext, useContext, useState } from 'react';
import { V1_MARKETS } from '@/data/v1App';
import { Market } from '@/types/market';

interface MarketContextType {
    markets: Market[];
    isLoading: boolean;
    error: string | null;
    refreshMarkets: () => Promise<void>;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [markets] = useState<Market[]>(V1_MARKETS);
    const [isLoading] = useState(false);
    const [error] = useState<string | null>(null);
    const refreshMarkets = async () => undefined;

    return (
        <MarketContext.Provider value={{ markets, isLoading, error, refreshMarkets }}>
            {children}
        </MarketContext.Provider>
    );
};

export const useMarkets = () => {
    const context = useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarkets must be used within a MarketProvider');
    }
    return context;
};
