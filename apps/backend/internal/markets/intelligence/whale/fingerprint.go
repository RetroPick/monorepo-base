package whale

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/params"
	"retropick/apps/backend/internal/markets/intelligence/model"
)

// Fingerprint derives the dedup key per 01_WHALE_TRADE_FEED.md §7.
func Fingerprint(trade model.NormalizedTrade) string {
	notionalUSD := float64(trade.NotionalMinor) / float64(params.NotionalMinorScale)
	rounded := math.Round(notionalUSD*100) / 100
	bucket := trade.TradedAt.UTC().Unix() / 60
	payload := fmt.Sprintf(
		"%s|%s|%s|%.2f|%d",
		trade.MarketID,
		strings.ToLower(trade.WalletAddress),
		string(trade.Side),
		rounded,
		bucket,
	)
	sum := sha256.Sum256([]byte(payload))
	return hex.EncodeToString(sum[:])
}

// FingerprintBucketStart returns the minute bucket start for trade_ts.
func FingerprintBucketStart(tradedAt time.Time) time.Time {
	ts := tradedAt.UTC().Unix()
	return time.Unix(ts-ts%60, 0).UTC()
}
