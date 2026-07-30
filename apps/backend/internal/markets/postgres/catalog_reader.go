package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/markets"
)

const catalogAdvisoryLockKey int64 = 0x4D4B545F434154 // "MKT_CAT"

var ErrCatalogNotFound = errors.New("catalog projection not found")

// CatalogReader serves projection-first catalog queries.
type CatalogReader struct {
	queries *dbqueries.Queries
}

func NewCatalogReader(database dbqueries.DBTX) (*CatalogReader, error) {
	if database == nil {
		return nil, fmt.Errorf("markets catalog reader: database is required")
	}
	return &CatalogReader{queries: dbqueries.New(database)}, nil
}

type ProjectionStatus struct {
	EventCount      int64
	LatestObserved  time.Time
	Checkpoint      Checkpoint
	HasProjection   bool
}

func (r *CatalogReader) ProjectionStatus(ctx context.Context) (ProjectionStatus, error) {
	count, err := r.queries.CountMarketsCatalogEvents(ctx)
	if err != nil {
		return ProjectionStatus{}, fmt.Errorf("catalog projection status: count: %w", err)
	}
	latest, err := r.queries.GetLatestCatalogProjectionObservedAt(ctx)
	if err != nil {
		return ProjectionStatus{}, fmt.Errorf("catalog projection status: latest: %w", err)
	}
	checkpoint, err := r.queries.GetMarketsSyncCheckpoint(ctx, dbqueries.GetMarketsSyncCheckpointParams{
		Source: "polymarket_gamma",
		Stream: "events",
	})
	checkpointFound := true
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return ProjectionStatus{}, fmt.Errorf("catalog projection status: checkpoint: %w", err)
		}
		checkpointFound = false
	}
	status := ProjectionStatus{
		EventCount:     count,
		LatestObserved: timestamptzValue(latest),
		HasProjection:  count > 0,
	}
	if checkpointFound {
		status.Checkpoint = Checkpoint{
			Source:        checkpoint.Source,
			Stream:        checkpoint.Stream,
			Cursor:        checkpoint.Cursor,
			HighWatermark: timestamptzValue(checkpoint.HighWatermark),
			LastSuccessAt: timestamptzValue(checkpoint.LastSuccessAt),
			Metadata:      append(json.RawMessage(nil), checkpoint.Metadata...),
		}
	}
	return status, nil
}

func (r *CatalogReader) ListEvents(ctx context.Context, statusFilter string, limit, offset int) ([]markets.EventSummary, error) {
	rows, err := r.queries.ListMarketsCatalogEventSummaries(ctx, dbqueries.ListMarketsCatalogEventSummariesParams{
		Column1: statusFilter,
		Limit:   int32(limit),
		Offset:  int32(offset),
	})
	if err != nil {
		return nil, fmt.Errorf("list catalog events: %w", err)
	}
	summaries := make([]markets.EventSummary, 0, len(rows))
	for _, row := range rows {
		summaries = append(summaries, mapEventSummaryRow(row))
	}
	return summaries, nil
}

func (r *CatalogReader) GetEvent(ctx context.Context, eventID string) (markets.EventDetail, error) {
	row, err := r.queries.GetMarketsCatalogEvent(ctx, eventID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return markets.EventDetail{}, fmt.Errorf("%w: event %s", ErrCatalogNotFound, eventID)
		}
		return markets.EventDetail{}, fmt.Errorf("get catalog event: %w", err)
	}
	marketRows, err := r.queries.ListMarketsForEvent(ctx, pgtype.Text{String: eventID, Valid: true})
	if err != nil {
		return markets.EventDetail{}, fmt.Errorf("get catalog event markets: %w", err)
	}
	summaries := make([]markets.MarketSummary, 0, len(marketRows))
	for _, marketRow := range marketRows {
		summary, err := r.mapMarketSummary(ctx, marketRow)
		if err != nil {
			return markets.EventDetail{}, err
		}
		summaries = append(summaries, summary)
	}
	observedAt := timestamptzValue(row.ObservedAt)
	return markets.EventDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            row.EventID,
		UpstreamID:    upstreamFromCanonicalID(row.EventID),
		Slug:          row.Slug,
		Title:         row.Title,
		Description:   row.Description,
		Status:        markets.MarketStatus(row.Status),
		StartAt:       timePointer(timestamptzValue(row.StartAt)),
		EndAt:         timePointer(timestamptzValue(row.EndAt)),
		Markets:       summaries,
		Freshness:     projectionFreshness(observedAt),
		Provenance: markets.UpstreamProvenance{
			Source:          row.Source,
			UpstreamID:      upstreamFromCanonicalID(row.EventID),
			ObservedAt:      observedAt,
			UpstreamUpdated: timePointer(timestamptzValue(row.UpstreamUpdatedAt)),
			ContentHash:     row.ContentHash,
		},
	}, nil
}

func (r *CatalogReader) GetMarket(ctx context.Context, marketID string) (markets.MarketDetail, error) {
	row, err := r.queries.GetMarketsCatalogMarket(ctx, marketID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return markets.MarketDetail{}, fmt.Errorf("%w: market %s", ErrCatalogNotFound, marketID)
		}
		return markets.MarketDetail{}, fmt.Errorf("get catalog market: %w", err)
	}
	summary, err := r.mapMarketSummary(ctx, row)
	if err != nil {
		return markets.MarketDetail{}, err
	}
	ruleRow, err := r.queries.GetMarketsCatalogRule(ctx, summary.ID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return markets.MarketDetail{}, fmt.Errorf("get catalog rule: %w", err)
	}
	resolution := markets.ResolutionRule{}
	if err == nil {
		resolution = markets.ResolutionRule{
			Description: ruleRow.Description,
			Sources: []markets.ResolutionSource{{
				Name: ruleRow.ResolutionSourceName,
				URL:  ruleRow.ResolutionSourceUrl,
			}},
			ContentHash: ruleRow.ContentHash,
			UpdatedAt:   timePointer(timestamptzValue(ruleRow.UpstreamUpdatedAt)),
		}
	}
	return markets.MarketDetail{
		SchemaVersion: summary.SchemaVersion,
		ID:            summary.ID,
		UpstreamID:    summary.UpstreamID,
		EventID:       textValue(row.EventID),
		ConditionID:   summary.ConditionID,
		Slug:          summary.Slug,
		Question:      summary.Question,
		Description:   row.Description,
		Status:        summary.Status,
		EndAt:         summary.EndAt,
		Outcomes:      summary.Outcomes,
		Resolution:    resolution,
		Capabilities:  summary.Capabilities,
		Freshness:     summary.Freshness,
		Provenance:    summary.Provenance,
	}, nil
}

func (r *CatalogReader) mapMarketSummary(ctx context.Context, row dbqueries.MarketsCatalogMarket) (markets.MarketSummary, error) {
	outcomeRows, err := r.queries.ListMarketsOutcomes(ctx, row.MarketID)
	if err != nil {
		return markets.MarketSummary{}, fmt.Errorf("list outcomes for %s: %w", row.MarketID, err)
	}
	outcomes := make([]markets.Outcome, 0, len(outcomeRows))
	for _, outcome := range outcomeRows {
		var price *markets.DecimalString
		if outcome.Price.Valid {
			value := markets.DecimalString(outcome.Price.String)
			price = &value
		}
		var winner *bool
		if outcome.Winner.Valid {
			value := outcome.Winner.Bool
			winner = &value
		}
		outcomes = append(outcomes, markets.Outcome{
			ID:         outcome.OutcomeID,
			UpstreamID: outcome.UpstreamTokenID,
			Name:       outcome.Name,
			Price:      price,
			Winner:     winner,
		})
	}
	observedAt := timestamptzValue(row.ObservedAt)
	return markets.MarketSummary{
		SchemaVersion: markets.SchemaVersion,
		ID:            row.MarketID,
		UpstreamID:    upstreamFromCanonicalID(row.MarketID),
		ConditionID:   row.ConditionID,
		Slug:          row.Slug,
		Question:      row.Question,
		Status:        markets.MarketStatus(row.Status),
		EndAt:         timePointer(timestamptzValue(row.EndAt)),
		Outcomes:      outcomes,
		Capabilities: markets.MarketCapability{
			OrderBook: row.EnableOrderBook,
			History:   row.EnableOrderBook,
			Realtime:  false,
			NegRisk:   row.NegRisk,
			Trading:   false,
		},
		Freshness: projectionFreshness(observedAt),
		Provenance: markets.UpstreamProvenance{
			Source:          row.Source,
			UpstreamID:      upstreamFromCanonicalID(row.MarketID),
			ObservedAt:      observedAt,
			UpstreamUpdated: timePointer(timestamptzValue(row.UpstreamUpdatedAt)),
			ContentHash:     row.ContentHash,
		},
	}, nil
}

func mapEventSummaryRow(row dbqueries.ListMarketsCatalogEventSummariesRow) markets.EventSummary {
	observedAt := timestamptzValue(row.ObservedAt)
	return markets.EventSummary{
		SchemaVersion: markets.SchemaVersion,
		ID:            row.EventID,
		UpstreamID:    upstreamFromCanonicalID(row.EventID),
		Slug:          row.Slug,
		Title:         row.Title,
		Status:        markets.MarketStatus(row.Status),
		StartAt:       timePointer(timestamptzValue(row.StartAt)),
		EndAt:         timePointer(timestamptzValue(row.EndAt)),
		MarketCount:   int(row.MarketCount),
		Freshness:     projectionFreshness(observedAt),
		Provenance: markets.UpstreamProvenance{
			Source:          row.Source,
			UpstreamID:      upstreamFromCanonicalID(row.EventID),
			ObservedAt:      observedAt,
			UpstreamUpdated: timePointer(timestamptzValue(row.UpstreamUpdatedAt)),
			ContentHash:     row.ContentHash,
		},
	}
}

func mapEventRow(row dbqueries.MarketsCatalogEvent, marketCount int) markets.EventSummary {
	observedAt := timestamptzValue(row.ObservedAt)
	return markets.EventSummary{
		SchemaVersion: markets.SchemaVersion,
		ID:            row.EventID,
		UpstreamID:    upstreamFromCanonicalID(row.EventID),
		Slug:          row.Slug,
		Title:         row.Title,
		Status:        markets.MarketStatus(row.Status),
		StartAt:       timePointer(timestamptzValue(row.StartAt)),
		EndAt:         timePointer(timestamptzValue(row.EndAt)),
		MarketCount:   marketCount,
		Freshness:     projectionFreshness(observedAt),
		Provenance: markets.UpstreamProvenance{
			Source:          row.Source,
			UpstreamID:      upstreamFromCanonicalID(row.EventID),
			ObservedAt:      observedAt,
			UpstreamUpdated: timePointer(timestamptzValue(row.UpstreamUpdatedAt)),
			ContentHash:     row.ContentHash,
		},
	}
}

func projectionFreshness(observedAt time.Time) markets.MarketFreshness {
	return markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: observedAt,
	}
}

func upstreamFromCanonicalID(id string) string {
	parts := splitCanonicalID(id)
	if len(parts) == 0 {
		return id
	}
	return parts[len(parts)-1]
}

func splitCanonicalID(id string) []string {
	const prefix = "polymarket:"
	if len(id) <= len(prefix) || id[:len(prefix)] != prefix {
		return []string{id}
	}
	rest := id[len(prefix):]
	for i := 0; i < len(rest); i++ {
		if rest[i] == ':' {
			return []string{rest[i+1:]}
		}
	}
	return []string{rest}
}

func timePointer(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	utc := value.UTC()
	return &utc
}

func textValue(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}
