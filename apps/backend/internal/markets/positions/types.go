package positions

import (
	"time"

	"retropick/apps/backend/internal/markets"
)

const SchemaVersion = "1"

const upstreamSourceDataAPI = "polymarket_data_api"

// SyncStatus describes projection alignment with venue truth.
type SyncStatus string

const (
	SyncStatusSynced      SyncStatus = "synced"
	SyncStatusUpdating    SyncStatus = "updating"
	SyncStatusReconciling SyncStatus = "reconciling"
)

func (s SyncStatus) Valid() bool {
	switch s {
	case SyncStatusSynced, SyncStatusUpdating, SyncStatusReconciling:
		return true
	default:
		return false
	}
}

// PositionRecord is the internal projection for one outcome token holding.
type PositionRecord struct {
	PositionID    string
	UserID        string
	AccountWallet string
	TokenID       string
	MarketID      string
	ConditionID   string
	OutcomeLabel  string
	Size          string
	AvgPrice      string
	// Economics values are last-known fixed-point values. The corresponding
	// Observed flags report coverage in the latest accepted source snapshot.
	MarkPrice               string
	MarkPriceObserved       bool
	CostBasisAmount         string
	CostBasisObserved       bool
	UnrealizedPnL           string
	UnrealizedPnLObserved   bool
	RealizedPnL             string
	RealizedPnLObserved     bool
	Redeemable              bool
	RedeemableObserved      bool
	ClaimableAmount         string
	ClaimableAmountObserved bool
	SyncStatus              SyncStatus
	UpstreamSource          string
	UpstreamID              string
	ObservedAt              time.Time
	UpdatedAt               time.Time
}

// UserPosition is the wire shape for one position row.
type UserPosition struct {
	PositionID   string                     `json:"positionId"`
	MarketID     string                     `json:"marketId,omitempty"`
	TokenID      string                     `json:"tokenId"`
	OutcomeLabel string                     `json:"outcomeLabel,omitempty"`
	Size         markets.DecimalString      `json:"size"`
	AvgPrice     *markets.DecimalString     `json:"avgPrice,omitempty"`
	SyncStatus   SyncStatus                 `json:"syncStatus"`
	Provenance   markets.UpstreamProvenance `json:"provenance"`
}

// PositionsListResponse is the wire shape for GET /markets/me/positions.
type PositionsListResponse struct {
	SchemaVersion string                     `json:"schemaVersion"`
	SignerAddress string                     `json:"signerAddress"`
	AccountWallet string                     `json:"accountWallet"`
	Positions     []UserPosition             `json:"positions"`
	CheckedAt     time.Time                  `json:"checkedAt"`
	SyncStatus    SyncStatus                 `json:"syncStatus"`
	Provenance    markets.UpstreamProvenance `json:"provenance"`
	Freshness     *markets.MarketFreshness   `json:"freshness,omitempty"`
}

// APIError is the Markets error envelope fragment.
type APIError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId,omitempty"`
}

// ErrorResponse wraps APIError for JSON responses.
type ErrorResponse struct {
	Error APIError `json:"error"`
}

// FillSnapshot is a minimal fill row for optional local seeding.
type FillSnapshot struct {
	TokenID  string
	MarketID string
	Side     string
	Size     string
}
