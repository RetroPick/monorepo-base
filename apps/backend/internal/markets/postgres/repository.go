package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/catalog"
)

type Store struct {
	database dbqueries.DBTX
	queries  *dbqueries.Queries
}

type Checkpoint struct {
	Source        string
	Stream        string
	Cursor        string
	HighWatermark time.Time
	LastSuccessAt time.Time
	Metadata      json.RawMessage
}

type EventRecord struct {
	ID                string
	Slug              string
	Title             string
	Description       string
	Status            string
	StartAt           time.Time
	EndAt             time.Time
	Source            string
	UpstreamUpdatedAt time.Time
	ContentHash       string
	Payload           json.RawMessage
	ObservedAt        time.Time
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

func New(database dbqueries.DBTX) (*Store, error) {
	if database == nil {
		return nil, fmt.Errorf("markets postgres: database is required")
	}
	return &Store{database: database, queries: dbqueries.New(database)}, nil
}

type transactionStarter interface {
	Begin(ctx context.Context) (pgx.Tx, error)
}

func (s *Store) ApplyPage(ctx context.Context, page catalog.Page) error {
	starter, ok := s.database.(transactionStarter)
	if !ok {
		return fmt.Errorf("apply markets catalog page: database does not support transactions")
	}
	tx, err := starter.Begin(ctx)
	if err != nil {
		return fmt.Errorf("apply markets catalog page: begin: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()
	queries := dbqueries.New(tx)

	for _, event := range page.Events {
		payload, err := json.Marshal(event)
		if err != nil {
			return fmt.Errorf("apply markets catalog page: marshal event %s: %w", event.ID, err)
		}
		contentHash := event.Provenance.ContentHash
		if contentHash == "" {
			contentHash = hashPayload(payload)
		}
		if _, err := queries.UpsertMarketsCatalogEvent(ctx, dbqueries.UpsertMarketsCatalogEventParams{
			EventID:           event.ID,
			Slug:              event.Slug,
			Title:             event.Title,
			Description:       event.Description,
			Status:            string(event.Status),
			StartAt:           optionalTimePointer(event.StartAt),
			EndAt:             optionalTimePointer(event.EndAt),
			Source:            event.Provenance.Source,
			UpstreamUpdatedAt: optionalTimePointer(event.Provenance.UpstreamUpdated),
			ContentHash:       contentHash,
			Payload:           payload,
			ObservedAt:        requiredTimestamptz(event.Provenance.ObservedAt),
		}); err != nil {
			return fmt.Errorf("apply markets catalog page: event %s: %w", event.ID, err)
		}
	}

	for _, market := range page.Markets {
		payload, err := json.Marshal(market)
		if err != nil {
			return fmt.Errorf("apply markets catalog page: marshal market %s: %w", market.ID, err)
		}
		contentHash := market.Provenance.ContentHash
		if contentHash == "" {
			contentHash = hashPayload(payload)
		}
		if _, err := queries.UpsertMarketsCatalogMarket(ctx, dbqueries.UpsertMarketsCatalogMarketParams{
			MarketID:          market.ID,
			EventID:           optionalText(market.EventID),
			ConditionID:       market.ConditionID,
			Slug:              market.Slug,
			Question:          market.Question,
			Description:       market.Description,
			Status:            string(market.Status),
			EndAt:             optionalTimePointer(market.EndAt),
			EnableOrderBook:   market.Capabilities.OrderBook,
			NegRisk:           market.Capabilities.NegRisk,
			Source:            market.Provenance.Source,
			UpstreamUpdatedAt: optionalTimePointer(market.Provenance.UpstreamUpdated),
			ContentHash:       contentHash,
			Payload:           payload,
			ObservedAt:        requiredTimestamptz(market.Provenance.ObservedAt),
		}); err != nil {
			return fmt.Errorf("apply markets catalog page: market %s: %w", market.ID, err)
		}
		for index, outcome := range market.Outcomes {
			tokenID := outcome.UpstreamID
			if tokenID == "" {
				tokenID = outcome.ID
			}
			if _, err := queries.UpsertMarketsCatalogOutcome(ctx, dbqueries.UpsertMarketsCatalogOutcomeParams{
				OutcomeID:       outcome.ID,
				MarketID:        market.ID,
				UpstreamTokenID: tokenID,
				OutcomeIndex:    int32(index),
				Name:            outcome.Name,
				Price:           optionalDecimal(outcome.Price),
				Winner:          optionalBool(outcome.Winner),
				ObservedAt:      requiredTimestamptz(market.Provenance.ObservedAt),
			}); err != nil {
				return fmt.Errorf("apply markets catalog page: outcome %s: %w", outcome.ID, err)
			}
		}
		sourceName, sourceURL := firstResolutionSource(market.Resolution.Sources)
		ruleHash := market.Resolution.ContentHash
		if ruleHash == "" {
			ruleHash = hashPayload([]byte(market.Resolution.Description + "\x00" + sourceURL))
		}
		if _, err := queries.UpsertMarketsCatalogRule(ctx, dbqueries.UpsertMarketsCatalogRuleParams{
			MarketID:             market.ID,
			Description:          market.Resolution.Description,
			ResolutionSourceName: sourceName,
			ResolutionSourceUrl:  sourceURL,
			ContentHash:          ruleHash,
			UpstreamUpdatedAt:    optionalTimePointer(market.Resolution.UpdatedAt),
			ObservedAt:           requiredTimestamptz(market.Provenance.ObservedAt),
		}); err != nil {
			return fmt.Errorf("apply markets catalog page: rule %s: %w", market.ID, err)
		}
	}

	for _, raw := range page.RawEvents {
		if err := queries.InsertMarketsRawUpstreamEvent(ctx, dbqueries.InsertMarketsRawUpstreamEventParams{
			Source:          raw.Source,
			UpstreamEventID: raw.UpstreamEventID,
			EntityType:      raw.EntityType,
			EntityID:        raw.EntityID,
			SchemaVersion:   raw.SchemaVersion,
			Payload:         raw.Payload,
			ObservedAt:      requiredTimestamptz(raw.ObservedAt),
			ExpiresAt:       requiredTimestamptz(raw.ExpiresAt),
		}); err != nil {
			return fmt.Errorf("apply markets catalog page: raw event %s: %w", raw.UpstreamEventID, err)
		}
	}

	if _, err := queries.UpsertMarketsSyncCheckpoint(ctx, dbqueries.UpsertMarketsSyncCheckpointParams{
		Source:        page.Checkpoint.Source,
		Stream:        page.Checkpoint.Stream,
		Cursor:        page.Checkpoint.Cursor,
		HighWatermark: optionalTimestamptz(page.Checkpoint.HighWatermark),
		LastSuccessAt: requiredTimestamptz(page.Checkpoint.LastSuccessAt),
		Metadata:      []byte(`{}`),
	}); err != nil {
		return fmt.Errorf("apply markets catalog page: checkpoint: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("apply markets catalog page: commit: %w", err)
	}
	return nil
}

func (s *Store) UpsertCheckpoint(ctx context.Context, checkpoint Checkpoint) error {
	if checkpoint.Source == "" || checkpoint.Stream == "" || checkpoint.LastSuccessAt.IsZero() {
		return fmt.Errorf("markets postgres: invalid checkpoint")
	}
	metadata := checkpoint.Metadata
	if len(metadata) == 0 {
		metadata = json.RawMessage(`{}`)
	}
	_, err := s.queries.UpsertMarketsSyncCheckpoint(ctx, dbqueries.UpsertMarketsSyncCheckpointParams{
		Source:        checkpoint.Source,
		Stream:        checkpoint.Stream,
		Cursor:        checkpoint.Cursor,
		HighWatermark: optionalTimestamptz(checkpoint.HighWatermark),
		LastSuccessAt: requiredTimestamptz(checkpoint.LastSuccessAt),
		Metadata:      metadata,
	})
	if err != nil {
		return fmt.Errorf("upsert markets checkpoint: %w", err)
	}
	return nil
}

func (s *Store) GetCheckpoint(ctx context.Context, source, stream string) (Checkpoint, error) {
	row, err := s.queries.GetMarketsSyncCheckpoint(ctx, dbqueries.GetMarketsSyncCheckpointParams{
		Source: source,
		Stream: stream,
	})
	if err != nil {
		return Checkpoint{}, fmt.Errorf("get markets checkpoint: %w", err)
	}
	return Checkpoint{
		Source:        row.Source,
		Stream:        row.Stream,
		Cursor:        row.Cursor,
		HighWatermark: timestamptzValue(row.HighWatermark),
		LastSuccessAt: timestamptzValue(row.LastSuccessAt),
		Metadata:      append(json.RawMessage(nil), row.Metadata...),
	}, nil
}

func (s *Store) UpsertEvent(ctx context.Context, record EventRecord) error {
	if record.ID == "" || record.Title == "" || record.Status == "" || record.Source == "" ||
		record.ContentHash == "" || record.ObservedAt.IsZero() {
		return fmt.Errorf("markets postgres: invalid catalog event")
	}
	payload := record.Payload
	if len(payload) == 0 {
		payload = json.RawMessage(`{}`)
	}
	_, err := s.queries.UpsertMarketsCatalogEvent(ctx, dbqueries.UpsertMarketsCatalogEventParams{
		EventID:           record.ID,
		Slug:              record.Slug,
		Title:             record.Title,
		Description:       record.Description,
		Status:            record.Status,
		StartAt:           optionalTimestamptz(record.StartAt),
		EndAt:             optionalTimestamptz(record.EndAt),
		Source:            record.Source,
		UpstreamUpdatedAt: optionalTimestamptz(record.UpstreamUpdatedAt),
		ContentHash:       record.ContentHash,
		Payload:           payload,
		ObservedAt:        requiredTimestamptz(record.ObservedAt),
	})
	if err != nil {
		return fmt.Errorf("upsert markets catalog event: %w", err)
	}
	return nil
}

func (s *Store) GetEvent(ctx context.Context, eventID string) (EventRecord, error) {
	row, err := s.queries.GetMarketsCatalogEvent(ctx, eventID)
	if err != nil {
		return EventRecord{}, fmt.Errorf("get markets catalog event: %w", err)
	}
	return EventRecord{
		ID:                row.EventID,
		Slug:              row.Slug,
		Title:             row.Title,
		Description:       row.Description,
		Status:            row.Status,
		StartAt:           timestamptzValue(row.StartAt),
		EndAt:             timestamptzValue(row.EndAt),
		Source:            row.Source,
		UpstreamUpdatedAt: timestamptzValue(row.UpstreamUpdatedAt),
		ContentHash:       row.ContentHash,
		Payload:           append(json.RawMessage(nil), row.Payload...),
		ObservedAt:        timestamptzValue(row.ObservedAt),
	}, nil
}

func (s *Store) SaveRawEvent(ctx context.Context, record RawEvent) error {
	if record.Source == "" || record.UpstreamEventID == "" || record.EntityType == "" ||
		record.EntityID == "" || record.SchemaVersion == "" || record.ObservedAt.IsZero() ||
		!record.ExpiresAt.After(record.ObservedAt) || len(record.Payload) == 0 {
		return fmt.Errorf("markets postgres: invalid raw event")
	}
	if err := s.queries.InsertMarketsRawUpstreamEvent(ctx, dbqueries.InsertMarketsRawUpstreamEventParams{
		Source:          record.Source,
		UpstreamEventID: record.UpstreamEventID,
		EntityType:      record.EntityType,
		EntityID:        record.EntityID,
		SchemaVersion:   record.SchemaVersion,
		Payload:         record.Payload,
		ObservedAt:      requiredTimestamptz(record.ObservedAt),
		ExpiresAt:       requiredTimestamptz(record.ExpiresAt),
	}); err != nil {
		return fmt.Errorf("insert markets raw upstream event: %w", err)
	}
	return nil
}

func (s *Store) DeleteExpiredRawEvents(ctx context.Context, before time.Time) (int64, error) {
	count, err := s.queries.DeleteExpiredMarketsRawUpstreamEvents(ctx, requiredTimestamptz(before))
	if err != nil {
		return 0, fmt.Errorf("delete expired markets raw events: %w", err)
	}
	return count, nil
}

func requiredTimestamptz(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value.UTC(), Valid: true}
}

func optionalTimestamptz(value time.Time) pgtype.Timestamptz {
	if value.IsZero() {
		return pgtype.Timestamptz{}
	}
	return requiredTimestamptz(value)
}

func timestamptzValue(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time.UTC()
}

func optionalTimePointer(value *time.Time) pgtype.Timestamptz {
	if value == nil {
		return pgtype.Timestamptz{}
	}
	return requiredTimestamptz(*value)
}

func optionalText(value string) pgtype.Text {
	if value == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: value, Valid: true}
}

func optionalDecimal(value *markets.DecimalString) pgtype.Text {
	if value == nil {
		return pgtype.Text{}
	}
	return pgtype.Text{String: string(*value), Valid: true}
}

func optionalBool(value *bool) pgtype.Bool {
	if value == nil {
		return pgtype.Bool{}
	}
	return pgtype.Bool{Bool: *value, Valid: true}
}

func firstResolutionSource(sources []markets.ResolutionSource) (string, string) {
	if len(sources) == 0 {
		return "", ""
	}
	return sources[0].Name, sources[0].URL
}

func hashPayload(payload []byte) string {
	sum := sha256.Sum256(payload)
	return fmt.Sprintf("%x", sum[:])
}
