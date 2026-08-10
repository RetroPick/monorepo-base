package balances

import (
	"time"

	"retropick/apps/backend/internal/markets"
)

const SchemaVersion = "1"

const (
	CollateralCurrency  = "pUSD"
	CollateralDecimals  = 6
)

// MoneyAmount is fixed-point money as integer base units (OpenAPI MoneyAmount).
type MoneyAmount struct {
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
	Decimals int    `json:"decimals"`
}

// BalancesListResponse is the wire shape for GET /markets/me/balances (listMyBalances).
type BalancesListResponse struct {
	SchemaVersion   string                    `json:"schemaVersion"`
	SignerAddress   string                    `json:"signerAddress"`
	AccountWallet   string                    `json:"accountWallet"`
	Collateral      MoneyAmount               `json:"collateral"`
	CheckedAt       time.Time                 `json:"checkedAt"`
	Provenance      markets.UpstreamProvenance `json:"provenance"`
	Freshness       *markets.MarketFreshness  `json:"freshness,omitempty"`
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
