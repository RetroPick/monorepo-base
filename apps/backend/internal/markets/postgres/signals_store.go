package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/signals"
)

// SignalStore persists deterministic signal envelopes and evidence.
type SignalStore struct {
	queries *dbqueries.Queries
}

func NewSignalStore(database dbqueries.DBTX) (*SignalStore, error) {
	if database == nil {
		return nil, fmt.Errorf("markets signal store: database is required")
	}
	return &SignalStore{queries: dbqueries.New(database)}, nil
}

func (s *SignalStore) UpsertSignal(ctx context.Context, envelope markets.SignalEnvelope) error {
	if envelope.ID == "" || envelope.IdempotencyKey == "" {
		return fmt.Errorf("markets signal store: invalid envelope")
	}
	var expiresAt pgtype.Timestamptz
	if envelope.ExpiresAt != nil {
		expiresAt = requiredTimestamptz(*envelope.ExpiresAt)
	}
	var retractedAt pgtype.Timestamptz
	if envelope.RetractedAt != nil {
		retractedAt = requiredTimestamptz(*envelope.RetractedAt)
	}
	reasonCodes, err := json.Marshal(envelope.ReasonCodes)
	if err != nil {
		return fmt.Errorf("marshal reason codes: %w", err)
	}
	row, err := s.queries.UpsertMarketsSignal(ctx, dbqueries.UpsertMarketsSignalParams{
		SignalID:       envelope.ID,
		SignalType:     envelope.Type,
		MarketID:       envelope.MarketID,
		State:          envelope.State,
		RuleVersion:    envelope.RuleVersion,
		ReasonCodes:    reasonCodes,
		IdempotencyKey: envelope.IdempotencyKey,
		CreatedAt:      requiredTimestamptz(envelope.CreatedAt),
		ExpiresAt:      expiresAt,
		RetractedAt:    retractedAt,
	})
	if err != nil {
		return fmt.Errorf("upsert markets signal: %w", err)
	}
	for index, evidence := range envelope.Evidence {
		if err := s.queries.InsertMarketsSignalEvidence(ctx, dbqueries.InsertMarketsSignalEvidenceParams{
			SignalID:     row.SignalID,
			EvidenceIndex: int32(index),
			Kind:         evidence.Kind,
			ReferenceID:  evidence.ReferenceID,
			ObservedAt:   requiredTimestamptz(evidence.ObservedAt),
			ContentHash:  evidence.ContentHash,
		}); err != nil {
			return fmt.Errorf("insert signal evidence: %w", err)
		}
	}
	return nil
}

func (s *SignalStore) ListSignals(ctx context.Context, marketID, cursor string, limit int) ([]markets.SignalEnvelope, *string, error) {
	offset, err := parseOffsetCursor(cursor)
	if err != nil {
		return nil, nil, err
	}
	rows, err := s.queries.ListMarketsSignals(ctx, dbqueries.ListMarketsSignalsParams{
		Column1: marketID,
		Limit:   int32(limit),
		Offset:  int32(offset),
	})
	if err != nil {
		return nil, nil, fmt.Errorf("list markets signals: %w", err)
	}
	envelopes := make([]markets.SignalEnvelope, 0, len(rows))
	for _, row := range rows {
		evidenceRows, err := s.queries.ListMarketsSignalEvidenceForSignal(ctx, row.SignalID)
		if err != nil {
			return nil, nil, fmt.Errorf("list signal evidence: %w", err)
		}
		evidence := make([]markets.SignalEvidence, 0, len(evidenceRows))
		for _, item := range evidenceRows {
			evidence = append(evidence, markets.SignalEvidence{
				Kind:        item.Kind,
				ReferenceID: item.ReferenceID,
				ObservedAt:  timestamptzValue(item.ObservedAt),
				ContentHash: item.ContentHash,
			})
		}
		var expiresAt *time.Time
		if row.ExpiresAt.Valid {
			value := timestamptzValue(row.ExpiresAt)
			expiresAt = &value
		}
		var retractedAt *time.Time
		if row.RetractedAt.Valid {
			value := timestamptzValue(row.RetractedAt)
			retractedAt = &value
		}
		var reasonCodes []string
		if len(row.ReasonCodes) > 0 {
			_ = json.Unmarshal(row.ReasonCodes, &reasonCodes)
		}
		envelopes = append(envelopes, markets.SignalEnvelope{
			SchemaVersion:  markets.SchemaVersion,
			ID:             row.SignalID,
			Type:           row.SignalType,
			MarketID:       row.MarketID,
			State:          row.State,
			RuleVersion:    row.RuleVersion,
			ReasonCodes:    reasonCodes,
			CreatedAt:      timestamptzValue(row.CreatedAt),
			ExpiresAt:      expiresAt,
			RetractedAt:    retractedAt,
			IdempotencyKey: row.IdempotencyKey,
			Evidence:       evidence,
		})
	}
	var next *string
	if len(rows) == limit {
		value := fmt.Sprintf("%d", offset+limit)
		next = &value
	}
	return envelopes, next, nil
}

func parseOffsetCursor(cursor string) (int, error) {
	if cursor == "" {
		return 0, nil
	}
	var offset int
	if _, err := fmt.Sscanf(cursor, "%d", &offset); err != nil || offset < 0 {
		return 0, fmt.Errorf("invalid cursor")
	}
	return offset, nil
}

// SignalProcessor evaluates catalog observations and persists signals.
type SignalProcessor struct {
	engine *signals.Engine
	store  *SignalStore
}

func NewSignalProcessor(engine *signals.Engine, store *SignalStore) *SignalProcessor {
	return &SignalProcessor{engine: engine, store: store}
}

func (p *SignalProcessor) ObserveNewMarket(ctx context.Context, market markets.MarketDetail, observedAt time.Time) error {
	if p == nil || p.engine == nil || p.store == nil {
		return nil
	}
	envelope, err := p.engine.Evaluate(signals.Observation{
		Kind:       signals.TypeNewMarket,
		MarketID:   market.ID,
		ObservedAt: observedAt,
		Evidence: []markets.SignalEvidence{{
			Kind:        "catalog_market",
			ReferenceID: market.ID,
			ObservedAt:  observedAt,
			ContentHash: market.Provenance.ContentHash,
		}},
	})
	if err != nil || envelope == nil {
		return err
	}
	return p.store.UpsertSignal(ctx, *envelope)
}

func (p *SignalProcessor) ObserveRuleChange(ctx context.Context, marketID, previousHash, currentHash string, observedAt time.Time) error {
	if p == nil || p.engine == nil || p.store == nil {
		return nil
	}
	envelope, err := p.engine.Evaluate(signals.Observation{
		Kind:         signals.TypeRuleChanged,
		MarketID:     marketID,
		ObservedAt:   observedAt,
		PreviousHash: previousHash,
		CurrentHash:  currentHash,
		Evidence: []markets.SignalEvidence{{
			Kind:        "resolution_rule",
			ReferenceID: marketID,
			ObservedAt:  observedAt,
			ContentHash: currentHash,
		}},
	})
	if err != nil || envelope == nil {
		return err
	}
	return p.store.UpsertSignal(ctx, *envelope)
}

var _ = pgx.ErrNoRows
