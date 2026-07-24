// src/lib/relayerApi.ts

const RELAYER_BASE_URL = 'http://localhost:8790';

export interface BuySharesParams {
    sessionId: string;
    outcomeIndex: number;
    delta: number;
    maxCost?: number;
    userAddress: string;
    signature: string;
}

export interface SellSharesParams {
    sessionId: string;
    outcomeIndex: number;
    delta: number;
    minReceive?: number;
    maxOddsImpactBps?: number;
    userAddress: string;
    signature: string;
}

export interface SwapSharesParams {
    sessionId: string;
    fromOutcome: number;
    toOutcome: number;
    delta: number;
    maxCost?: number;
    userAddress: string;
    signature: string;
}

export interface SessionConfig {
    sessionId: string;
    marketId: string;
    vaultId: string;
    numOutcomes: number;
    b: number;
}

export const relayerApi = {
    /**
     * Create a new trading session. Usually done once per market by the backend/creator.
     */
    async createSession(config: SessionConfig) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/session/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get session data including current probabilities (p) and shares (q).
     */
    async getSession(sessionId: string) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/session/${sessionId}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get user balance and positions in a specific session
     */
    async getAccount(sessionId: string, address: string) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/session/${sessionId}/account/${address}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Execute a buy trade in the Yellow Session
     */
    async buyShares(params: BuySharesParams) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/trade/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Execute a sell trade in the Yellow Session
     */
    async sellShares(params: SellSharesParams) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/trade/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Execute a swap trade in the Yellow Session (e.g., selling YES for NO)
     */
    async swapShares(params: SwapSharesParams) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/trade/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get prices (probabilities) for an active session
     */
    async getPrices(sessionId: string) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/session/${sessionId}/prices`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get quote for a buy order: chance to win and potential payout.
     * Uses amountUsd and currentPriceCents to approximate delta, then calls quote API.
     * @param sessionId - Session ID
     * @param outcomeIndex - 0 for YES, 1 for NO
     * @param amountUsd - User-entered USD amount (cost)
     * @param currentPriceCents - Current outcome price in cents (e.g. 51 for 51¢)
     * @returns { chanceToWin, potentialPayout, cost, netCost } or null if session not found
     */
    async getQuote(
        sessionId: string,
        outcomeIndex: number,
        amountUsd: number,
        currentPriceCents: number
    ): Promise<{ chanceToWin: number; potentialPayout: number; cost: number; netCost: number } | null> {
        if (!amountUsd || amountUsd <= 0 || !currentPriceCents || currentPriceCents <= 0) return null;
        const priceAsFraction = currentPriceCents / 100;
        const delta = amountUsd / priceAsFraction;
        if (delta <= 0) return null;
        try {
            const res = await fetch(
                `${RELAYER_BASE_URL}/api/session/${sessionId}/quote?type=buy&outcomeIndex=${outcomeIndex}&delta=${delta}`
            );
            if (!res.ok) return null;
            const data = await res.json();
            const chanceToWin = Array.isArray(data.prices) && data.prices[outcomeIndex] != null
                ? data.prices[outcomeIndex]
                : priceAsFraction;
            return {
                chanceToWin,
                potentialPayout: delta,
                cost: data.cost ?? amountUsd,
                netCost: data.netCost ?? amountUsd,
            };
        } catch {
            return null;
        }
    },

    /**
     * Admin/Test route: Credit a user with mock USD balance in the session
     */
    async creditUser(sessionId: string, userAddress: string, amount: number) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/session/credit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, userAddress, amount })
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get account positions in a session
     */
    async getAccountState(sessionId: string, address: string) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/session/${sessionId}/account/${address}`);
        if (!res.ok) throw new Error('Account state not found');
        return res.json();
    },

    /**
     * Utility to generate a consistent session string from market title
     */
    getMarketSessionId(marketTitle: string): string {
        let hashStr = 0;
        for (let i = 0; i < marketTitle.length; i++) {
            hashStr = (hashStr << 5) - hashStr + marketTitle.charCodeAt(i);
            hashStr |= 0;
        }
        // Consistent hash string padding (64 hex characters + 0x)
        return '0x' + Math.abs(hashStr).toString(16).padEnd(64, '0');
    },

    /**
     * Get trade history for a specific wallet address (newest first).
     */
    async getTradeHistory(address: string) {
        const res = await fetch(`${RELAYER_BASE_URL}/api/history/${address}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get global trade history across all users (newest first).
     */
    async getGlobalTradeHistory() {
        const res = await fetch(`${RELAYER_BASE_URL}/api/history`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get checkpoint spec with EIP-712 digest for signing (AppFlow §7).
     */
    async getCheckpoint(sessionId: string) {
        const res = await fetch(`${RELAYER_BASE_URL}/cre/checkpoints/${sessionId}`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Submit user signatures for checkpoint finalization.
     */
    async submitCheckpointSigs(sessionId: string, userSigs: Record<string, string>) {
        const res = await fetch(`${RELAYER_BASE_URL}/cre/checkpoints/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userSigs })
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Get risk overview across all active sessions (Layer 5 Risk Sentinel).
     */
    async getRiskOverview() {
        const res = await fetch(`${RELAYER_BASE_URL}/api/risk/overview`);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    }
};
