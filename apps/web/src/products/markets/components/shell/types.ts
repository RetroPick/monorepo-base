export type MarketsNavTab = "explore" | "markets" | "leaderboard" | "intelligence" | "portfolio";

export function navTabFromPath(pathname: string, search = ""): MarketsNavTab {
  const norm = pathname.replace(/\/+$/, "") || "/";
  if (norm.startsWith("/markets/leaderboard") || norm.startsWith("/markets/intelligence") || norm.startsWith("/markets/traders") || norm.startsWith("/markets/whales")) return "leaderboard";
  if (norm === "/markets/portfolio") return "portfolio";
  if (norm === "/markets") {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    return params.get("tab") === "markets" ? "markets" : "explore";
  }
  if (norm.startsWith("/markets/events") || norm.startsWith("/markets/m/")) {
    return "markets";
  }
  if (norm.startsWith("/markets")) return "markets";
  return "explore";
}
