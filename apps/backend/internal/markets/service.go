package markets

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/gamma"
)

const (
	APIVersion      = "markets-v1-catalog"
	defaultPageSize = 50
	maxPageSize     = 100
)

// CatalogClient fetches normalized Polymarket events from upstream.
type CatalogClient interface {
	ListEvents(ctx context.Context, limit, offset int) ([]gamma.Event, error)
}

// ServiceConfig wires optional upstream catalog dependencies.
type ServiceConfig struct {
	Catalog        CatalogClient
	CatalogEnabled bool
	Now            func() time.Time
}

// Service implements the Polymarket Markets BFF read surface.
type Service struct {
	cfg ServiceConfig
	now func() time.Time
}

func NewService(cfg ServiceConfig) *Service {
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	return &Service{cfg: cfg, now: now}
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
	return CapabilitiesResponse{
		Version: APIVersion,
		Catalog: s.cfg.CatalogEnabled,
		Trading: false,
		Combos:  false,
		Intel:   false,
		Features: map[string]bool{
			"catalog_read": s.cfg.CatalogEnabled,
			"order_submit": false,
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
		return EventsListResponse{
			Events:    []EventSummary{},
			Cursor:    nil,
			Source:    "stub",
			CheckedAt: s.nowUTC(),
		}, nil
	}

	rows, err := s.cfg.Catalog.ListEvents(ctx, limit, offset)
	if err != nil {
		return EventsListResponse{}, err
	}

	events := make([]EventSummary, 0, len(rows))
	for _, row := range rows {
		events = append(events, EventSummary{
			ID:    row.ID,
			Slug:  row.Slug,
			Title: row.Title,
		})
	}

	var next *string
	if len(events) == limit {
		v := strconv.Itoa(offset + limit)
		next = &v
	}

	return EventsListResponse{
		Events:    events,
		Cursor:    next,
		Source:    "gamma",
		CheckedAt: s.nowUTC(),
	}, nil
}

func parseCursor(cursor string) (int, error) {
	cursor = strings.TrimSpace(cursor)
	if cursor == "" {
		return 0, nil
	}
	offset, err := strconv.Atoi(cursor)
	if err != nil || offset < 0 {
		return 0, fmt.Errorf("invalid cursor")
	}
	return offset, nil
}
