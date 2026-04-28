import { MarketType } from "@/types/engine";

export type MarketTypeEducationStep = {
  id: string;
  title: string;
  body: string;
  /** Optional Solidity / architecture detail for developers. */
  devNote?: string;
};

export type DiscoverMarketTypeEntry = {
  marketType: MarketType;
  title: string;
  /** Short line on the strip card (plain-English hook). */
  tag: string;
  cardGradientClass: string;
  imageSrc: string;
  steps: readonly MarketTypeEducationStep[];
};

const ENTRIES: readonly DiscoverMarketTypeEntry[] = [
  {
    marketType: MarketType.Direction,
    title: "Direction",
    tag: "Up or down vs a saved price snapshot?",
    cardGradientClass: "from-sky-600/90 via-blue-900/80 to-slate-950",
    imageSrc: "/discover/market-types/direction.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "Whether the price will finish higher or lower than a reference taken when betting locks for that round. It is a simple directional call—no zones, no pair of assets—just movement between two readings in time.",
        devNote: "Lock writes checkpoint A; resolve writes checkpoint B; `Resolvers.resolveDirection`. Chainlink path only for this type.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "You add funds to the Up side if you expect a higher price at the end, or to Down if you expect a lower one. Your stake sits with everyone else on the same side until settlement.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "When the round locks, the market stores a reference price from a public, automated feed (the same family of sources institutions use for on-chain prices). At the end it reads the feed again—no person types in the result.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "Up wins if the final reading is above the locked reference. Down wins if it is below. If the two numbers are exactly the same, the round is treated as void: nobody wins; everyone can get their stake back.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "The losing side’s stakes fund payouts for the winning side. After settlement, winners claim their share of the pool through the contract—like a prediction pool where the code, not a judge, splits the pot.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "You have a clear short-term view on direction and want the simplest possible contract: two outcomes, one snapshot in, one reading at the close.",
      },
    ],
  },
  {
    marketType: MarketType.Threshold,
    title: "Threshold",
    tag: "Above or below one fixed line?",
    cardGradientClass: "from-amber-600/85 via-orange-900/75 to-stone-950",
    imageSrc: "/discover/market-types/threshold.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "Whether a published number at settlement will be on or above a fixed level—or below it. That number might be a price, a staking yield, a macro statistic, or another supported feed, not only crypto spot.",
        devNote: "Effective threshold uses `anchorPriceE8` when set else `absoluteThresholdValueE8`. Supports Chainlink and TrustedReporter scalars.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Choose the “at or above” outcome if you think the reading will meet or beat the line, or “below” if you think it will fall short. Stake with the side you believe in.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "At close, the contract pulls one fresh value from the configured feed—the same kind of automated source used for on-chain price and rate data.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "The reading is compared to the published threshold. “At or above” wins if the value clears the line; “below” wins if it does not. There is a single outcome: one side wins, the other loses (no bucket list).",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "The winning side shares the combined stakes from the losing side through the usual pool accounting. Claims open after the market is settled.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "Level bets: yields versus a target, prices versus a strike, macro prints versus a line—anywhere your thesis is “does this number cross this mark?”",
      },
    ],
  },
  {
    marketType: MarketType.RangeClose,
    title: "Range close",
    tag: "Which price zone at the close?",
    cardGradientClass: "from-violet-600/85 via-purple-900/80 to-slate-950",
    imageSrc: "/discover/market-types/range-close.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "Which price zone the asset will land in when the window closes. You are not betting on the path—only on where the final print falls among several pre-defined ranges.",
        devNote: "Settlement buckets use `rangeBoundsE8` ordering and `outcomeCount`; close-only, no lock checkpoint A.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Pick one bucket (e.g. below $70k, $70–80k, and so on) and allocate your stake to that outcome. Each bucket competes against the others.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "Only the closing price from the feed matters. Intraday highs and lows do not change which bucket wins.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "The final price falls into exactly one range. That range is the winning outcome; every other bucket loses.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "Everyone who chose the winning zone shares the stakes that were placed in all losing zones. Think of it as one winning team splitting the pot contributed by the others.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "You expect price to finish inside a band or a specific tier, not necessarily to break out hard in one direction.",
      },
    ],
  },
  {
    marketType: MarketType.Velocity,
    title: "Velocity",
    tag: "How big is the move, either way?",
    cardGradientClass: "from-emerald-600/85 via-teal-900/75 to-slate-950",
    imageSrc: "/discover/market-types/velocity.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "How much the price moves from a starting snapshot—not whether it moves up or down. A +3% and a −3% move count the same for sizing the move.",
        devNote: "Magnitude vs `abs(lock)` in bps bins via `velocityBoundsE4`; needs lock checkpoint A on Chainlink.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Choose a movement bucket (for example small, medium, or large move ranges) and put your stake on the size you expect.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "The market locks a starting price, then at the end reads the price again and measures the percentage change in absolute terms using the same feed family as other markets.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "Whichever bucket matches the realized move size wins. Direction does not break the tie—the bucket is about magnitude only.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "The winning bucket’s participants share the combined stakes from every losing bucket, same pattern as multi-zone markets.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "Events where you expect volatility but are unsure of direction—data releases, shocks, or windows where size matters more than sign.",
      },
    ],
  },
  {
    marketType: MarketType.Ladder,
    title: "Ladder",
    tag: "Which tier—and bigger payoff for bolder tiers?",
    cardGradientClass: "from-rose-600/80 via-fuchsia-900/75 to-slate-950",
    imageSrc: "/discover/market-types/ladder.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "Which price tier contains the close—similar to range buckets—but tiers can carry different payout weights so rarer or bolder picks can earn more when right.",
        devNote: "Winner tier uses `ladderBoundsE8`; `ladderPayoutWeightsBps` feeds `computeLadderLiabilityComponents`.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Pick the tier you believe will contain the final price. Your risk/reward reflects both the tier and its published weight.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "One closing price is read from the feed; the contract decides which tier that print belongs to.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "The tier that contains the close wins. All other tiers lose for that round.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "Winners on the chosen tier split the losing side according to that tier’s weight: higher-weight tiers can draw a larger slice of the losing pool when they win, so contrarian or extreme tiers can pay more.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "You want payouts to reflect how hard or unlikely your tier is—not every bucket is treated the same when the pool settles.",
      },
    ],
  },
  {
    marketType: MarketType.Convergence,
    title: "Convergence",
    tag: "Two prices: closer or further apart?",
    cardGradientClass: "from-cyan-600/80 via-indigo-900/78 to-slate-950",
    imageSrc: "/discover/market-types/convergence.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "Whether the relationship between two tracked prices tightens or widens by settlement—relative value, not a single asset in isolation.",
        devNote: "Two feeds at lock and resolve; `Resolvers.resolveConvergence`; narrow spread change can void; manual Chainlink only in current engine.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Back “converge” if you expect the gap between the two to shrink, or “diverge” if you expect it to grow.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "At lock, the spread between the two feeds is recorded. At close, both are read again and the new spread is compared to the old one.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "If the gap shrinks, converge wins; if it grows, diverge wins. If the spread barely moves inside a defined tolerance, the round can void and stakes return.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "Binary pool: the winning side claims value built from the losing side’s stakes, or everyone is refunded on a void—same broad idea as other two-outcome pools.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "Pair views—who leads, who lags—without managing two separate one-asset bets.",
      },
    ],
  },
  {
    marketType: MarketType.Composite,
    title: "Composite",
    tag: "Several checks → one Yes or No?",
    cardGradientClass: "from-lime-700/75 via-green-900/70 to-slate-950",
    imageSrc: "/discover/market-types/composite.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "Whether a bundle of conditions, each checked with its own data source at settlement, ends up true or false under a single rule—like asking “did everything line up?” or “did anything line up?”",
        devNote: "Up to 4 feeds; `compositeLogic` And | Or | Majority; rolling not supported.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Choose Yes if you think the combined rule will pass at the end, or No if you think it will fail.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "Each condition reads its configured feed at settlement. The contract evaluates passes/fails against each threshold.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "And means every condition must pass for Yes. Or means at least one must pass. Majority means more than half must pass. Otherwise No wins.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "Classic Yes/No split: whichever outcome wins takes from the opposing side’s pool according to the contract’s rules after fees.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "Macro or cross-asset theses where several things need to happen together—or where a single spark is enough, depending on the rule.",
      },
    ],
  },
  {
    marketType: MarketType.Corridor,
    title: "Corridor",
    tag: "Stay inside the band the whole time?",
    cardGradientClass: "from-slate-500/80 via-zinc-800/85 to-black",
    imageSrc: "/discover/market-types/corridor.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "Whether price stays between an upper and lower rail for the entire window—not just where it closes, but whether it ever punches through either rail.",
        devNote: "Uses epoch OHLC from TrustedReporter path; `rangeBoundsE8[0]` lower, `[1]` upper; not intended for pure Chainlink-only OHLC.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Choose Inside if you believe price will respect both rails all period, or Outside if you think it will touch or cross a rail at any point.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "The market tracks the period high and low against the corridor. That requires a full epoch range picture, not only the closing print.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "Inside wins only if the high stayed under the top rail and the low stayed above the bottom rail the whole time. Any breach makes Outside the winner.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "The winning side (Inside or Outside) shares the pool funded by the losing side, same two-outcome settlement pattern.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "Range-bound, consolidation phases where you are paid for the path staying in a channel, not for the final tick.",
      },
    ],
  },
  {
    marketType: MarketType.Cascade,
    title: "Cascade",
    tag: "How many levels does price break through?",
    cardGradientClass: "from-orange-700/80 via-red-950/85 to-black",
    imageSrc: "/discover/market-types/cascade.svg",
    steps: [
      {
        id: "predict",
        title: "What you are predicting",
        body: "How many stacked price levels get broken through in one direction during the period—like counting rungs on a ladder as price pushes through resistance or support lines.",
        devNote: "`cascadeDownward` flips high-water vs low-water break logic; uses OHLC from TrustedReporter; manual-only with rolling disallowed.",
      },
      {
        id: "play",
        title: "How you take part",
        body: "Pick the tier that matches how many breaks you expect (for example none, one, two, or more). Each tier is a separate outcome competing with the others.",
      },
      {
        id: "data",
        title: "What data decides it",
        body: "The engine tracks the extreme price through the epoch—highs for upward-style ladders, lows for downward-style—and compares that path to an ordered list of levels.",
      },
      {
        id: "outcome",
        title: "How the winner is picked",
        body: "Levels are counted from the tracked extreme. The tier that matches the count of broken levels wins; other tiers lose.",
      },
      {
        id: "payout",
        title: "What happens to the money",
        body: "Participants in the winning tier share the stakes from losing tiers. Rarer “more breaks” narratives can behave like higher-conviction ladder picks in how the pool flows.",
      },
      {
        id: "fit",
        title: "Who this fits",
        body: "Trend-strength views: you care how far a move runs through stacked levels, not only whether you were roughly right on direction.",
      },
    ],
  },
] as const;

export function discoverMarketTypeEntries(): readonly DiscoverMarketTypeEntry[] {
  return ENTRIES;
}
