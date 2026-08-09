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
