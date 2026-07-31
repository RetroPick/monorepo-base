package markets

import (
	"fmt"
	"regexp"
	"time"
)

const SchemaVersion = "1"

var decimalPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)(\.[0-9]+)?$`)

// DecimalString preserves an unsigned fixed-point value without binary
// floating-point conversion.
type DecimalString string

func ParseDecimalString(raw string) (DecimalString, error) {
	if !decimalPattern.MatchString(raw) {
		return "", fmt.Errorf("invalid unsigned decimal string")
	}
	return DecimalString(raw), nil
}

type MarketStatus string

const (
	MarketStatusUnknown  MarketStatus = "unknown"
	MarketStatusOpen     MarketStatus = "open"
	MarketStatusClosed   MarketStatus = "closed"
	MarketStatusResolved MarketStatus = "resolved"
	MarketStatusArchived MarketStatus = "archived"
)

func (s MarketStatus) Valid() bool {
	switch s {
	case MarketStatusUnknown, MarketStatusOpen, MarketStatusClosed, MarketStatusResolved, MarketStatusArchived:
		return true
	default:
		return false
	}
}

type FreshnessState string

const (
	FreshnessFresh       FreshnessState = "fresh"
	FreshnessStale       FreshnessState = "stale"
	FreshnessResyncing   FreshnessState = "resyncing"
	FreshnessUnavailable FreshnessState = "unavailable"
	FreshnessInvalid     FreshnessState = "invalid"
)

func (s FreshnessState) Valid() bool {
	switch s {
	case FreshnessFresh, FreshnessStale, FreshnessResyncing, FreshnessUnavailable, FreshnessInvalid:
		return true
	default:
		return false
	}
}

type UpstreamProvenance struct {
	Source          string     `json:"source"`
	UpstreamID      string     `json:"upstreamId,omitempty"`
	ObservedAt      time.Time  `json:"observedAt"`
	UpstreamUpdated *time.Time `json:"upstreamUpdatedAt,omitempty"`
	ContentHash     string     `json:"contentHash,omitempty"`
}

type MarketFreshness struct {
	State      FreshnessState `json:"state"`
	ObservedAt time.Time      `json:"observedAt"`
	AgeMillis  int64          `json:"ageMillis,omitempty"`
	Reason     string         `json:"reason,omitempty"`
	BookHash   string         `json:"bookHash,omitempty"`
}

type ResolutionSource struct {
	Name string `json:"name"`
	URL  string `json:"url,omitempty"`
}

type ResolutionRule struct {
	Description string             `json:"description"`
	Sources     []ResolutionSource `json:"sources"`
	ContentHash string             `json:"contentHash"`
	UpdatedAt   *time.Time         `json:"updatedAt,omitempty"`
}

type Outcome struct {
	ID         string         `json:"id"`
	UpstreamID string         `json:"upstreamId"`
	Name       string         `json:"name"`
	Price      *DecimalString `json:"price,omitempty"`
	Winner     *bool          `json:"winner,omitempty"`
}

type MarketCapability struct {
	OrderBook bool `json:"orderBook"`
	History   bool `json:"history"`
	Realtime  bool `json:"realtime"`
	NegRisk   bool `json:"negRisk"`
	Trading   bool `json:"trading"`
}

type EventSummary struct {
	SchemaVersion string             `json:"schemaVersion"`
	ID            string             `json:"id"`
	UpstreamID    string             `json:"upstreamId"`
	Slug          string             `json:"slug,omitempty"`
	Title         string             `json:"title"`
	Status        MarketStatus       `json:"status"`
	StartAt       *time.Time         `json:"startAt,omitempty"`
	EndAt         *time.Time         `json:"endAt,omitempty"`
	MarketCount   int                `json:"marketCount"`
	Freshness     MarketFreshness    `json:"freshness"`
	Provenance    UpstreamProvenance `json:"provenance"`
}

type MarketSummary struct {
	SchemaVersion string             `json:"schemaVersion"`
	ID            string             `json:"id"`
	UpstreamID    string             `json:"upstreamId"`
	ConditionID   string             `json:"conditionId"`
	Slug          string             `json:"slug,omitempty"`
	Question      string             `json:"question"`
	Status        MarketStatus       `json:"status"`
	EndAt         *time.Time         `json:"endAt,omitempty"`
	Outcomes      []Outcome          `json:"outcomes"`
	Capabilities  MarketCapability   `json:"capabilities"`
	Freshness     MarketFreshness    `json:"freshness"`
	Provenance    UpstreamProvenance `json:"provenance"`
}

type EventDetail struct {
	SchemaVersion string             `json:"schemaVersion"`
	ID            string             `json:"id"`
	UpstreamID    string             `json:"upstreamId"`
	Slug          string             `json:"slug,omitempty"`
	Title         string             `json:"title"`
	Description   string             `json:"description,omitempty"`
	Status        MarketStatus       `json:"status"`
	StartAt       *time.Time         `json:"startAt,omitempty"`
	EndAt         *time.Time         `json:"endAt,omitempty"`
	MarketCount   int                `json:"marketCount"`
	Markets       []MarketSummary    `json:"markets"`
	Freshness     MarketFreshness    `json:"freshness"`
	Provenance    UpstreamProvenance `json:"provenance"`
}

type MarketDetail struct {
	SchemaVersion string             `json:"schemaVersion"`
	ID            string             `json:"id"`
	UpstreamID    string             `json:"upstreamId"`
	EventID       string             `json:"eventId,omitempty"`
	ConditionID   string             `json:"conditionId"`
	Slug          string             `json:"slug,omitempty"`
	Question      string             `json:"question"`
	Description   string             `json:"description,omitempty"`
	Status        MarketStatus       `json:"status"`
	EndAt         *time.Time         `json:"endAt,omitempty"`
	Outcomes      []Outcome          `json:"outcomes"`
	Resolution    ResolutionRule     `json:"resolution"`
	Capabilities  MarketCapability   `json:"capabilities"`
	Freshness     MarketFreshness    `json:"freshness"`
	Provenance    UpstreamProvenance `json:"provenance"`
}

type PricePoint struct {
	Timestamp time.Time     `json:"timestamp"`
	Price     DecimalString `json:"price"`
	Derived   bool          `json:"derived"`
	Source    string        `json:"source"`
}

type PriceHistoryResponse struct {
	SchemaVersion string             `json:"schemaVersion"`
	MarketID      string             `json:"marketId"`
	TokenID       string             `json:"tokenId"`
	Points        []PricePoint       `json:"points"`
	Freshness     MarketFreshness    `json:"freshness"`
	Provenance    UpstreamProvenance `json:"provenance"`
}

type OrderBookLevel struct {
	Price DecimalString `json:"price"`
	Size  DecimalString `json:"size"`
}

type OrderBookSnapshot struct {
	SchemaVersion  string             `json:"schemaVersion"`
	MarketID       string             `json:"marketId"`
	ConditionID    string             `json:"conditionId"`
	TokenID        string             `json:"tokenId"`
	Hash           string             `json:"hash"`
	Timestamp      time.Time          `json:"timestamp"`
	Bids           []OrderBookLevel   `json:"bids"`
	Asks           []OrderBookLevel   `json:"asks"`
	BestBid        *DecimalString     `json:"bestBid,omitempty"`
	BestAsk        *DecimalString     `json:"bestAsk,omitempty"`
	Midpoint       *DecimalString     `json:"midpoint,omitempty"`
	Spread         *DecimalString     `json:"spread,omitempty"`
	MinOrderSize   DecimalString      `json:"minOrderSize"`
	TickSize       DecimalString      `json:"tickSize"`
	NegRisk        bool               `json:"negRisk"`
	LastTradePrice *DecimalString     `json:"lastTradePrice,omitempty"`
	Freshness      MarketFreshness    `json:"freshness"`
	Provenance     UpstreamProvenance `json:"provenance"`
}

type MarketHealthSnapshot struct {
	SchemaVersion string             `json:"schemaVersion"`
	MarketID      string             `json:"marketId"`
	Algorithm     string             `json:"algorithm"`
	ObservedAt    time.Time          `json:"observedAt"`
	Spread        *DecimalString     `json:"spread,omitempty"`
	BestBid       *DecimalString     `json:"bestBid,omitempty"`
	BestAsk       *DecimalString     `json:"bestAsk,omitempty"`
	BidDepth      DecimalString      `json:"bidDepth"`
	AskDepth      DecimalString      `json:"askDepth"`
	SnapshotAgeMS int64              `json:"snapshotAgeMs"`
	Crossed       bool               `json:"crossed"`
	Freshness     MarketFreshness    `json:"freshness"`
	Provenance    UpstreamProvenance `json:"provenance"`
}

type SignalEvidence struct {
	Kind        string    `json:"kind"`
	ReferenceID string    `json:"referenceId"`
	ObservedAt  time.Time `json:"observedAt"`
	ContentHash string    `json:"contentHash"`
}

type SignalEnvelope struct {
	SchemaVersion  string           `json:"schemaVersion"`
	ID             string           `json:"id"`
	Type           string           `json:"type"`
	MarketID       string           `json:"marketId"`
	State          string           `json:"state"`
	RuleVersion    string           `json:"ruleVersion"`
	ReasonCodes    []string         `json:"reasonCodes"`
	CreatedAt      time.Time        `json:"createdAt"`
	ExpiresAt      *time.Time       `json:"expiresAt,omitempty"`
	RetractedAt    *time.Time       `json:"retractedAt,omitempty"`
	IdempotencyKey string           `json:"idempotencyKey"`
	Evidence       []SignalEvidence `json:"evidence"`
}

type RealtimeEnvelope struct {
	SchemaVersion    string    `json:"schemaVersion"`
	EventID          string    `json:"eventId"`
	Type             string    `json:"eventType"`
	Source           string    `json:"source"`
	MarketID         string    `json:"marketId"`
	UpstreamID       string    `json:"upstreamId"`
	TokenID          string    `json:"tokenId"`
	Sequence         *string   `json:"sequence"`
	SnapshotHash     string    `json:"snapshotHash,omitempty"`
	StreamEpoch      uint64    `json:"streamEpoch"`
	DeliveryCounter  uint64    `json:"deliveryCounter"`
	ObservedAt       time.Time `json:"observedAt"`
	PublishedAt      time.Time `json:"publishedAt"`
	Payload          any       `json:"payload"`
}

type PageInfo struct {
	NextCursor *string `json:"nextCursor"`
	Limit      int     `json:"limit"`
}

type APIError struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Details   map[string]any `json:"details,omitempty"`
	RequestID string         `json:"requestId,omitempty"`
}

type ErrorResponse struct {
	Error APIError `json:"error"`
}

type EligibilityResponse struct {
	Eligible  bool      `json:"eligible"`
	Reason    string    `json:"reason,omitempty"`
	CheckedAt time.Time `json:"checkedAt"`
	Region    string    `json:"region,omitempty"`
}

type CapabilitiesResponse struct {
	Version   string          `json:"version"`
	Catalog   bool            `json:"catalog"`
	Trading   bool            `json:"trading"`
	Combos    bool            `json:"combos"`
	Intel     bool            `json:"intelligence"`
	Features  map[string]bool `json:"features,omitempty"`
	Source    string          `json:"source"`
	CheckedAt time.Time       `json:"checkedAt"`
}

type EventsListResponse struct {
	SchemaVersion string             `json:"schemaVersion"`
	Events        []EventSummary     `json:"events"`
	Cursor        *string            `json:"cursor"`
	Page          PageInfo           `json:"page"`
	Source        string             `json:"source"`
	CheckedAt     time.Time          `json:"checkedAt"`
	Freshness     MarketFreshness    `json:"freshness"`
	Provenance    UpstreamProvenance `json:"provenance"`
}

type SignalsListResponse struct {
	SchemaVersion string           `json:"schemaVersion"`
	Signals       []SignalEnvelope `json:"signals"`
	Page          PageInfo         `json:"page"`
}
