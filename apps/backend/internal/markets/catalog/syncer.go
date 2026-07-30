package catalog

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/gamma"
)

const (
	defaultPageSize = 50
	maxPageSize     = 100
	defaultMaxPages = 1
	maxPages        = 1000
	rawRetention    = 7 * 24 * time.Hour
)

type Source interface {
	ListEvents(ctx context.Context, limit, offset int) ([]gamma.Event, error)
}

type Store interface {
	ApplyPage(ctx context.Context, page Page) error
}

type SyncerConfig struct {
	Source Source
	Store  Store
	Now    func() time.Time
}

type Syncer struct {
	source Source
	store  Store
	now    func() time.Time
}

type RunOptions struct {
	PageSize    int
	MaxPages    int
	StartOffset int
}

type Result struct {
	Pages        int
	Events       int
	Markets      int
	LimitReached bool
}

type Checkpoint struct {
	Source        string
	Stream        string
	Cursor        string
	HighWatermark time.Time
	LastSuccessAt time.Time
}

type RawEvent struct {
	Source          string
	UpstreamEventID string
	EntityType      string
	EntityID        string
	SchemaVersion   string
	Payload         json.RawMessage
	ObservedAt      time.Time
	ExpiresAt       time.Time
}

type Page struct {
	Events     []markets.EventDetail
	Markets    []markets.MarketDetail
	RawEvents  []RawEvent
	Checkpoint Checkpoint
}

type MappedEvent struct {
	Event   markets.EventDetail
	Markets []markets.MarketDetail
}

func NewSyncer(cfg SyncerConfig) (*Syncer, error) {
	if cfg.Source == nil {
		return nil, fmt.Errorf("catalog syncer: source is required")
	}
	if cfg.Store == nil {
		return nil, fmt.Errorf("catalog syncer: store is required")
	}
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	return &Syncer{source: cfg.Source, store: cfg.Store, now: now}, nil
}

func (s *Syncer) Run(ctx context.Context, options RunOptions) (Result, error) {
	if options.PageSize == 0 {
		options.PageSize = defaultPageSize
	}
	if options.MaxPages == 0 {
		options.MaxPages = defaultMaxPages
	}
	if options.PageSize < 1 || options.PageSize > maxPageSize {
		return Result{}, fmt.Errorf("catalog syncer: page size must be between 1 and %d", maxPageSize)
	}
	if options.MaxPages < 1 || options.MaxPages > maxPages {
		return Result{}, fmt.Errorf("catalog syncer: max pages must be between 1 and %d", maxPages)
	}
	if options.StartOffset < 0 {
		return Result{}, fmt.Errorf("catalog syncer: start offset must be non-negative")
	}

	offset := options.StartOffset
	var result Result
	for pageIndex := 0; pageIndex < options.MaxPages; pageIndex++ {
		rows, err := s.source.ListEvents(ctx, options.PageSize, offset)
		if err != nil {
			return result, fmt.Errorf("catalog syncer: list events: %w", err)
		}
		if len(rows) == 0 {
			return result, nil
		}

		observedAt := s.now().UTC()
		page := Page{
			Events:    make([]markets.EventDetail, 0, len(rows)),
			Markets:   make([]markets.MarketDetail, 0),
			RawEvents: make([]RawEvent, 0, len(rows)),
		}
		var highWatermark time.Time
		for _, row := range rows {
			mapped := MapEvent(row, observedAt)
			page.Events = append(page.Events, mapped.Event)
			page.Markets = append(page.Markets, mapped.Markets...)

			payload, err := json.Marshal(row)
			if err != nil {
				return result, fmt.Errorf("catalog syncer: marshal event %s: %w", row.ID, err)
			}
			contentHash := hashBytes(payload)
			page.RawEvents = append(page.RawEvents, RawEvent{
				Source:          "polymarket_gamma",
				UpstreamEventID: row.ID + ":" + contentHash,
				EntityType:      "event",
				EntityID:        mapped.Event.ID,
				SchemaVersion:   markets.SchemaVersion,
				Payload:         payload,
				ObservedAt:      observedAt,
				ExpiresAt:       observedAt.Add(rawRetention),
			})
			if row.UpdatedAt != nil && row.UpdatedAt.After(highWatermark) {
				highWatermark = row.UpdatedAt.UTC()
			}
		}

		offset += len(rows)
		page.Checkpoint = Checkpoint{
			Source:        "polymarket_gamma",
			Stream:        "events",
			Cursor:        strconv.Itoa(offset),
			HighWatermark: highWatermark,
			LastSuccessAt: observedAt,
		}
		if err := s.store.ApplyPage(ctx, page); err != nil {
			return result, fmt.Errorf("catalog syncer: apply page: %w", err)
		}

		result.Pages++
		result.Events += len(page.Events)
		result.Markets += len(page.Markets)
		if len(rows) < options.PageSize {
			return result, nil
		}
	}
	result.LimitReached = true
	return result, nil
}

func MapEvent(row gamma.Event, observedAt time.Time) MappedEvent {
	observedAt = observedAt.UTC()
	eventID := canonicalID("event", row.ID)
	provenance := markets.UpstreamProvenance{
		Source:          "polymarket_gamma",
		UpstreamID:      row.ID,
		ObservedAt:      observedAt,
		UpstreamUpdated: utcTime(row.UpdatedAt),
	}
	freshness := markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: observedAt,
	}

	summaries := make([]markets.MarketSummary, 0, len(row.Markets))
	details := make([]markets.MarketDetail, 0, len(row.Markets))
	for _, market := range row.Markets {
		marketID := canonicalID("market", market.ID)
		outcomes := make([]markets.Outcome, 0, len(market.Outcomes))
		for index, outcome := range market.Outcomes {
			outcomeID := canonicalID("token", outcome.TokenID)
			if outcome.TokenID == "" {
				outcomeID = fmt.Sprintf("polymarket:outcome:%s:%d", market.ID, index)
			}
			var price *markets.DecimalString
			if outcome.Price != "" {
				value, err := markets.ParseDecimalString(outcome.Price)
				if err == nil {
					price = &value
				}
			}
			outcomes = append(outcomes, markets.Outcome{
				ID:         outcomeID,
				UpstreamID: outcome.TokenID,
				Name:       outcome.Name,
				Price:      price,
			})
		}
		marketProvenance := markets.UpstreamProvenance{
			Source:          "polymarket_gamma",
			UpstreamID:      market.ID,
			ObservedAt:      observedAt,
			UpstreamUpdated: utcTime(market.UpdatedAt),
		}
		capabilities := markets.MarketCapability{
			OrderBook: market.EnableOrderBook && hasTokenIDs(market.Outcomes),
			History:   market.EnableOrderBook && hasTokenIDs(market.Outcomes),
			Realtime:  market.EnableOrderBook && hasTokenIDs(market.Outcomes),
			NegRisk:   market.NegRisk,
			Trading:   false,
		}
		summary := markets.MarketSummary{
			SchemaVersion: markets.SchemaVersion,
			ID:            marketID,
			UpstreamID:    market.ID,
			ConditionID:   market.ConditionID,
			Slug:          market.Slug,
			Question:      market.Question,
			Status:        mapStatus(market.Active, market.Closed, market.Archived),
			EndAt:         utcTime(market.EndDate),
			Outcomes:      outcomes,
			Capabilities:  capabilities,
			Freshness:     freshness,
			Provenance:    marketProvenance,
		}
		summaries = append(summaries, summary)

		ruleHash := hashRule(market.Description, market.ResolutionSource)
		details = append(details, markets.MarketDetail{
			SchemaVersion: summary.SchemaVersion,
			ID:            summary.ID,
			UpstreamID:    summary.UpstreamID,
			EventID:       eventID,
			ConditionID:   summary.ConditionID,
			Slug:          summary.Slug,
			Question:      summary.Question,
			Description:   market.Description,
			Status:        summary.Status,
			EndAt:         summary.EndAt,
			Outcomes:      summary.Outcomes,
			Resolution: markets.ResolutionRule{
				Description: market.Description,
				Sources:     resolutionSources(market.ResolutionSource),
				ContentHash: ruleHash,
				UpdatedAt:   utcTime(market.UpdatedAt),
			},
			Capabilities: summary.Capabilities,
			Freshness:    summary.Freshness,
			Provenance:   summary.Provenance,
		})
	}

	return MappedEvent{
		Event: markets.EventDetail{
			SchemaVersion: markets.SchemaVersion,
			ID:            eventID,
			UpstreamID:    row.ID,
			Slug:          row.Slug,
			Title:         row.Title,
			Description:   row.Description,
			Status:        mapStatus(row.Active, row.Closed, row.Archived),
			StartAt:       utcTime(row.StartDate),
			EndAt:         utcTime(row.EndDate),
			Markets:       summaries,
			Freshness:     freshness,
			Provenance:    provenance,
		},
		Markets: details,
	}
}

func canonicalID(kind, upstreamID string) string {
	return "polymarket:" + kind + ":" + strings.TrimSpace(upstreamID)
}

func mapStatus(active, closed, archived bool) markets.MarketStatus {
	switch {
	case archived:
		return markets.MarketStatusArchived
	case closed:
		return markets.MarketStatusClosed
	case active:
		return markets.MarketStatusOpen
	default:
		return markets.MarketStatusUnknown
	}
}

func hasTokenIDs(outcomes []gamma.Outcome) bool {
	if len(outcomes) == 0 {
		return false
	}
	for _, outcome := range outcomes {
		if strings.TrimSpace(outcome.TokenID) == "" {
			return false
		}
	}
	return true
}

func resolutionSources(source string) []markets.ResolutionSource {
	source = strings.TrimSpace(source)
	if source == "" {
		return []markets.ResolutionSource{}
	}
	return []markets.ResolutionSource{{
		Name: "Polymarket resolution source",
		URL:  source,
	}}
}

func hashRule(description, source string) string {
	return hashBytes([]byte(strings.TrimSpace(description) + "\x00" + strings.TrimSpace(source)))
}

func hashBytes(value []byte) string {
	sum := sha256.Sum256(value)
	return hex.EncodeToString(sum[:])
}

func utcTime(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	utc := value.UTC()
	return &utc
}
