"use client";

import { useState, useEffect, useCallback } from "react";

export interface PositionItem {
  id: string;
  marketId: string;
  title: string;
  outcome: "YES" | "NO";
  shares: number;
  avgCost: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  pnlPercent: number;
  category: string;
  resolutionDate: string;
  createdAt: string;
}

export interface OpenOrderItem {
  id: string;
  marketId: string;
  title: string;
  type: "LIMIT BUY" | "LIMIT SELL";
  outcome: "YES" | "NO";
  shares: number;
  price: number;
  totalValue: number;
  placedAt: string;
}

export interface ClosedOrderItem {
  id: string;
  marketId: string;
  title: string;
  outcome: "YES" | "NO";
  shares: number;
  settledPrice: number;
  realizedPnl: number;
  settledAt: string;
}

export interface ActivityItem {
  id: string;
  type: "BUY" | "SELL" | "CLAIM" | "DEPOSIT";
  marketTitle: string;
  shares?: number;
  amountUsd: number;
  txHash: string;
  timeAgo: string;
  timestamp: number;
}

export interface WatchlistItem {
  id: string;
  marketId: string;
  title: string;
  category: string;
  yesChance: number;
  volume24h: string;
  change24h: string;
}

interface PortfolioStorageState {
  balance: number;
  positions: PositionItem[];
  openOrders: OpenOrderItem[];
  closedOrders: ClosedOrderItem[];
  activities: ActivityItem[];
  watchlist: WatchlistItem[];
}

const STORAGE_KEY = "retropick_portfolio_data";
const EVENT_NAME = "retropick-portfolio-changed";

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  {
    id: "w-1",
    marketId: "btc-150k-2027",
    title: "Will Bitcoin hit $150,000 before January 1, 2027?",
    category: "Crypto",
    yesChance: 64,
    volume24h: "$2.4M",
    change24h: "+5.2%",
  },
  {
    id: "w-2",
    marketId: "fed-decision-september",
    title: "Fed Decision in September?",
    category: "Economics",
    yesChance: 71,
    volume24h: "$37.0M",
    change24h: "+2.1%",
  },
  {
    id: "w-3",
    marketId: "nvidia-market-cap-5t",
    title: "Will NVIDIA reach $5 Trillion market cap in 2026?",
    category: "Financials",
    yesChance: 77,
    volume24h: "$1.4M",
    change24h: "+8.4%",
  },
  {
    id: "w-4",
    marketId: "fifa-world-cup-2026-winner",
    title: "Who will win the FIFA World Cup 2026?",
    category: "Sports",
    yesChance: 38,
    volume24h: "$6.0M",
    change24h: "+4.1%",
  },
];

const DEFAULT_STATE: PortfolioStorageState = {
  balance: 1000.0, // Initial starting demo balance $1,000 USDC
  positions: [],
  openOrders: [],
  closedOrders: [],
  activities: [
    {
      id: "act-init",
      type: "DEPOSIT",
      marketTitle: "USDC Welcome Bonus Deposit",
      amountUsd: 1000.0,
      txHash: "0x8f2a...c91e",
      timeAgo: "Just now",
      timestamp: Date.now(),
    },
  ],
  watchlist: DEFAULT_WATCHLIST,
};

function getStoredState(): PortfolioStorageState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw);
    return {
      balance: typeof parsed.balance === "number" ? parsed.balance : DEFAULT_STATE.balance,
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      openOrders: Array.isArray(parsed.openOrders) ? parsed.openOrders : [],
      closedOrders: Array.isArray(parsed.closedOrders) ? parsed.closedOrders : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : DEFAULT_STATE.activities,
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : DEFAULT_WATCHLIST,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveStoredState(state: PortfolioStorageState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (e) {
    console.error("Failed to save portfolio state:", e);
  }
}

function randomTxHash(): string {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 4; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  hash += "...";
  for (let i = 0; i < 4; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return hash;
}

export function useUserPortfolio() {
  const [state, setState] = useState<PortfolioStorageState>(getStoredState);

  useEffect(() => {
    const handleUpdate = () => {
      setState(getStoredState());
    };
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Deposit funds
  const deposit = useCallback((amountUsd: number) => {
    if (amountUsd <= 0) return;
    const current = getStoredState();
    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: "DEPOSIT",
      marketTitle: "USDC Wallet Deposit",
      amountUsd: amountUsd,
      txHash: randomTxHash(),
      timeAgo: "Just now",
      timestamp: Date.now(),
    };
    const nextState: PortfolioStorageState = {
      ...current,
      balance: Math.round((current.balance + amountUsd) * 100) / 100,
      activities: [newActivity, ...current.activities].slice(0, 50),
    };
    saveStoredState(nextState);
    setState(nextState);
  }, []);

  // Execute Market Buy / Sell
  const executeMarketTrade = useCallback(
    (params: {
      marketId: string;
      marketTitle: string;
      category?: string;
      outcome: "YES" | "NO";
      side: "buy" | "sell";
      amountUsd: number;
      shares: number;
      priceCents: number;
      resolutionDate?: string;
    }) => {
      const current = getStoredState();
      const {
        marketId,
        marketTitle,
        category = "Crypto",
        outcome,
        side,
        amountUsd,
        shares,
        priceCents,
        resolutionDate = "Dec 31, 2026",
      } = params;

      if (side === "buy") {
        if (current.balance < amountUsd) {
          throw new Error("Insufficient tradeable balance. Please deposit USDC.");
        }

        const pricePerShare = Math.max(0.01, priceCents / 100);
        const actualShares = shares > 0 ? shares : Math.floor(amountUsd / pricePerShare);
        const actualCost = Math.round(actualShares * pricePerShare * 100) / 100;

        // Check if matching position already exists
        const posIndex = current.positions.findIndex(
          (p) => p.marketId === marketId && p.outcome === outcome,
        );

        let updatedPositions = [...current.positions];
        if (posIndex >= 0) {
          const existing = updatedPositions[posIndex];
          const totalShares = existing.shares + actualShares;
          const totalCost = existing.shares * existing.avgCost + actualCost;
          const avgCost = totalCost / totalShares;
          const marketValue = totalShares * pricePerShare;
          const unrealizedPnl = marketValue - totalCost;
          const pnlPercent = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

          updatedPositions[posIndex] = {
            ...existing,
            shares: totalShares,
            avgCost: Math.round(avgCost * 100) / 100,
            lastPrice: pricePerShare,
            marketValue: Math.round(marketValue * 100) / 100,
            unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
            pnlPercent: Math.round(pnlPercent * 10) / 10,
          };
        } else {
          const marketValue = actualCost;
          const unrealizedPnl = 0;
          const pnlPercent = 0;

          const newPosition: PositionItem = {
            id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            marketId,
            title: marketTitle,
            outcome,
            shares: actualShares,
            avgCost: pricePerShare,
            lastPrice: pricePerShare,
            marketValue,
            unrealizedPnl,
            pnlPercent,
            category,
            resolutionDate,
            createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
          updatedPositions = [newPosition, ...updatedPositions];
        }

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          type: "BUY",
          marketTitle: `${marketTitle} (${outcome})`,
          shares: actualShares,
          amountUsd: actualCost,
          txHash: randomTxHash(),
          timeAgo: "Just now",
          timestamp: Date.now(),
        };

        const nextState: PortfolioStorageState = {
          ...current,
          balance: Math.max(0, Math.round((current.balance - actualCost) * 100) / 100),
          positions: updatedPositions,
          activities: [newActivity, ...current.activities].slice(0, 50),
        };

        saveStoredState(nextState);
        setState(nextState);
        return actualCost;
      } else {
        // Sell logic
        const posIndex = current.positions.findIndex(
          (p) => p.marketId === marketId && p.outcome === outcome,
        );

        if (posIndex < 0) {
          throw new Error("You do not hold any shares for this outcome to sell.");
        }

        const existing = current.positions[posIndex];
        const sharesToSell = Math.min(existing.shares, shares > 0 ? shares : existing.shares);
        const pricePerShare = Math.max(0.01, priceCents / 100);
        const proceeds = Math.round(sharesToSell * pricePerShare * 100) / 100;
        const costBasis = Math.round(sharesToSell * existing.avgCost * 100) / 100;
        const realizedPnl = Math.round((proceeds - costBasis) * 100) / 100;

        let updatedPositions = [...current.positions];
        if (existing.shares - sharesToSell <= 0) {
          updatedPositions = updatedPositions.filter((_, idx) => idx !== posIndex);
        } else {
          const remainingShares = existing.shares - sharesToSell;
          const remainingMarketVal = remainingShares * pricePerShare;
          const remainingCost = remainingShares * existing.avgCost;
          const unrealizedPnl = remainingMarketVal - remainingCost;
          const pnlPercent = remainingCost > 0 ? (unrealizedPnl / remainingCost) * 100 : 0;

          updatedPositions[posIndex] = {
            ...existing,
            shares: remainingShares,
            marketValue: Math.round(remainingMarketVal * 100) / 100,
            unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
            pnlPercent: Math.round(pnlPercent * 10) / 10,
          };
        }

        const newClosedOrder: ClosedOrderItem = {
          id: `cl-${Date.now()}`,
          marketId,
          title: marketTitle,
          outcome,
          shares: sharesToSell,
          settledPrice: pricePerShare,
          realizedPnl,
          settledAt: "Today",
        };

        const newActivity: ActivityItem = {
          id: `act-${Date.now()}`,
          type: "SELL",
          marketTitle: `${marketTitle} (${outcome})`,
          shares: sharesToSell,
          amountUsd: proceeds,
          txHash: randomTxHash(),
          timeAgo: "Just now",
          timestamp: Date.now(),
        };

        const nextState: PortfolioStorageState = {
          ...current,
          balance: Math.round((current.balance + proceeds) * 100) / 100,
          positions: updatedPositions,
          closedOrders: [newClosedOrder, ...current.closedOrders],
          activities: [newActivity, ...current.activities].slice(0, 50),
        };

        saveStoredState(nextState);
        setState(nextState);
        return proceeds;
      }
    },
    [],
  );

  // Place Limit Order
  const placeLimitOrder = useCallback(
    (params: {
      marketId: string;
      marketTitle: string;
      outcome: "YES" | "NO";
      type: "LIMIT BUY" | "LIMIT SELL";
      shares: number;
      limitPriceCents: number;
    }) => {
      const current = getStoredState();
      const { marketId, marketTitle, outcome, type, shares, limitPriceCents } = params;
      const priceDollars = limitPriceCents / 100;
      const totalValue = Math.round(shares * priceDollars * 100) / 100;

      if (type === "LIMIT BUY") {
        if (current.balance < totalValue) {
          throw new Error("Insufficient tradeable balance for limit order.");
        }
      }

      const newOrder: OpenOrderItem = {
        id: `ord-${Date.now()}`,
        marketId,
        title: marketTitle,
        type,
        outcome,
        shares,
        price: priceDollars,
        totalValue,
        placedAt: "Just now",
      };

      const nextBalance =
        type === "LIMIT BUY"
          ? Math.max(0, Math.round((current.balance - totalValue) * 100) / 100)
          : current.balance;

      const nextState: PortfolioStorageState = {
        ...current,
        balance: nextBalance,
        openOrders: [newOrder, ...current.openOrders],
      };

      saveStoredState(nextState);
      setState(nextState);
    },
    [],
  );

  // Cancel Limit Order
  const cancelOrder = useCallback((orderId: string) => {
    const current = getStoredState();
    const order = current.openOrders.find((o) => o.id === orderId);
    if (!order) return;

    const refund = order.type === "LIMIT BUY" ? order.totalValue : 0;
    const nextState: PortfolioStorageState = {
      ...current,
      balance: Math.round((current.balance + refund) * 100) / 100,
      openOrders: current.openOrders.filter((o) => o.id !== orderId),
    };

    saveStoredState(nextState);
    setState(nextState);
  }, []);

  // Toggle Watchlist
  const toggleWatchlist = useCallback(
    (item: {
      marketId: string;
      title: string;
      category?: string;
      yesChance?: number;
      volume24h?: string;
      change24h?: string;
    }) => {
      const current = getStoredState();
      const exists = current.watchlist.some(
        (w) => w.marketId === item.marketId || w.id === item.marketId,
      );

      let nextWatchlist: WatchlistItem[];
      if (exists) {
        nextWatchlist = current.watchlist.filter(
          (w) => w.marketId !== item.marketId && w.id !== item.marketId,
        );
      } else {
        const newItem: WatchlistItem = {
          id: `w-${Date.now()}`,
          marketId: item.marketId,
          title: item.title,
          category: item.category || "Crypto",
          yesChance: item.yesChance ?? 50,
          volume24h: item.volume24h || "$1.2M",
          change24h: item.change24h || "+2.5%",
        };
        nextWatchlist = [newItem, ...current.watchlist];
      }

      const nextState: PortfolioStorageState = {
        ...current,
        watchlist: nextWatchlist,
      };

      saveStoredState(nextState);
      setState(nextState);
      return !exists;
    },
    [],
  );

  const isWatchlisted = useCallback(
    (marketId: string) => {
      return state.watchlist.some((w) => w.marketId === marketId || w.id === marketId);
    },
    [state.watchlist],
  );

  // Total Portfolio Calculations
  const positionsMarketValue = state.positions.reduce((acc, p) => acc + p.marketValue, 0);
  const totalUnrealizedPnl = state.positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
  const totalPortfolioValue = Math.round((state.balance + positionsMarketValue) * 100) / 100;

  return {
    balance: state.balance,
    positions: state.positions,
    openOrders: state.openOrders,
    closedOrders: state.closedOrders,
    activities: state.activities,
    watchlist: state.watchlist,
    totalPortfolioValue,
    positionsMarketValue: Math.round(positionsMarketValue * 100) / 100,
    totalUnrealizedPnl: Math.round(totalUnrealizedPnl * 100) / 100,
    tradeableBalance: state.balance,
    deposit,
    executeMarketTrade,
    placeLimitOrder,
    cancelOrder,
    toggleWatchlist,
    isWatchlisted,
  };
}
