// Package devseed applies deterministic Markets catalog fixtures for local dev stacks.
package devseed

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/catalog"
	"retropick/apps/backend/internal/markets/postgres"
	"retropick/apps/backend/internal/markets/signals"
)

// Apply seeds the requested scenario into the Markets catalog projection store.
func Apply(ctx context.Context, pool *pgxpool.Pool, scenario string) error {
	if scenario == "" {
		scenario = "populated"
	}
	store, err := postgres.New(pool)
	if err != nil {
		return fmt.Errorf("devseed store: %w", err)
	}
	engine := signals.NewEngine(signals.EngineConfig{Now: func() time.Time { return time.Now().UTC() }})
	store.ConfigureSignals(false, postgres.NewCatalogSignalProducer(engine))

	observed := time.Now().UTC()
	page := BuildPage(scenario, observed)
	if err := store.ApplyPage(ctx, page); err != nil {
		return fmt.Errorf("devseed ApplyPage: %w", err)
	}
	return nil
}

// Refresh reapplies a deterministic local seed immediately and at interval.
// It is intended only for explicitly configured local stacks whose upstream is
// deliberately unreachable; production catalog freshness remains worker-owned.
func Refresh(ctx context.Context, interval time.Duration, apply func(context.Context) error) error {
	if interval <= 0 {
		return fmt.Errorf("devseed refresh interval must be positive")
	}
	if apply == nil {
		return fmt.Errorf("devseed refresh apply function is required")
	}
	if err := apply(ctx); err != nil {
		return err
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := apply(ctx); err != nil {
				return err
			}
		}
	}
}

// BuildPage returns the catalog page for a dev seed scenario.
func BuildPage(scenario string, observed time.Time) catalog.Page {
	switch scenario {
	case "empty":
		return catalog.Page{
			Checkpoint: catalog.Checkpoint{
				Source: "polymarket_gamma", Stream: "events", Cursor: "0", LastSuccessAt: observed,
			},
		}
	case "degraded":
		stale := observed.Add(-2 * time.Hour)
		return buildPopulatedPage(stale, markets.FreshnessStale)
	default:
		return buildPopulatedPage(observed, markets.FreshnessFresh)
	}
}

func buildPopulatedPage(observed time.Time, freshnessState markets.FreshnessState) catalog.Page {
	freshness := markets.MarketFreshness{State: freshnessState, ObservedAt: observed, AgeMillis: 1000}
	prov := markets.UpstreamProvenance{Source: "retropick_projection", ObservedAt: observed, ContentHash: "seed"}

	eventMulti := markets.EventDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:event:seed-multi",
		UpstreamID:    "seed-multi",
		Title:         "Seed Multi-Market Event",
		Status:        markets.MarketStatusOpen,
		Freshness:     freshness,
		Provenance:    prov,
	}

	binaryMarket := markets.MarketDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:market:seed-binary",
		EventID:       "polymarket:event:seed-multi",
		ConditionID:   "0xseedbinary",
		Question:      "Will the seeded binary market resolve Yes?",
		Status:        markets.MarketStatusOpen,
		Capabilities:  markets.MarketCapability{OrderBook: true, History: true},
		Outcomes: []markets.Outcome{
			{ID: "polymarket:token:seed-yes", UpstreamID: "seed-token-yes", Name: "Yes", Price: decimalPtr("0.62")},
			{ID: "polymarket:token:seed-no", UpstreamID: "seed-token-no", Name: "No", Price: decimalPtr("0.38")},
		},
		Resolution: markets.ResolutionRule{Description: "Resolves per fixture rules.", ContentHash: "rule-binary"},
		Freshness:  freshness,
		Provenance: prov,
	}

	unavailableMarket := markets.MarketDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:market:seed-unavailable",
		EventID:       "polymarket:event:seed-multi",
		ConditionID:   "0xseedunavail",
		Question:      "Market with unavailable prices?",
		Status:        markets.MarketStatusOpen,
		Capabilities:  markets.MarketCapability{OrderBook: false, History: true},
		Outcomes: []markets.Outcome{
			{ID: "polymarket:token:seed-u1", UpstreamID: "seed-token-u1", Name: "Yes"},
			{ID: "polymarket:token:seed-u2", UpstreamID: "seed-token-u2", Name: "No"},
		},
		Resolution: markets.ResolutionRule{Description: "Unavailable price fixture.", ContentHash: "rule-unavail"},
		Freshness:  freshness,
		Provenance: prov,
	}

	closedMarket := markets.MarketDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:market:seed-closed",
		EventID:       "polymarket:event:seed-multi",
		ConditionID:   "0xseedclosed",
		Question:      "Closed market final snapshot?",
		Status:        markets.MarketStatusClosed,
		Capabilities:  markets.MarketCapability{OrderBook: true, History: true},
		Outcomes: []markets.Outcome{
			{ID: "polymarket:token:seed-closed", UpstreamID: "seed-token-closed", Name: "Yes", Price: decimalPtr("0.91")},
		},
		Resolution: markets.ResolutionRule{Description: "Closed fixture.", ContentHash: "rule-closed"},
		Freshness:  freshness,
		Provenance: prov,
	}

	eventSingle := markets.EventDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:event:seed-single",
		UpstreamID:    "seed-single",
		Title:         "Seed Single-Market Event",
		Status:        markets.MarketStatusOpen,
		Freshness:     freshness,
		Provenance:    prov,
	}

	soloMarket := markets.MarketDetail{
		SchemaVersion: markets.SchemaVersion,
		ID:            "polymarket:market:seed-solo",
		EventID:       "polymarket:event:seed-single",
		ConditionID:   "0xseedsolo",
		Question:      "Standalone seeded market?",
		Status:        markets.MarketStatusOpen,
		Capabilities:  markets.MarketCapability{OrderBook: true, History: true},
		Outcomes: []markets.Outcome{
			{ID: "polymarket:token:seed-solo", UpstreamID: "seed-token-solo", Name: "Yes", Price: decimalPtr("0.55")},
		},
		Resolution: markets.ResolutionRule{Description: "Solo fixture.", ContentHash: "rule-solo"},
		Freshness:  freshness,
		Provenance: prov,
	}

	return catalog.Page{
		Events:  []markets.EventDetail{eventMulti, eventSingle},
		Markets: []markets.MarketDetail{binaryMarket, unavailableMarket, closedMarket, soloMarket},
		RawEvents: []catalog.RawEvent{{
			Source: "polymarket_gamma", UpstreamEventID: "seed:hash", EntityType: "event",
			EntityID: "polymarket:event:seed-multi", SchemaVersion: markets.SchemaVersion,
			Payload: json.RawMessage(`{"id":"seed-multi"}`), ObservedAt: observed, ExpiresAt: observed.Add(24 * time.Hour),
		}},
		Checkpoint: catalog.Checkpoint{
			Source: "polymarket_gamma", Stream: "events", Cursor: "1",
			HighWatermark: observed, LastSuccessAt: observed,
		},
	}
}

func decimalPtr(raw string) *markets.DecimalString {
	value := markets.DecimalString(raw)
	return &value
}
