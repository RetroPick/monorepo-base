package wallet

import (
	"context"
	"strings"
)

// AccountWalletAction describes the intended account-wallet operation.
type AccountWalletAction string

const (
	ActionLinkExisting         AccountWalletAction = "link_existing"
	ActionDeployDepositWallet  AccountWalletAction = "deploy_deposit_wallet"
)

// LinkExistingRequest is the body for POST /me/wallets/link.
type LinkExistingRequest struct {
	AccountWallet    string     `json:"accountWallet"`
	WalletType       WalletType `json:"walletType"`
	LinkStatus       LinkStatus `json:"linkStatus,omitempty"`
	IsPrimary        *bool      `json:"isPrimary,omitempty"`
	ChainID          int        `json:"chainId,omitempty"`
	LinkageProofHash string     `json:"linkageProofHash,omitempty"`
}

// AccountWalletPreviewRequest is the body for POST /account-wallet/preview.
type AccountWalletPreviewRequest struct {
	Action AccountWalletAction `json:"action"`
}

// AccountWalletPreviewResponse is returned by POST /account-wallet/preview.
type AccountWalletPreviewResponse struct {
	SchemaVersion string              `json:"schemaVersion"`
	SignerAddress string              `json:"signerAddress"`
	Action        AccountWalletAction `json:"action"`
	ChainID       int                 `json:"chainId"`
	Message       string              `json:"message"`
}

// AccountWalletRelayRequest is the body for POST /account-wallet/relay.
type AccountWalletRelayRequest struct {
	AccountWallet    string `json:"accountWallet"`
	ChainID          int    `json:"chainId,omitempty"`
	IsPrimary        *bool  `json:"isPrimary,omitempty"`
	LinkageProofHash string `json:"linkageProofHash,omitempty"`
}

// AccountWalletRelayResponse is returned by POST /account-wallet/relay.
type AccountWalletRelayResponse struct {
	SchemaVersion string       `json:"schemaVersion"`
	SignerAddress string       `json:"signerAddress"`
	Wallet        LinkedWallet `json:"wallet"`
}

// Linker coordinates validated linkage writes.
type Linker struct {
	Writer AccountLinker
}

// NewLinker returns a linker backed by the given writer.
func NewLinker(writer AccountLinker) *Linker {
	return &Linker{Writer: writer}
}

// LinkExisting persists a connect-existing account wallet binding.
func (l *Linker) LinkExisting(ctx context.Context, session SessionContext, req LinkExistingRequest) (LinkedWallet, error) {
	if l == nil || l.Writer == nil {
		return LinkedWallet{}, ErrLinkerUnwired
	}
	if strings.TrimSpace(session.UserID) == "" {
		return LinkedWallet{}, ErrUnauthorized
	}
	signer, err := normalizeAddress(session.SignerAddress)
	if err != nil {
		return LinkedWallet{}, err
	}
	if strings.TrimSpace(string(req.WalletType)) == "" {
		return LinkedWallet{}, ErrInvalidRequest
	}
	isPrimary := true
	if req.IsPrimary != nil {
		isPrimary = *req.IsPrimary
	}
	row, err := l.Writer.UpsertLink(ctx, LinkRecord{
		UserID:           session.UserID,
		SignerAddress:    signer,
		AccountWallet:    req.AccountWallet,
		WalletType:       req.WalletType,
		LinkStatus:       req.LinkStatus,
		IsPrimary:        isPrimary,
		ChainID:          req.ChainID,
		LinkageProofHash: req.LinkageProofHash,
	})
	if err != nil {
		return LinkedWallet{}, err
	}
	return linkedAccountToWallet(row), nil
}

// PreviewAccountWallet returns metadata for the requested account-wallet action.
func (l *Linker) PreviewAccountWallet(session SessionContext, req AccountWalletPreviewRequest) (AccountWalletPreviewResponse, error) {
	if strings.TrimSpace(session.UserID) == "" {
		return AccountWalletPreviewResponse{}, ErrUnauthorized
	}
	signer, err := normalizeAddress(session.SignerAddress)
	if err != nil {
		return AccountWalletPreviewResponse{}, err
	}
	action := req.Action
	if action == "" {
		action = ActionDeployDepositWallet
	}
	switch action {
	case ActionLinkExisting, ActionDeployDepositWallet:
	default:
		return AccountWalletPreviewResponse{}, ErrInvalidRequest
	}
	msg := "Sign and deploy Deposit Wallet via upstream relayer; BFF persists the deployed address on relay."
	if action == ActionLinkExisting {
		msg = "Provide your Polymarket account wallet address; BFF persists linkage after verification."
	}
	return AccountWalletPreviewResponse{
		SchemaVersion: SchemaVersion,
		SignerAddress: signer,
		Action:        action,
		ChainID:       PolygonChainID,
		Message:       msg,
	}, nil
}

// RelayAccountWallet persists a deployed Deposit Wallet address from the client relay step.
func (l *Linker) RelayAccountWallet(ctx context.Context, session SessionContext, req AccountWalletRelayRequest) (AccountWalletRelayResponse, error) {
	if l == nil || l.Writer == nil {
		return AccountWalletRelayResponse{}, ErrLinkerUnwired
	}
	if strings.TrimSpace(session.UserID) == "" {
		return AccountWalletRelayResponse{}, ErrUnauthorized
	}
	signer, err := normalizeAddress(session.SignerAddress)
	if err != nil {
		return AccountWalletRelayResponse{}, err
	}
	isPrimary := true
	if req.IsPrimary != nil {
		isPrimary = *req.IsPrimary
	}
	row, err := l.Writer.UpsertLink(ctx, LinkRecord{
		UserID:           session.UserID,
		SignerAddress:    signer,
		AccountWallet:    req.AccountWallet,
		WalletType:       WalletTypeDepositWallet,
		LinkStatus:       LinkStatusLinked,
		IsPrimary:        isPrimary,
		ChainID:          req.ChainID,
		LinkageProofHash: req.LinkageProofHash,
	})
	if err != nil {
		return AccountWalletRelayResponse{}, err
	}
	return AccountWalletRelayResponse{
		SchemaVersion: SchemaVersion,
		SignerAddress: signer,
		Wallet:        linkedAccountToWallet(row),
	}, nil
}

func linkedAccountToWallet(row LinkedAccount) LinkedWallet {
	wt := row.WalletType
	if wt == "" {
		wt = WalletTypeDepositWallet
	}
	ls := row.LinkStatus
	if ls == "" {
		ls = LinkStatusLinked
	}
	chainID := row.ChainID
	if chainID == 0 {
		chainID = PolygonChainID
	}
	return LinkedWallet{
		AccountWallet: row.AccountWallet,
		WalletType:    wt,
		LinkStatus:    ls,
		IsPrimary:     row.IsPrimary,
		ChainID:       chainID,
	}
}
