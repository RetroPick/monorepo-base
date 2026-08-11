package feed

import (
	"strconv"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/intelligence/params"
	"retropick/apps/backend/internal/markets/intelligence/provenance"
	"retropick/apps/backend/internal/markets/intelligence/store"
	"retropick/apps/backend/internal/markets/signals"
)

// Item is one whale feed card for GET /intelligence/whales.
type Item struct {
	Fingerprint   string                    `json:"fingerprint"`
	Wallet        string                    `json:"wallet"`
	MarketID      string                    `json:"marketId"`
	MarketTitle   string                    `json:"marketTitle,omitempty"`
	Outcome       string                    `json:"outcome"`
	Side          string                    `json:"side"`
	Price         string                    `json:"price"`
	Size          string                    `json:"size"`
	NotionalUsd   string                    `json:"notionalUsd"`
	TradeTs       time.Time                 `json:"tradeTs"`
	WhaleScore    string                    `json:"whaleScore"`
	ReasonCodes   []string                  `json:"reasonCodes"`
	DisplayName   string                    `json:"displayName,omitempty"`
	Freshness     markets.MarketFreshness   `json:"freshness"`
	Provenance    markets.UpstreamProvenance `json:"provenance"`
	Evidence      signals.EvidenceEnvelope  `json:"evidence"`
	LagSeconds    int64                     `json:"lagSeconds"`
	Source        string                    `json:"source"`
}

// ListResponse is the paginated whale feed page.
type ListResponse struct {
	SchemaVersion string           `json:"schemaVersion"`
	Items         []Item           `json:"items"`
	Page          markets.PageInfo `json:"page"`
	CheckedAt     time.Time        `json:"checkedAt"`
	Freshness     markets.MarketFreshness `json:"freshness"`
}

// Query holds list parameters from the API.
type Query struct {
	MinScore    float64
	MinNotional int64
	MarketID    string
	Wallet      string
	ReasonCode  string
	Cursor      string
	Limit       int
}

// DisabledResponse returns the feature-off empty page.
func DisabledResponse(limit int, checkedAt time.Time) ListResponse {
	if limit <= 0 {
		limit = 50
	}
	return ListResponse{
		SchemaVersion: markets.SchemaVersion,
		Items:         []Item{},
		Page:          markets.PageInfo{Limit: limit},
		CheckedAt:     checkedAt,
		Freshness: markets.MarketFreshness{
			State:      markets.FreshnessUnavailable,
			ObservedAt: checkedAt,
			Reason:     "feature_disabled",
		},
	}
}

// List projects store events into API DTOs.
func List(st *store.MemoryStore, q Query, now time.Time) ListResponse {
	if q.Limit <= 0 {
		q.Limit = 50
	}
	if q.Limit > 100 {
		q.Limit = 100
	}
	if q.MinNotional <= 0 {
		q.MinNotional = params.LoadDefault().WhaleScoreLaunch.TauGlobalMinor()
	}
	if q.MinScore <= 0 {
		q.MinScore = params.LoadDefault().WhaleScoreLaunch.ScoreThreshold
	}

	events, next := st.ListWhaleEvents(store.ListFilter{
		MinScore:    q.MinScore,
		MinNotional: q.MinNotional,
		MarketID:    q.MarketID,
		Wallet:      q.Wallet,
		ReasonCode:  q.ReasonCode,
		Cursor:      q.Cursor,
		Limit:       q.Limit,
	})

	items := make([]Item, 0, len(events))
	var freshest time.Time
	for _, event := range events {
		item := ItemFromEvent(event, now)
		items = append(items, item)
		if item.Freshness.ObservedAt.After(freshest) {
			freshest = item.Freshness.ObservedAt
		}
	}

	freshness := markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: now,
		Reason:     "data_trades",
	}
	if len(items) == 0 {
		freshness.State = markets.FreshnessUnavailable
		freshness.Reason = "no_whale_events"
	} else if !freshest.IsZero() {
		freshness.ObservedAt = freshest
		age := now.Sub(freshest)
		if age < 0 {
			age = 0
		}
		freshness.AgeMillis = age.Milliseconds()
	}

	return ListResponse{
		SchemaVersion: markets.SchemaVersion,
		Items:         items,
		Page:          markets.PageInfo{NextCursor: next, Limit: q.Limit},
		CheckedAt:     now,
		Freshness:     freshness,
	}
}

// ItemFromEvent maps a store row to API item with lag honesty fields.
func ItemFromEvent(event store.WhaleEvent, now time.Time) Item {
	lag := event.LagSeconds
	if lag <= 0 {
		lag = int64(now.Sub(event.TradedAt).Seconds())
		if lag < 0 {
			lag = 0
		}
	}
	return Item{
		Fingerprint: event.Fingerprint,
		Wallet:      event.WalletAddress,
		MarketID:    event.MarketID,
		MarketTitle: event.MarketTitle,
		Outcome:     event.Outcome,
		Side:        string(event.Side),
		Price:       minorToDecimalString(event.PriceMinor),
		Size:        minorToDecimalString(event.SizeMinor),
		NotionalUsd: minorToDecimalString(event.NotionalMinor),
		TradeTs:     event.TradedAt,
		WhaleScore:  provenance.FormatWhaleScore(event.WhaleScore),
		ReasonCodes: append([]string(nil), event.ReasonCodes...),
		DisplayName: event.DisplayName,
		Freshness: markets.MarketFreshness{
			State:      markets.FreshnessFresh,
			ObservedAt: event.TradedAt,
			AgeMillis:  lag * 1000,
			Reason:     "data_trades",
		},
		Provenance: markets.UpstreamProvenance{
			Source:     "data_trades",
			UpstreamID: event.TradeRef,
			ObservedAt: event.IngestedAt,
		},
		Evidence:   event.Envelope,
		LagSeconds: lag,
		Source:     "data_trades",
	}
}

func minorToDecimalString(minor int64) string {
	if minor == 0 {
		return "0"
	}
	whole := minor / params.NotionalMinorScale
	frac := minor % params.NotionalMinorScale
	if frac == 0 {
		return strconv.FormatInt(whole, 10)
	}
	fracStr := strconv.FormatInt(frac, 10)
	for len(fracStr) < 6 {
		fracStr = "0" + fracStr
	}
	fracStr = trimTrailingZeros(fracStr)
	return strconv.FormatInt(whole, 10) + "." + fracStr
}

func trimTrailingZeros(s string) string {
	for len(s) > 0 && s[len(s)-1] == '0' {
		s = s[:len(s)-1]
	}
	if s == "" {
		return "0"
	}
	return s
}
