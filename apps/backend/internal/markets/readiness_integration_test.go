package markets_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/catalog"
	"retropick/apps/backend/internal/markets/gamma"
	"retropick/apps/backend/internal/markets/postgres"
	"retropick/apps/backend/internal/markets/signals"
	"retropick/apps/backend/internal/markets/syncworker"
)

func TestReadinessIntegrationTransitions(t *testing.T) {
	pool := integrationPool(t)
	reader, err := postgres.NewCatalogReader(pool)
	if err != nil {
		t.Fatal(err)
	}
	projection := postgres.NewProjectionAdapter(reader)
	store, err := postgres.New(pool)
	if err != nil {
		t.Fatal(err)
	}
	locker, err := postgres.NewCatalogLocker(pool)
	if err != nil {
		t.Fatal(err)
	}
	fixed := time.Date(2026, 7, 30, 14, 0, 0, 0, time.UTC)
	svc := markets.NewService(markets.ServiceConfig{
		CatalogEnabled:    true,
		CatalogProjection: projection,
		CatalogMaxStale:   15 * time.Minute,
		Now:               func() time.Time { return fixed },
	})
	worker, err := syncworker.NewCatalogWorker(syncworker.Config{
		Syncer:      mustSyncer(t, store),
		Reader:      reader,
		Store:       store,
		Locker:      locker,
		MaxStaleAge: 15 * time.Minute,
		Now:         func() time.Time { return fixed },
	})
	if err != nil {
		t.Fatal(err)
	}
	r := chi.NewRouter()
	markets.RegisterHealthRoutes(r, markets.HealthChecker{
		Pool:    pool,
		Service: svc,
		Worker:  worker,
		Now:     func() time.Time { return fixed },
	})

	assertReady := func(t *testing.T, wantStatus int, wantDegraded bool) {
		t.Helper()
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/health/ready", nil))
		if rec.Code != wantStatus {
			t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
		}
		var body markets.HealthResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if body.Degraded != wantDegraded {
			t.Fatalf("degraded=%v body %+v", body.Degraded, body)
		}
	}

	t.Run("no projection", func(t *testing.T) {
		assertReady(t, http.StatusServiceUnavailable, false)
	})

	observed := fixed.Add(-5 * time.Minute)
	if err := seedProjection(context.Background(), store, observed); err != nil {
		t.Fatal(err)
	}
	if err := worker.Bootstrap(context.Background()); err != nil {
		t.Fatal(err)
	}
	svc = markets.NewService(markets.ServiceConfig{
		CatalogEnabled:    true,
		CatalogProjection: projection,
		CatalogWorker:     worker,
		CatalogMaxStale:   15 * time.Minute,
		Now:               func() time.Time { return fixed },
	})
	markets.RegisterHealthRoutes(r, markets.HealthChecker{
		Pool:    pool,
		Service: svc,
		Worker:  worker,
		Now:     func() time.Time { return fixed },
	})

	t.Run("existing projection", func(t *testing.T) {
		assertReady(t, http.StatusOK, false)
	})

	t.Run("liveness during database outage", func(t *testing.T) {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/health/live", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("live status %d", rec.Code)
		}
	})

	t.Run("degraded during gamma outage", func(t *testing.T) {
		failingSyncer, err := catalog.NewSyncer(catalog.SyncerConfig{
			Source: failingGammaSource{err: fmt.Errorf("gamma unavailable")},
			Store:  store,
		})
		if err != nil {
			t.Fatal(err)
		}
		degradedWorker, err := syncworker.NewCatalogWorker(syncworker.Config{
			Syncer:      failingSyncer,
			Reader:      reader,
			Store:       store,
			Locker:      locker,
			MaxStaleAge: 15 * time.Minute,
			Now:         func() time.Time { return fixed },
		})
		if err != nil {
			t.Fatal(err)
		}
		if err := degradedWorker.Bootstrap(context.Background()); err != nil {
			t.Fatal(err)
		}
		if err := degradedWorker.RunOnce(context.Background()); err == nil {
			t.Fatal("expected sync failure")
		}
		markets.RegisterHealthRoutes(r, markets.HealthChecker{
			Pool:    pool,
			Service: markets.NewService(markets.ServiceConfig{
				CatalogEnabled:    true,
				CatalogProjection: projection,
				CatalogWorker:     degradedWorker,
				CatalogMaxStale:   15 * time.Minute,
				Now:               func() time.Time { return fixed },
			}),
			Worker: degradedWorker,
			Now:    func() time.Time { return fixed },
		})
		assertReady(t, http.StatusOK, true)
	})

	t.Run("over age projection", func(t *testing.T) {
		staleObserved := fixed.Add(-40 * time.Minute)
		if err := seedProjection(context.Background(), store, staleObserved); err != nil {
			t.Fatal(err)
		}
		staleWorker, err := syncworker.NewCatalogWorker(syncworker.Config{
			Syncer:      mustSyncer(t, store),
			Reader:      reader,
			Store:       store,
			Locker:      locker,
			MaxStaleAge: 15 * time.Minute,
			Now:         func() time.Time { return fixed },
		})
		if err != nil {
			t.Fatal(err)
		}
		if err := staleWorker.Bootstrap(context.Background()); err != nil {
			t.Fatal(err)
		}
		markets.RegisterHealthRoutes(r, markets.HealthChecker{
			Pool: pool,
			Service: markets.NewService(markets.ServiceConfig{
				CatalogEnabled:    true,
				CatalogProjection: projection,
				CatalogWorker:     staleWorker,
				CatalogMaxStale:   15 * time.Minute,
				Now:               func() time.Time { return fixed },
			}),
			Worker: staleWorker,
			Now:    func() time.Time { return fixed },
		})
		assertReady(t, http.StatusServiceUnavailable, false)
	})

	worker.StatusSnapshot() // compile-time accessor check
	worker.WorkerDegraded()
}

func seedProjection(ctx context.Context, store *postgres.Store, observed time.Time) error {
	engine := signals.NewEngine(signals.EngineConfig{Now: func() time.Time { return observed }})
	store.ConfigureSignals(true, postgres.NewCatalogSignalProducer(engine))
	return store.ApplyPage(ctx, catalog.Page{
		Events: []markets.EventDetail{{
			SchemaVersion: markets.SchemaVersion,
			ID:            "polymarket:event:ready",
			Title:         "Ready Event",
			Status:        markets.MarketStatusOpen,
			Freshness:     markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
			Provenance:    markets.UpstreamProvenance{Source: "polymarket_gamma", ObservedAt: observed, ContentHash: "event"},
		}},
		Markets: []markets.MarketDetail{{
			SchemaVersion: markets.SchemaVersion,
			ID:            "polymarket:market:ready",
			EventID:       "polymarket:event:ready",
			ConditionID:   "0xready",
			Question:      "Ready?",
			Status:        markets.MarketStatusOpen,
			Outcomes:      []markets.Outcome{{ID: "polymarket:token:ready", UpstreamID: "token-ready", Name: "Yes"}},
			Resolution:    markets.ResolutionRule{Description: "Rule", ContentHash: "rule"},
			Freshness:     markets.MarketFreshness{State: markets.FreshnessFresh, ObservedAt: observed},
			Provenance:    markets.UpstreamProvenance{Source: "polymarket_gamma", ObservedAt: observed, ContentHash: "market"},
		}},
		Checkpoint: catalog.Checkpoint{
			Source: "polymarket_gamma", Stream: "events", Cursor: "0", LastSuccessAt: observed,
		},
	})
}

func integrationPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		t.Fatalf("RunMigrations: %v", err)
	}
	unlock := postgres.LockIntegrationDB()
	t.Cleanup(unlock)
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	if err := postgres.ResetIntegrationMarketsDB(context.Background(), pool); err != nil {
		t.Fatalf("postgres.ResetIntegrationMarketsDB: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func mustSyncer(t *testing.T, store *postgres.Store) *catalog.Syncer {
	t.Helper()
	syncer, err := catalog.NewSyncer(catalog.SyncerConfig{Source: emptyGammaSource{}, Store: store})
	if err != nil {
		t.Fatal(err)
	}
	return syncer
}

type emptyGammaSource struct{}

func (emptyGammaSource) ListEvents(context.Context, int, int) ([]gamma.Event, error) {
	return []gamma.Event{}, nil
}

type failingGammaSource struct {
	err error
}

func (s failingGammaSource) ListEvents(context.Context, int, int) ([]gamma.Event, error) {
	return nil, s.err
}
