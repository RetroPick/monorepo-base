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
	"retropick/apps/backend/internal/markets/signals"
)

// CatalogSignalProducer emits deterministic catalog-driven signals inside transactions.
type CatalogSignalProducer struct {
	engine *signals.Engine
}

func NewCatalogSignalProducer(engine *signals.Engine) *CatalogSignalProducer {
	return &CatalogSignalProducer{engine: engine}
}

func (p *CatalogSignalProducer) ProcessMarket(
	ctx context.Context,
	queries *dbqueries.Queries,
	market markets.MarketDetail,
	observedAt time.Time,
) error {
	if p == nil || p.engine == nil {
		return nil
	}
	existingMarket, marketErr := queries.GetMarketsCatalogMarket(ctx, market.ID)
	marketExists := marketErr == nil
	if marketErr != nil && !errors.Is(marketErr, pgx.ErrNoRows) {
		return fmt.Errorf("catalog signal producer: load market %s: %w", market.ID, marketErr)
	}

	existingRule, ruleErr := queries.GetMarketsCatalogRule(ctx, market.ID)
	ruleExists := ruleErr == nil
	if ruleErr != nil && !errors.Is(ruleErr, pgx.ErrNoRows) {
		return fmt.Errorf("catalog signal producer: load rule %s: %w", market.ID, ruleErr)
	}

	if !marketExists {
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
		if err != nil {
			return err
		}
		if envelope != nil {
			if err := upsertSignalInTx(ctx, queries, *envelope); err != nil {
				return err
			}
		}
	}

	currentRuleHash := market.Resolution.ContentHash
	if currentRuleHash == "" {
		currentRuleHash = hashPayload([]byte(market.Resolution.Description))
	}
	var previousRuleHash string
	if ruleExists {
		previousRuleHash = existingRule.ContentHash
	} else if marketExists {
		previousRuleHash = existingMarket.ContentHash
	}
	if ruleExists && previousRuleHash != "" && previousRuleHash != currentRuleHash {
		envelope, err := p.engine.Evaluate(signals.Observation{
			Kind:         signals.TypeRuleChanged,
			MarketID:     market.ID,
			ObservedAt:   observedAt,
			PreviousHash: previousRuleHash,
			CurrentHash:  currentRuleHash,
			Evidence: []markets.SignalEvidence{{
				Kind:        "resolution_rule",
				ReferenceID: market.ID,
				ObservedAt:  observedAt,
				ContentHash: currentRuleHash,
			}},
		})
		if err != nil {
			return err
		}
		if envelope != nil {
			if err := upsertSignalInTx(ctx, queries, *envelope); err != nil {
				return err
			}
		}
	}
	return nil
}

func upsertSignalInTx(ctx context.Context, queries *dbqueries.Queries, envelope markets.SignalEnvelope) error {
	if envelope.ID == "" || envelope.IdempotencyKey == "" {
		return fmt.Errorf("catalog signal producer: invalid envelope")
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
	row, err := queries.UpsertMarketsSignal(ctx, dbqueries.UpsertMarketsSignalParams{
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
		if err := queries.InsertMarketsSignalEvidence(ctx, dbqueries.InsertMarketsSignalEvidenceParams{
			SignalID:      row.SignalID,
			EvidenceIndex: int32(index),
			Kind:          evidence.Kind,
			ReferenceID:   evidence.ReferenceID,
			ObservedAt:    requiredTimestamptz(evidence.ObservedAt),
			ContentHash:   evidence.ContentHash,
		}); err != nil {
			return fmt.Errorf("insert signal evidence: %w", err)
		}
	}
	return nil
}

// SignalProducerHealth reports whether catalog signal production is configured.
type SignalProducerHealth struct {
	enabled  bool
	producer *CatalogSignalProducer
}

func NewSignalProducerHealth(enabled bool, producer *CatalogSignalProducer) SignalProducerHealth {
	return SignalProducerHealth{enabled: enabled, producer: producer}
}

func (h SignalProducerHealth) Operational() bool {
	return h.enabled && h.producer != nil
}
