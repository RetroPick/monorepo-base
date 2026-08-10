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
