package wallet

import "time"

const SchemaVersion = "1"

const PolygonChainID = 137

// WalletType mirrors Polymarket wallet types (EV-009).
type WalletType string

const (
	WalletTypeEOA           WalletType = "EOA"
	WalletTypePolyProxy     WalletType = "POLY_PROXY"
	WalletTypeGnosisSafe    WalletType = "GNOSIS_SAFE"
	WalletTypeDepositWallet WalletType = "DEPOSIT_WALLET"
)

// LinkStatus is the stable API-facing linkage state for a trading wallet.
type LinkStatus string

const (
	LinkStatusLinked              LinkStatus = "linked"
	LinkStatusPendingVerification LinkStatus = "pending_verification"
)

// LinkedWallet is one Polymarket account wallet bound to the session signer.
type LinkedWallet struct {
	AccountWallet string     `json:"accountWallet"`
	WalletType    WalletType `json:"walletType"`
	LinkStatus    LinkStatus `json:"linkStatus"`
	IsPrimary     bool       `json:"isPrimary"`
	ChainID       int        `json:"chainId"`
}

// WalletsListResponse is the wire shape for GET /markets/me/wallets (listMyWallets).
type WalletsListResponse struct {
	SchemaVersion string         `json:"schemaVersion"`
	SignerAddress string         `json:"signerAddress"`
	Wallets       []LinkedWallet `json:"wallets"`
	CheckedAt     time.Time      `json:"checkedAt"`
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
