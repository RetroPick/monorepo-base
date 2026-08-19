export type PortfolioCategoryId = "crypto" | "economics" | "financials" | "tech_science" | "climate" | "other";

export type CategorySlice = { id: PortfolioCategoryId; label: string; value: number; color: string };

export const PORTFOLIO_CATEGORY_LEGEND: { id: PortfolioCategoryId; label: string; color: string }[] = [
  { id: "crypto", label: "Crypto", color: "hsl(215 90% 58%)" },
  { id: "economics", label: "Economics", color: "hsl(32 88% 52%)" },
  { id: "financials", label: "Financials", color: "hsl(292 48% 52%)" },
  { id: "tech_science", label: "Tech & Science", color: "hsl(199 70% 50%)" },
  { id: "climate", label: "Climate", color: "hsl(142 70% 46%)" },
  { id: "other", label: "Others", color: "hsl(228 10% 45%)" },
];

export const GUEST_CATEGORY_SLICES: CategorySlice[] = PORTFOLIO_CATEGORY_LEGEND.map((x) => ({
  ...x,
  value: 0,
}));

export const GUEST_PORTFOLIO_METRICS = {
  totalValueLabel: "$0.00",
  unrealizedPnlLabel: "$0.00",
  tradeableBalanceLabel: "$0.00",
  totalPnlLabel: "$0.00",
  indexedEventsCount: 0,
  claimsCount: 0,
} as const;

export type GuestPosition = {
  id: string;
  market: string;
  outcome: "YES" | "NO";
  shares: string;
  avgCost: string;
  lastPrice: string;
  marketValue: string;
  unrealizedPnl: string;
  pnlPositive: boolean;
};

/** Preview rows shown until PHASE-4 portfolio data is wired to the BFF. */
export const GUEST_POSITIONS: GuestPosition[] = [
  {
    id: "pos-1",
    market: "Will Bitcoin reach $200K before December 31, 2026?",
    outcome: "YES",
    shares: "250",
    avgCost: "$0.58",
    lastPrice: "$0.64",
    marketValue: "$160.00",
    unrealizedPnl: "+$15.00",
    pnlPositive: true,
  },
  {
    id: "pos-2",
    market: "Will the Fed cut benchmark rate by 50bps in Q3 2026?",
    outcome: "NO",
    shares: "400",
    avgCost: "$0.55",
    lastPrice: "$0.59",
    marketValue: "$236.00",
    unrealizedPnl: "+$16.00",
    pnlPositive: true,
  },
  {
    id: "pos-3",
    market: "Will an AI model achieve >90% on SWE-bench in 2026?",
    outcome: "YES",
    shares: "120",
    avgCost: "$0.85",
    lastPrice: "$0.82",
    marketValue: "$98.40",
    unrealizedPnl: "-$3.60",
    pnlPositive: false,
  },
  {
    id: "pos-4",
    market: "Will SpaceX successfully catch Super Heavy booster?",
    outcome: "NO",
    shares: "180",
    avgCost: "$0.30",
    lastPrice: "$0.24",
    marketValue: "$43.20",
    unrealizedPnl: "-$10.80",
    pnlPositive: false,
  },
];

/** Deterministic demo equity curve (index → $) for the guest net-worth chart. */
export const GUEST_NET_WORTH_SERIES: number[] = [420, 438, 431, 452, 449, 471, 466, 489, 502, 496, 518, 532, 541];
