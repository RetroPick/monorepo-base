import type { MarketTypeEducationStep } from "@/lib/market-data/marketTypeDiscoverContent";

/** Global navbar “How RetroPick works” tour (not tied to a single market type). */
export const HOW_RETRO_PICK_WORKS_TITLE = "How RetroPick works";

export const HOW_RETRO_PICK_WORKS_STEPS: readonly MarketTypeEducationStep[] = [
  {
    id: "what",
    title: "What you're trading",
    body: "Each market asks a clear question with a fixed end time. You are not buying a stock—you are taking a side on how that question will resolve. If your side wins when the market closes, you are paid from the pool according to the rules shown on the market page.",
    devNote:
      "Outcome positions are represented on-chain as the protocol’s conditional tokens / shares; payoff semantics match the template’s settlement spec.",
  },
  {
    id: "choose",
    title: "Choose a market and a side",
    body: "Browse open markets, read the question and resolution text, then pick the outcome you believe will happen—often just two choices, sometimes more. The prices you see reflect how the crowd is leaning; they are not a guarantee of the final result.",
  },
  {
    id: "fund",
    title: "Put funds behind your view",
    body: "You add funds to the side you favor. Your money joins that side’s pool together with other participants who made the same call. Until the round locks, you may be able to adjust your exposure depending on how the product implements trading for that template.",
    devNote:
      "Typically you pay with a supported stablecoin (e.g. USDC) from a connected wallet: approve spending allowance if prompted, then confirm the transaction. Gas is paid in the chain’s native token.",
  },
  {
    id: "lock",
    title: "When the market locks",
    body: "At lock time, the rules stop changing: the question, timing, and how the result will be measured are fixed. No one can rewrite the terms after that point—you are settling against what was published in advance.",
    devNote:
      "On-chain, lock/resolve checkpoints are enforced by the market contract and resolver; feed reads are scheduled per template.",
  },
  {
    id: "result",
    title: "How the result is decided",
    body: "RetroPick does not have someone pick the winner by hand. At settlement time the system uses authorized market data—the same feed-backed readings used across DeFi—to read the relevant values and apply the rule printed on the market. If the rule is satisfied, your side wins; otherwise the other side does.",
    devNote:
      "Settlement uses Chainlink-style oracle feeds where configured; the contract compares on-chain values to the template rule. There is no admin override of a valid settlement path.",
  },
  {
    id: "payout",
    title: "Who gets paid",
    body: "The winning side is paid from the collective pools. Losers’ stakes fund the winners pro rata according to how the contract defines shares. After settlement runs, follow the in-app flow to claim or withdraw what you are owed if a separate claim step is required.",
    devNote:
      "Exact share math and redemption UX depend on the market template (e.g. merge/split of conditional tokens). Check the market detail and contract docs for edge cases.",
  },
  {
    id: "void",
    title: "If the market voids",
    body: "Some rules say there is no fair winner—for example a tie on an exact boundary or a feed issue. In those cases the market may void: no winning side, and participants can recover their stakes instead of someone taking the whole pot.",
    devNote:
      "Void conditions are template-specific (e.g. equal lock vs resolve price for direction markets). See resolver and template specs for precision and rounding.",
  },
];
