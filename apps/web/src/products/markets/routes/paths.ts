export function discoverPath() {
  return "/markets";
}

export function eventPath(eventId: string) {
  return `/markets/events/${encodeURIComponent(eventId)}`;
}

export function marketPath(marketId: string) {
  return `/markets/m/${encodeURIComponent(marketId)}`;
}

export function portfolioPath() {
  return "/markets/portfolio";
}

export function walletConnectPath() {
  return "/markets/wallet";
}

export function fundingPath() {
  return "/markets/funding";
}

export function intelligencePath() {
  return "/markets/leaderboard";
}

export function leaderboardPath() {
  return "/markets/leaderboard";
}

export function intelligenceSmartMoneyPath() {
  return "/markets/intelligence?tab=smart_money";
}

export function intelligenceFollowingPath() {
  return "/markets/intelligence/following";
}

export function intelligencePaperPath() {
  return "/markets/intelligence/paper";
}

export function walletProfilePath(address: string) {
  return `/markets/wallets/${encodeURIComponent(address)}`;
}

export function alertsPath() {
  return "/markets/alerts";
}
