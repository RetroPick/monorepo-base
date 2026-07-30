package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"retropick/apps/backend/internal/dbqueries"
)

type Store struct {
	queries *dbqueries.Queries
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
	return &Store{queries: dbqueries.New(database)}, nil
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
