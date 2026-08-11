package whale

// Launch reason codes per 01_WHALE_TRADE_FEED.md §6.
const (
	ReasonNotionalThreshold = "WHALE_NOTIONAL_THRESHOLD"
	ReasonVolumeShare       = "WHALE_VOLUME_SHARE"
	ReasonPriceImpact       = "WHALE_PRICE_IMPACT"
	ReasonWatchedWallet     = "WHALE_WATCHED_WALLET"
	ReasonClusterBurst      = "WHALE_CLUSTER_BURST"
	ReasonConcentration     = "WHALE_CONCENTRATION"
)
