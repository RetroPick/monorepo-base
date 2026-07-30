package postgres

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/catalog"
	"retropick/apps/backend/internal/markets/signals"
)

func TestApplyPageEmitsNewMarketSignalOnce(t *testing.T) {
	pool := integrationPool(t)
	store, err := New(pool)
	if err != nil {
		t.Fatal(err)
	}
	engine := signals.NewEngine(signals.EngineConfig{
		Now: func() time.Time { return time.Date(2026, 7, 30, 5, 0, 0, 0, time.UTC) },
	})
	store.ConfigureSignals(true, NewCatalogSignalProducer(engine))

	observed := time.Date(2026, 7, 30, 5, 0, 0, 0, time.UTC)
	marketID := "polymarket:market:signal-new"
	page := catalog.Page{
		Events: []markets.EventDetail{{
			SchemaVersion: markets.SchemaVersion,
			ID:            "polymarket:event:signal-new",
			Title:         "Signal event",
			Status:        markets.MarketStatusOpen,
			Freshness:     markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
			Provenance:    markets.UpstreamProvenance{Source: "polymarket_gamma", ObservedAt: observed, ContentHash: "event-hash"},
		}},
		Markets: []markets.MarketDetail{{
			SchemaVersion: markets.SchemaVersion,
			ID:            marketID,
			EventID:       "polymarket:event:signal-new",
			Question:      "Signal market?",
			Status:        markets.MarketStatusOpen,
			Outcomes:      []markets.Outcome{{ID: "polymarket:token:signal", UpstreamID: "token", Name: "Yes"}},
			Resolution:    markets.ResolutionRule{Description: "Rule", ContentHash: "rule-hash"},
			Freshness:     markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
			Provenance:    markets.UpstreamProvenance{Source: "polymarket_gamma", ObservedAt: observed, ContentHash: "market-hash"},
		}},
		Checkpoint: catalog.Checkpoint{
			Source:        "polymarket_gamma",
			Stream:        "events",
			Cursor:        "1",
			LastSuccessAt: observed,
		},
	}
	if err := store.ApplyPage(context.Background(), page); err != nil {
		t.Fatal(err)
	}
	if err := store.ApplyPage(context.Background(), page); err != nil {
		t.Fatal(err)
	}

	signalStore, err := NewSignalStore(pool)
	if err != nil {
		t.Fatal(err)
	}
	rows, _, err := signalStore.ListSignals(context.Background(), marketID, "", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("expected one new_market signal, got %d", len(rows))
	}
	if rows[0].Type != signals.TypeNewMarket || len(rows[0].Evidence) == 0 {
		t.Fatalf("signal %+v", rows[0])
	}
}

func TestApplyPageEmitsRuleChangedOnce(t *testing.T) {
	pool := integrationPool(t)
	store, err := New(pool)
	if err != nil {
		t.Fatal(err)
	}
	engine := signals.NewEngine(signals.EngineConfig{
		Now: func() time.Time { return time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC) },
	})
	store.ConfigureSignals(true, NewCatalogSignalProducer(engine))
	observed := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	marketID := "polymarket:market:signal-rule"

	basePage := func(ruleHash string) catalog.Page {
		return catalog.Page{
			Events: []markets.EventDetail{{
				SchemaVersion: markets.SchemaVersion,
				ID:            "polymarket:event:signal-rule",
				Title:         "Rule event",
				Status:        markets.MarketStatusOpen,
				Freshness:     markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
				Provenance:    markets.UpstreamProvenance{Source: "polymarket_gamma", ObservedAt: observed},
			}},
			Markets: []markets.MarketDetail{{
				SchemaVersion: markets.SchemaVersion,
				ID:            marketID,
				EventID:       "polymarket:event:signal-rule",
				ConditionID:   "0xsignal-rule",
				Question:      "Rule market?",
				Status:        markets.MarketStatusOpen,
				Outcomes:      []markets.Outcome{{ID: "polymarket:token:rule", UpstreamID: "token", Name: "Yes"}},
				Resolution:    markets.ResolutionRule{Description: "Rule", ContentHash: ruleHash},
				Freshness:     markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
				Provenance:    markets.UpstreamProvenance{Source: "polymarket_gamma", ObservedAt: observed, ContentHash: "market-hash"},
			}},
			Checkpoint: catalog.Checkpoint{
				Source: "polymarket_gamma", Stream: "events", Cursor: "1", LastSuccessAt: observed,
			},
		}
	}
	if err := store.ApplyPage(context.Background(), basePage("rule-v1")); err != nil {
		t.Fatal(err)
	}
	if err := store.ApplyPage(context.Background(), basePage("rule-v1")); err != nil {
		t.Fatal(err)
	}
	if err := store.ApplyPage(context.Background(), basePage("rule-v2")); err != nil {
		t.Fatal(err)
	}

	signalStore, err := NewSignalStore(pool)
	if err != nil {
		t.Fatal(err)
	}
	rows, _, err := signalStore.ListSignals(context.Background(), marketID, "", 10)
	if err != nil {
		t.Fatal(err)
	}
	var ruleChanges int
	for _, row := range rows {
		if row.Type == signals.TypeRuleChanged {
			ruleChanges++
		}
	}
	if ruleChanges != 1 {
		t.Fatalf("expected one rule_changed signal, got %d (%s)", ruleChanges, mustJSON(rows))
	}
}

func TestStoreSignalsOperationalHonest(t *testing.T) {
	store := integrationStore(t)
	if store.SignalsOperational() {
		t.Fatal("expected disabled before configure")
	}
	store.ConfigureSignals(true, NewCatalogSignalProducer(signals.NewEngine(signals.EngineConfig{})))
	if !store.SignalsOperational() {
		t.Fatal("expected operational after configure")
	}
	store.ConfigureSignals(false, NewCatalogSignalProducer(signals.NewEngine(signals.EngineConfig{})))
	if store.SignalsOperational() {
		t.Fatal("expected disabled when config off")
	}
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return string(b)
}
