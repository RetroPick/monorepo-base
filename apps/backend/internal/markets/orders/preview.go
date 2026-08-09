package orders

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/wallet"
)

const polygonChainID = 137

// TokenCatalog validates market/token pairs against the catalog projection.
type TokenCatalog interface {
	ValidateToken(ctx context.Context, marketID, tokenID string) error
}

// MarketCatalog loads market metadata for preview summaries.
type MarketCatalog interface {
	GetMarket(ctx context.Context, marketID string) (markets.MarketDetail, error)
}

// BookConstraints loads CLOB tick/min constraints.
type BookConstraints interface {
	GetOrderBook(ctx context.Context, tokenID string) (clob.OrderBook, error)
}

// Recorder counts preview metrics.
type Recorder interface {
	RecordOrderPreview(success bool)
}

type NopRecorder struct{}

func (NopRecorder) RecordOrderPreview(bool) {}

// ServiceConfig wires order preview dependencies.
type ServiceConfig struct {
	Discoverer   *wallet.Discoverer
	Tokens       TokenCatalog
	Markets      MarketCatalog
	Books        BookConstraints
	BuilderCode  string
	Store        *PreviewStore
	CancelStore  *CancelPreviewStore
	Projections  *ProjectionStore
	Metrics      Recorder
	Now          func() time.Time
	SaltFn       func() (string, error)
	Submit       SubmitConfig
	Cancel       CancelConfig
}

// Service assembles order previews fail-closed.
type Service struct {
	discoverer   *wallet.Discoverer
	tokens       TokenCatalog
	markets      MarketCatalog
	books        BookConstraints
	builderCode  string
	store        *PreviewStore
	cancelStore  *CancelPreviewStore
	projections  *ProjectionStore
	metrics      Recorder
	now          func() time.Time
	saltFn       func() (string, error)
	submit       Submit
	cancel       cancelService
}

// NewService builds a preview service.
func NewService(cfg ServiceConfig) *Service {
	disc := cfg.Discoverer
	if disc == nil {
		disc = wallet.DefaultDiscoverer()
	}
	store := cfg.Store
	if store == nil {
		store = NewPreviewStore()
	}
	cancelStore := cfg.CancelStore
	if cancelStore == nil {
		cancelStore = NewCancelPreviewStore()
	}
	projections := cfg.Projections
	if projections == nil {
		projections = NewProjectionStore()
	}
	if cfg.Now != nil {
		store.now = cfg.Now
		cancelStore.now = cfg.Now
		projections.now = cfg.Now
	}
	metrics := cfg.Metrics
	if metrics == nil {
		metrics = NopRecorder{}
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	saltFn := cfg.SaltFn
	if saltFn == nil {
		saltFn = randomSalt
	}
	builder := strings.TrimSpace(cfg.BuilderCode)
	if builder == "" {
		builder = strings.TrimSpace(os.Getenv("MARKETS_BUILDER_CODE"))
	}
	submit := newSubmit(cfg.Submit)
	cancel := newCancel(cfg.Cancel)
	if now != nil {
		submit.idempotency.now = now
		cancel.idempotency.now = now
	}
	return &Service{
		discoverer:  disc,
		tokens:      cfg.Tokens,
		markets:     cfg.Markets,
		books:       cfg.Books,
		builderCode: normalizeBuilderCode(builder),
		store:       store,
		cancelStore: cancelStore,
		projections: projections,
		metrics:     metrics,
		now:         now,
		saltFn:      saltFn,
		submit:      submit,
		cancel:      cancel,
	}
}

// Preview assembles a limit order preview for an authenticated session.
func (s *Service) Preview(ctx context.Context, session wallet.SessionContext, req PreviewRequest) (PreviewResponse, error) {
	if err := s.validateSession(session); err != nil {
		return PreviewResponse{}, err
	}
	if err := s.validateRequest(req); err != nil {
		return PreviewResponse{}, err
	}

	walletsResp, err := s.discoverer.ListWallets(ctx, session)
	if err != nil {
		return PreviewResponse{}, err
	}
	if !makerLinked(walletsResp.Wallets, req.MakerAddress) {
		return PreviewResponse{}, ErrMakerNotLinked
	}

	if s.tokens != nil {
		if err := s.tokens.ValidateToken(ctx, req.MarketID, req.TokenID); err != nil {
			return PreviewResponse{}, mapTokenErr(err)
		}
	}

	marketDetail, outcomeName, err := s.loadMarketOutcome(ctx, req.MarketID, req.TokenID)
	if err != nil {
		return PreviewResponse{}, err
	}

	warnings := []string{}
	var clobNegRisk *bool
	if s.books != nil {
		book, bookErr := s.books.GetOrderBook(ctx, req.TokenID)
		if bookErr != nil {
			return PreviewResponse{}, ErrUpstreamUnavailable
		}
		negRisk := book.NegRisk
		clobNegRisk = &negRisk
		if err := validateTickSize(req.Price, book.TickSize); err != nil {
			return PreviewResponse{}, err
		}
		if err := validateMinSize(req.Size, book.MinOrderSize); err != nil {
			return PreviewResponse{}, err
		}
	} else {
		warnings = append(warnings, "clob_constraints_unavailable")
	}

	routing, err := SelectExchangeDomain(ExchangeRoutingInput{
		ClobNegRisk:    clobNegRisk,
		CatalogNegRisk: marketDetail.Capabilities.NegRisk,
	})
	if err != nil {
		return PreviewResponse{}, err
	}
	exchangeDomain := routing.Domain
	warnings = append(warnings, routing.Warnings...)

	makerAmount, takerAmount, err := computeAmounts(req.Side, req.Price, req.Size)
	if err != nil {
		return PreviewResponse{}, fmt.Errorf("%w: %v", ErrInvalidRequest, err)
	}

	salt, err := s.saltFn()
	if err != nil {
		return PreviewResponse{}, err
	}
	ts := s.now().UTC()
	sideInt := 0
	if strings.EqualFold(req.Side, SideSell) {
		sideInt = 1
	}
	sigType := signatureTypeFor(walletsResp.Wallets, req.MakerAddress, session.SignerAddress)

	payload := UnsignedOrderPayload{
		Salt:          salt,
		Maker:         strings.ToLower(req.MakerAddress),
		Signer:        session.SignerAddress,
		TokenID:       req.TokenID,
		MakerAmount:   makerAmount.String(),
		TakerAmount:   takerAmount.String(),
		Side:          sideInt,
		SignatureType: sigType,
		Timestamp:     fmt.Sprintf("%d", ts.UnixMilli()),
		Metadata:      "",
		Builder:       s.builderCode,
	}

	meta := hashMetadata{
		ChainID:  polygonChainID,
		MarketID: req.MarketID,
		TokenID:  req.TokenID,
	}
	contentHash, err := ComputeContentHash(payload, meta)
	if err != nil {
		return PreviewResponse{}, err
	}

	previewID := uuid.NewString()
	expiresAt := ts.Add(previewTTL)
	s.store.Put(previewRecord{
		PreviewID:       previewID,
		UserID:          session.UserID,
		ContentHash:     contentHash,
		ExpiresAt:       expiresAt,
		UnsignedPayload: payload,
		Metadata:        meta,
		Side:            req.Side,
		Price:           req.Price,
		Size:            req.Size,
		ExchangeDomain:  exchangeDomain,
	})

	sizeLabel := req.Size + " USDC"
	if strings.EqualFold(req.Side, SideSell) {
		sizeLabel = req.Size + " shares"
	}

	resp := PreviewResponse{
		SchemaVersion: SchemaVersion,
		PreviewID:     previewID,
		ContentHash:   contentHash,
		ExpiresAt:     expiresAt,
		HumanSummary: HumanSummary{
			Action:  strings.ToUpper(req.Side),
			Market:  marketDetail.Question,
			Outcome: outcomeName,
			Size:    sizeLabel,
			Price:   req.Price,
			ChainID: polygonChainID,
		},
		UnsignedPayload: payload,
		ExchangeDomain:  exchangeDomain,
		Warnings:        warnings,
	}
	s.metrics.RecordOrderPreview(true)
	return resp, nil
}

// Projections returns the in-memory order/fill projection store.
func (s *Service) Projections() *ProjectionStore {
	return s.projections
}

func (s *Service) validateSession(session wallet.SessionContext) error {
	if strings.TrimSpace(session.UserID) == "" || strings.TrimSpace(session.SignerAddress) == "" {
		return ErrUnauthorized
	}
	return nil
}

func (s *Service) validateRequest(req PreviewRequest) error {
	req.MarketID = strings.TrimSpace(req.MarketID)
	req.TokenID = strings.TrimSpace(req.TokenID)
	req.MakerAddress = strings.ToLower(strings.TrimSpace(req.MakerAddress))
	if req.MarketID == "" || req.TokenID == "" || req.MakerAddress == "" {
		return ErrInvalidRequest
	}
	if !strings.HasPrefix(req.MakerAddress, "0x") || len(req.MakerAddress) != 42 {
		return ErrInvalidRequest
	}
	if req.OrderType != "" && req.OrderType != OrderTypeLimit {
		return ErrInvalidRequest
	}
	if req.TimeInForce != "" && req.TimeInForce != TimeInForceGTC && req.TimeInForce != TimeInForceGTD {
		return ErrInvalidRequest
	}
	if !strings.EqualFold(req.Side, SideBuy) && !strings.EqualFold(req.Side, SideSell) {
		return ErrInvalidRequest
	}
	if err := validateDecimalString(req.Price); err != nil {
		return ErrInvalidRequest
	}
	if err := validateDecimalString(req.Size); err != nil {
		return ErrInvalidRequest
	}
	return nil
}

func (s *Service) loadMarketOutcome(ctx context.Context, marketID, tokenID string) (markets.MarketDetail, string, error) {
	if s.markets == nil {
		return markets.MarketDetail{Question: marketID}, tokenID, nil
	}
	detail, err := s.markets.GetMarket(ctx, marketID)
	if err != nil {
		if err == markets.ErrNotFound {
			return markets.MarketDetail{}, "", ErrMarketNotFound
		}
		return markets.MarketDetail{}, "", err
	}
	for _, o := range detail.Outcomes {
		if o.UpstreamID == tokenID || o.ID == tokenID {
			name := o.Name
			if name == "" {
				name = tokenID
			}
			return detail, name, nil
		}
	}
	return detail, tokenID, nil
}

func makerLinked(wallets []wallet.LinkedWallet, maker string) bool {
	maker = strings.ToLower(strings.TrimSpace(maker))
	for _, w := range wallets {
		if strings.ToLower(w.AccountWallet) == maker && w.LinkStatus == wallet.LinkStatusLinked {
			return true
		}
	}
	return false
}

func signatureTypeFor(wallets []wallet.LinkedWallet, maker, signer string) int {
	maker = strings.ToLower(maker)
	signer = strings.ToLower(signer)
	if maker == signer {
		return 0
	}
	for _, w := range wallets {
		if strings.ToLower(w.AccountWallet) == maker {
			switch w.WalletType {
			case wallet.WalletTypePolyProxy, wallet.WalletTypeGnosisSafe, wallet.WalletTypeDepositWallet:
				return 2
			default:
				return 0
			}
		}
	}
	return 0
}

func mapTokenErr(err error) error {
	if err == nil {
		return nil
	}
	msg := err.Error()
	if strings.Contains(msg, "not in catalog") {
		return ErrTokenNotInCatalog
	}
	return err
}

func normalizeBuilderCode(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return strings.Repeat("0", 64)
	}
	raw = strings.TrimPrefix(raw, "0x")
	if len(raw) > 64 {
		raw = raw[:64]
	}
	return strings.Repeat("0", 64-len(raw)) + strings.ToLower(raw)
}

func randomSalt() (string, error) {
	var buf [32]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", err
	}
	return fmt.Sprintf("%d", binary.BigEndian.Uint64(buf[:8])), nil
}
