package markets

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/gamma"
)

const (
	APIVersion      = "markets-v1-read-1.1.0"
	defaultPageSize = 50
	maxPageSize     = 100
	defaultBookAge  = 10 * time.Second
)

var (
	ErrInvalidArgument     = errors.New("invalid argument")
	ErrNotFound            = errors.New("resource not found")
	ErrUpstreamUnavailable = errors.New("upstream unavailable")
	ErrDataUnavailable     = errors.New("market data unavailable")
)

type CatalogClient interface {
	ListEvents(ctx context.Context, limit, offset int) ([]gamma.Event, error)
	GetEvent(ctx context.Context, eventID string) (gamma.Event, error)
	GetMarket(ctx context.Context, marketID string) (gamma.Market, error)
}

type MarketDataClient interface {
	GetOrderBook(ctx context.Context, tokenID string) (clob.OrderBook, error)
	GetPriceHistory(ctx context.Context, request clob.PriceHistoryRequest) ([]clob.PricePoint, error)
}

type MarketDataProcessor interface {
	BuildSnapshot(marketID string, upstream clob.OrderBook, observedAt time.Time, maxAge time.Duration) (OrderBookSnapshot, error)
	NormalizeHistory(rows []clob.PricePoint) ([]PricePoint, error)
	Health(snapshot OrderBookSnapshot, observedAt time.Time) (MarketHealthSnapshot, error)
}

type SignalReader interface {
	ListSignals(ctx context.Context, marketID, cursor string, limit int) ([]SignalEnvelope, *string, error)
}

type ServiceConfig struct {
	Catalog           CatalogClient
	CatalogEnabled    bool
	MarketData        MarketDataClient
	MarketProcessor   MarketDataProcessor
	MarketDataEnabled bool
	Signals           SignalReader
	Metrics           *Metrics
	BookMaxAge        time.Duration
	Now               func() time.Time
}

type Service struct {
	cfg        ServiceConfig
	now        func() time.Time
	bookMaxAge time.Duration
}

func NewService(cfg ServiceConfig) *Service {
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	bookMaxAge := cfg.BookMaxAge
	if bookMaxAge <= 0 {
		bookMaxAge = defaultBookAge
	}
	return &Service{cfg: cfg, now: now, bookMaxAge: bookMaxAge}
}

func (s *Service) nowUTC() time.Time {
	return s.now().UTC()
}

// Eligibility fails closed until geoblock/upstream checks are wired.
func (s *Service) Eligibility(_ context.Context) EligibilityResponse {
	return EligibilityResponse{
		Eligible:  false,
		Reason:    "markets_platform_not_enabled",
		CheckedAt: s.nowUTC(),
	}
}

func (s *Service) Capabilities(_ context.Context) CapabilitiesResponse {
	source := "stub"
	if s.cfg.CatalogEnabled && s.cfg.Catalog != nil {
		source = "gamma"
	}
	marketDataEnabled := s.cfg.MarketDataEnabled && s.cfg.MarketData != nil && s.cfg.MarketProcessor != nil
	intelligenceEnabled := s.cfg.Signals != nil
	return CapabilitiesResponse{
		Version: APIVersion,
		Catalog: s.cfg.CatalogEnabled && s.cfg.Catalog != nil,
		Trading: false,
		Combos:  false,
		Intel:   intelligenceEnabled,
		Features: map[string]bool{
			"catalog_read":   s.cfg.CatalogEnabled && s.cfg.Catalog != nil,
			"market_detail":  s.cfg.CatalogEnabled && s.cfg.Catalog != nil,
			"orderbook_read": marketDataEnabled,
			"price_history":  marketDataEnabled,
			"market_health":  marketDataEnabled,
			"realtime":       false,
			"signals":        intelligenceEnabled,
			"order_submit":   false,
		},
		CheckedAt: s.nowUTC(),
		Source:    source,
	}
}

func (s *Service) ListEvents(ctx context.Context, cursor string, limit int) (EventsListResponse, error) {
	if limit <= 0 {
		limit = defaultPageSize
	}
	if limit > maxPageSize {
		limit = maxPageSize
	}

	offset, err := parseCursor(cursor)
	if err != nil {
		return EventsListResponse{}, err
	}

	if !s.cfg.CatalogEnabled || s.cfg.Catalog == nil {
		now := s.nowUTC()
		return EventsListResponse{
			SchemaVersion: SchemaVersion,
			Events:        []EventSummary{},
			Cursor:        nil,
			Page:          PageInfo{Limit: limit},
			Source:        "stub",
			CheckedAt:     now,
			Freshness: MarketFreshness{
				State:      FreshnessUnavailable,
				ObservedAt: now,
				Reason:     "catalog_disabled",
			},
			Provenance: UpstreamProvenance{Source: "retropick_projection", ObservedAt: now},
		}, nil
	}

	started := time.Now()
	rows, err := s.cfg.Catalog.ListEvents(ctx, limit, offset)
	s.observeUpstream("gamma", err == nil, time.Since(started))
	if err != nil {
		return EventsListResponse{}, classifyCatalogError(err)
	}

	now := s.nowUTC()
	events := make([]EventSummary, 0, len(rows))
	for _, row := range rows {
		detail, _ := mapGammaEvent(row, now)
		events = append(events, EventSummary{
			SchemaVersion: detail.SchemaVersion,
			ID:            detail.ID,
			UpstreamID:    detail.UpstreamID,
			Slug:          detail.Slug,
			Title:         detail.Title,
			Status:        detail.Status,
			StartAt:       detail.StartAt,
			EndAt:         detail.EndAt,
			MarketCount:   len(detail.Markets),
			Freshness:     detail.Freshness,
			Provenance:    detail.Provenance,
		})
	}

	var next *string
	if len(events) == limit {
		v := strconv.Itoa(offset + limit)
		next = &v
	}

	return EventsListResponse{
		SchemaVersion: SchemaVersion,
		Events:        events,
		Cursor:        next,
		Page:          PageInfo{NextCursor: next, Limit: limit},
		Source:        "gamma",
		CheckedAt:     now,
		Freshness:     MarketFreshness{State: FreshnessFresh, ObservedAt: now},
		Provenance:    UpstreamProvenance{Source: "polymarket_gamma", ObservedAt: now},
	}, nil
}

func (s *Service) GetEvent(ctx context.Context, eventID string) (EventDetail, error) {
	if !s.cfg.CatalogEnabled || s.cfg.Catalog == nil {
		return EventDetail{}, ErrDataUnavailable
	}
	upstream, err := upstreamID(eventID, "event")
	if err != nil {
		return EventDetail{}, err
	}
	started := time.Now()
	row, err := s.cfg.Catalog.GetEvent(ctx, upstream)
	s.observeUpstream("gamma", err == nil, time.Since(started))
	if err != nil {
		return EventDetail{}, classifyCatalogError(err)
	}
	event, _ := mapGammaEvent(row, s.nowUTC())
	return event, nil
}

func (s *Service) GetMarket(ctx context.Context, marketID string) (MarketDetail, error) {
	if !s.cfg.CatalogEnabled || s.cfg.Catalog == nil {
		return MarketDetail{}, ErrDataUnavailable
	}
	upstream, err := upstreamID(marketID, "market")
	if err != nil {
		return MarketDetail{}, err
	}
	started := time.Now()
	row, err := s.cfg.Catalog.GetMarket(ctx, upstream)
	s.observeUpstream("gamma", err == nil, time.Since(started))
	if err != nil {
		return MarketDetail{}, classifyCatalogError(err)
	}
	_, market := mapGammaMarket(row, "", s.nowUTC())
	return market, nil
}

func (s *Service) GetOrderBook(ctx context.Context, marketID, tokenID string) (OrderBookSnapshot, error) {
	if !s.cfg.MarketDataEnabled || s.cfg.MarketData == nil || s.cfg.MarketProcessor == nil {
		return OrderBookSnapshot{}, ErrDataUnavailable
	}
	if strings.TrimSpace(marketID) == "" || len(marketID) > 256 || strings.TrimSpace(tokenID) == "" || len(tokenID) > 256 {
		return OrderBookSnapshot{}, ErrInvalidArgument
	}
	started := time.Now()
	book, err := s.cfg.MarketData.GetOrderBook(ctx, tokenID)
	s.observeUpstream("clob", err == nil, time.Since(started))
	if err != nil {
		return OrderBookSnapshot{}, classifyMarketDataError(err)
	}
	snapshot, err := s.cfg.MarketProcessor.BuildSnapshot(marketID, book, s.nowUTC(), s.bookMaxAge)
	if err != nil {
		return OrderBookSnapshot{}, fmt.Errorf("%w: %v", ErrDataUnavailable, err)
	}
	if s.cfg.Metrics != nil {
		s.cfg.Metrics.RecordBookState(snapshot.Freshness.State)
	}
	return snapshot, nil
}

func (s *Service) GetHistory(ctx context.Context, marketID, tokenID, interval string, fidelity int) (PriceHistoryResponse, error) {
	if !s.cfg.MarketDataEnabled || s.cfg.MarketData == nil || s.cfg.MarketProcessor == nil {
		return PriceHistoryResponse{}, ErrDataUnavailable
	}
	if strings.TrimSpace(marketID) == "" || len(marketID) > 256 || strings.TrimSpace(tokenID) == "" || len(tokenID) > 256 {
		return PriceHistoryResponse{}, ErrInvalidArgument
	}
	if !validHistoryInterval(interval) || fidelity < 1 || fidelity > 1440 {
		return PriceHistoryResponse{}, ErrInvalidArgument
	}
	started := time.Now()
	rows, err := s.cfg.MarketData.GetPriceHistory(ctx, clob.PriceHistoryRequest{
		TokenID:  tokenID,
		Interval: interval,
		Fidelity: fidelity,
	})
	s.observeUpstream("clob", err == nil, time.Since(started))
	if err != nil {
		return PriceHistoryResponse{}, classifyMarketDataError(err)
	}
	points, err := s.cfg.MarketProcessor.NormalizeHistory(rows)
	if err != nil {
		return PriceHistoryResponse{}, fmt.Errorf("%w: %v", ErrDataUnavailable, err)
	}
	now := s.nowUTC()
	return PriceHistoryResponse{
		SchemaVersion: SchemaVersion,
		MarketID:      marketID,
		TokenID:       tokenID,
		Points:        points,
		Freshness:     MarketFreshness{State: FreshnessFresh, ObservedAt: now},
		Provenance:    UpstreamProvenance{Source: "polymarket_clob", UpstreamID: tokenID, ObservedAt: now},
	}, nil
}

func (s *Service) GetHealth(ctx context.Context, marketID, tokenID string) (MarketHealthSnapshot, error) {
	snapshot, err := s.GetOrderBook(ctx, marketID, tokenID)
	if err != nil {
		return MarketHealthSnapshot{}, err
	}
	health, err := s.cfg.MarketProcessor.Health(snapshot, s.nowUTC())
	if err != nil {
		return MarketHealthSnapshot{}, fmt.Errorf("%w: %v", ErrDataUnavailable, err)
	}
	return health, nil
}

func (s *Service) ListSignals(ctx context.Context, marketID, cursor string, limit int) (SignalsListResponse, error) {
	if limit <= 0 {
		limit = defaultPageSize
	}
	if limit > maxPageSize {
		limit = maxPageSize
	}
	if _, err := parseCursor(cursor); err != nil {
		return SignalsListResponse{}, err
	}
	if s.cfg.Signals == nil {
		return SignalsListResponse{
			SchemaVersion: SchemaVersion,
			Signals:       []SignalEnvelope{},
			Page:          PageInfo{Limit: limit},
		}, nil
	}
	rows, next, err := s.cfg.Signals.ListSignals(ctx, marketID, cursor, limit)
	if err != nil {
		return SignalsListResponse{}, fmt.Errorf("%w: signals", ErrDataUnavailable)
	}
	return SignalsListResponse{
		SchemaVersion: SchemaVersion,
		Signals:       rows,
		Page:          PageInfo{NextCursor: next, Limit: limit},
	}, nil
}

func parseCursor(cursor string) (int, error) {
	cursor = strings.TrimSpace(cursor)
	if cursor == "" {
		return 0, nil
	}
	offset, err := strconv.Atoi(cursor)
	if err != nil || offset < 0 {
		return 0, fmt.Errorf("%w: invalid cursor", ErrInvalidArgument)
	}
	return offset, nil
}

func classifyCatalogError(err error) error {
	switch {
	case errors.Is(err, gamma.ErrNotFound):
		return ErrNotFound
	case errors.Is(err, gamma.ErrRateLimited), errors.Is(err, gamma.ErrUpstream), errors.Is(err, gamma.ErrInvalidPayload):
		return fmt.Errorf("%w: catalog", ErrUpstreamUnavailable)
	default:
		return fmt.Errorf("%w: catalog", ErrUpstreamUnavailable)
	}
}

func classifyMarketDataError(err error) error {
	switch {
	case errors.Is(err, clob.ErrNotFound):
		return ErrNotFound
	case errors.Is(err, clob.ErrInvalidRequest):
		return ErrInvalidArgument
	case errors.Is(err, clob.ErrRateLimited), errors.Is(err, clob.ErrUpstream), errors.Is(err, clob.ErrInvalidPayload):
		return fmt.Errorf("%w: clob", ErrUpstreamUnavailable)
	default:
		return fmt.Errorf("%w: clob", ErrUpstreamUnavailable)
	}
}

func validHistoryInterval(value string) bool {
	switch value {
	case "1h", "6h", "1d", "1w", "max":
		return true
	default:
		return false
	}
}

func (s *Service) observeUpstream(upstream string, succeeded bool, duration time.Duration) {
	if s.cfg.Metrics != nil {
		s.cfg.Metrics.ObserveUpstream(upstream, succeeded, duration)
	}
}
