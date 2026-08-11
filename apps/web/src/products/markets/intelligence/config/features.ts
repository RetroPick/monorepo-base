/** Dev-only fixture mode until I1–I6 backend ships. Never enable in production without BFF. */
export const INTELLIGENCE_FIXTURES_ENABLED =
  typeof process !== "undefined" &&
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_MARKETS_INTELLIGENCE_FIXTURES !== "0";

export const INTELLIGENCE_SIMULATION_BANNER =
  "Simulated intelligence preview — not venue fills or live whale data.";
