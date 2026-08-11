package orders

import (
	"time"

	"retropick/apps/backend/internal/markets"
)

const SchemaVersion = "1"

const (
	SideBuy  = "BUY"
	SideSell = "SELL"
)

const (
	OrderTypeLimit = "LIMIT"
)

const (
	TimeInForceGTC = "GTC"
	TimeInForceGTD = "GTD"
)

const (
	ExchangeDomainStandard = "standard"
	ExchangeDomainNegRisk  = "neg_risk"
)

const (
	previewTTL         = 5 * time.Minute
	idempotencyTTL     = 24 * time.Hour
	orderStatusOpen    = "open"
	orderStatusUnknown = "unknown"
)

// Exported order status values for reconcile and handlers.
const (
	OrderStatusOpen            = "open"
	OrderStatusPartiallyFilled = "partially_filled"
	OrderStatusFilled          = "filled"
	OrderStatusUnknown         = "unknown"
	OrderStatusNotSubmitted    = "not_submitted"
	OrderStatusCancelPending   = "cancel_pending"
	OrderStatusCanceled        = "canceled"
	OrderStatusRejected        = "rejected"
)

// SubmitRequest is the wire body for POST /markets/orders/submit.
type SubmitRequest struct {
	PreviewID   string `json:"previewId"`
	ContentHash string `json:"contentHash"`
	Signature   string `json:"signature"`
}

// SubmitResponse is the wire body for a successful order submit.
type SubmitResponse struct {
	SchemaVersion string                     `json:"schemaVersion"`
	OrderID       string                     `json:"orderId"`
	VenueOrderID  string                     `json:"venueOrderId,omitempty"`
	Status        string                     `json:"status"`
	ClientOrderID string                     `json:"clientOrderId,omitempty"`
	SubmittedAt   time.Time                  `json:"submittedAt"`
	Provenance    markets.UpstreamProvenance `json:"provenance"`
	Warnings      []string                   `json:"warnings,omitempty"`
}

// CancelRequest is the wire body for POST /markets/orders/{orderId}/cancel.
type CancelRequest struct {
	PreviewID   string `json:"previewId"`
	ContentHash string `json:"contentHash"`
	Signature   string `json:"signature"`
}

// CancelResponse is the wire body for a successful order cancel.
type CancelResponse struct {
	SchemaVersion string                     `json:"schemaVersion"`
	OrderID       string                     `json:"orderId"`
	Status        string                     `json:"status"`
	CanceledAt    *time.Time                 `json:"canceledAt,omitempty"`
	Provenance    markets.UpstreamProvenance `json:"provenance,omitempty"`
}

// CancelPreviewResponse is the wire body for cancel preview.
type CancelPreviewResponse struct {
	SchemaVersion   string                `json:"schemaVersion"`
	PreviewID       string                `json:"previewId"`
	ContentHash     string                `json:"contentHash"`
	ExpiresAt       time.Time             `json:"expiresAt"`
	HumanSummary    CancelHumanSummary    `json:"humanSummary"`
	UnsignedPayload UnsignedCancelPayload `json:"unsignedPayload"`
	OrderID         string                `json:"orderId"`
	Warnings        []string              `json:"warnings,omitempty"`
}

// CancelHumanSummary is client-facing cancel confirmation copy.
type CancelHumanSummary struct {
	Action  string `json:"action"`
	Market  string `json:"market"`
	Outcome string `json:"outcome"`
	Size    string `json:"size"`
	Price   string `json:"price"`
	ChainID int    `json:"chainId"`
}

// UnsignedCancelPayload mirrors CLOB V2 cancel EIP-712 fields.
type UnsignedCancelPayload struct {
	OrderID   string `json:"orderId"`
	Maker     string `json:"maker"`
	TokenID   string `json:"tokenId"`
	Salt      string `json:"salt"`
	Timestamp string `json:"timestamp"`
}

// OrdersListResponse is GET /markets/me/orders.
type OrdersListResponse struct {
	SchemaVersion string                     `json:"schemaVersion"`
	Orders        []UserOrder                `json:"orders"`
	Page          markets.PageInfo           `json:"page"`
	CheckedAt     time.Time                  `json:"checkedAt"`
	Provenance    markets.UpstreamProvenance `json:"provenance"`
	Freshness     *markets.MarketFreshness   `json:"freshness,omitempty"`
}

// UserOrder is a single order projection in list responses.
type UserOrder struct {
	OrderID        string    `json:"orderId"`
	VenueOrderID   string    `json:"venueOrderId,omitempty"`
	MarketID       string    `json:"marketId"`
	TokenID        string    `json:"tokenId"`
	Side           string    `json:"side"`
	Price          string    `json:"price"`
	OriginalSize   string    `json:"originalSize"`
	FilledSize     string    `json:"filledSize"`
	RemainingSize  string    `json:"remainingSize"`
	Status         string    `json:"status"`
	ExchangeDomain string    `json:"exchangeDomain"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// FillsListResponse is GET /markets/me/fills.
type FillsListResponse struct {
	SchemaVersion string           `json:"schemaVersion"`
	Fills         []UserFill       `json:"fills"`
	Page          markets.PageInfo `json:"page"`
	CheckedAt     time.Time        `json:"checkedAt"`
}

// MoneyAmount is fixed-point money (never float).
type MoneyAmount struct {
	Amount   string `json:"amount"`
	Currency string `json:"currency"`
	Decimals int    `json:"decimals"`
}

// UserFill is a single fill projection in list responses.
type UserFill struct {
	FillID       string                     `json:"fillId"`
	OrderID      string                     `json:"orderId"`
	VenueTradeID string                     `json:"venueTradeId"`
	MarketID     string                     `json:"marketId"`
	TokenID      string                     `json:"tokenId"`
	Side         string                     `json:"side"`
	Price        string                     `json:"price"`
	Size         string                     `json:"size"`
	Fee          MoneyAmount                `json:"fee"`
	FilledAt     time.Time                  `json:"filledAt"`
	Provenance   markets.UpstreamProvenance `json:"provenance"`
}

// PreviewRequest is the wire body for POST /markets/orders/preview.
type PreviewRequest struct {
	MarketID       string `json:"marketId"`
	TokenID        string `json:"tokenId"`
	Side           string `json:"side"`
	Price          string `json:"price"`
	Size           string `json:"size"`
	OrderType      string `json:"orderType"`
	TimeInForce    string `json:"timeInForce,omitempty"`
	MakerAddress   string `json:"makerAddress"`
	IdempotencyKey string `json:"idempotencyKey,omitempty"`
}

// HumanSummary is client-facing confirmation copy.
type HumanSummary struct {
	Action       string `json:"action"`
	Market       string `json:"market"`
	Outcome      string `json:"outcome"`
	Size         string `json:"size"`
	Price        string `json:"price"`
	EstimatedFee string `json:"estimatedFee,omitempty"`
	ChainID      int    `json:"chainId"`
}

// UnsignedOrderPayload mirrors CLOB V2 EIP-712 order fields (EV-001).
type UnsignedOrderPayload struct {
	Salt          string `json:"salt"`
	Maker         string `json:"maker"`
	Signer        string `json:"signer"`
	TokenID       string `json:"tokenId"`
	MakerAmount   string `json:"makerAmount"`
	TakerAmount   string `json:"takerAmount"`
	Side          int    `json:"side"`
	SignatureType int    `json:"signatureType"`
	Timestamp     string `json:"timestamp"`
	Metadata      string `json:"metadata"`
	Builder       string `json:"builder"`
}

// PreviewResponse is the wire body for a successful preview.
type PreviewResponse struct {
	SchemaVersion   string               `json:"schemaVersion"`
	PreviewID       string               `json:"previewId"`
	ContentHash     string               `json:"contentHash"`
	ExpiresAt       time.Time            `json:"expiresAt"`
	HumanSummary    HumanSummary         `json:"humanSummary"`
	UnsignedPayload UnsignedOrderPayload `json:"unsignedPayload"`
	ExchangeDomain  string               `json:"exchangeDomain"`
	Warnings        []string             `json:"warnings,omitempty"`
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

// previewRecord stores issued previews for submit binding (in-memory TTL v1).
type previewRecord struct {
	PreviewID       string
	UserID          string
	ContentHash     string
	ExpiresAt       time.Time
	UnsignedPayload UnsignedOrderPayload
	Metadata        hashMetadata
	Side            string
	Price           string
	Size            string
	ExchangeDomain  string
}

type hashMetadata struct {
	ChainID  int    `json:"chainId"`
	MarketID string `json:"marketId"`
	TokenID  string `json:"tokenId"`
}
