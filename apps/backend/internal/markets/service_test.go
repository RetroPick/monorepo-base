package markets

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/eligibility"
	"retropick/apps/backend/internal/markets/gamma"
)

type stubCatalog struct {
	rows   []gamma.Event
	event  gamma.Event
	market gamma.Market
	err    error
}

func (s stubCatalog) ListEvents(_ context.Context, limit, offset int) ([]gamma.Event, error) {
	if s.err != nil {
		return nil, s.err
	}
	if offset >= len(s.rows) {
		return []gamma.Event{}, nil
	}
	end := offset + limit
	if end > len(s.rows) {
		end = len(s.rows)
	}
	return s.rows[offset:end], nil
}

func (s stubCatalog) GetEvent(_ context.Context, _ string) (gamma.Event, error) {
	if s.err != nil {
		return gamma.Event{}, s.err
	}
	return s.event, nil
}

func (s stubCatalog) GetMarket(_ context.Context, _ string) (gamma.Market, error) {
	if s.err != nil {
		return gamma.Market{}, s.err
	}
	return s.market, nil
}

type stubMarketData struct {
	book    clob.OrderBook
	history []clob.PricePoint
	err     error
}

type stubProcessor struct{}

func (stubProcessor) BuildSnapshot(marketID string, book clob.OrderBook, observedAt time.Time, maxAge time.Duration) (OrderBookSnapshot, error) {
	state := FreshnessFresh
	reason := ""
	if observedAt.Sub(book.Timestamp) > maxAge {
		state = FreshnessStale
		reason = "snapshot_age_exceeded"
	}
	bids := make([]OrderBookLevel, 0, len(book.Bids))
	for _, level := range book.Bids {
		bids = append(bids, OrderBookLevel{Price: mustServiceDecimal(level.Price), Size: mustServiceDecimal(level.Size)})
	}
	asks := make([]OrderBookLevel, 0, len(book.Asks))
	for _, level := range book.Asks {
		asks = append(asks, OrderBookLevel{Price: mustServiceDecimal(level.Price), Size: mustServiceDecimal(level.Size)})
	}
	return OrderBookSnapshot{
		SchemaVersion: SchemaVersion,
		MarketID:      marketID,
		ConditionID:   book.ConditionID,
		TokenID:       book.TokenID,
		Hash:          book.Hash,
		Timestamp:     book.Timestamp,
		Bids:          bids,
		Asks:          asks,
		Freshness:     MarketFreshness{State: state, Reason: reason, ObservedAt: observedAt},
		Provenance:    UpstreamProvenance{Source: "polymarket_clob", ObservedAt: observedAt},
	}, nil
}

func (stubProcessor) NormalizeHistory(rows []clob.PricePoint) ([]PricePoint, error) {
	points := make([]PricePoint, 0, len(rows))
	for _, row := range rows {
		points = append(points, PricePoint{
			Timestamp: row.Timestamp,
			Price:     mustServiceDecimal(row.Price),
			Source:    "polymarket_clob",
		})
	}
	return points, nil
}

func (stubProcessor) Health(snapshot OrderBookSnapshot, observedAt time.Time) (MarketHealthSnapshot, error) {
	bidDepth := mustServiceDecimal("0")
	if len(snapshot.Bids) > 0 {
		bidDepth = snapshot.Bids[0].Size
	}
	askDepth := mustServiceDecimal("0")
	if len(snapshot.Asks) > 0 {
		askDepth = snapshot.Asks[0].Size
	}
	return MarketHealthSnapshot{
		SchemaVersion: SchemaVersion,
		MarketID:      snapshot.MarketID,
		Algorithm:     "market-health-components-v1",
		ObservedAt:    observedAt,
		BidDepth:      bidDepth,
		AskDepth:      askDepth,
		Freshness:     snapshot.Freshness,
		Provenance:    snapshot.Provenance,
	}, nil
}

func mustServiceDecimal(raw string) DecimalString {
	value, err := ParseDecimalString(raw)
	if err != nil {
		panic(err)
	}
	return value
}

func (s stubMarketData) GetOrderBook(_ context.Context, _ string) (clob.OrderBook, error) {
	return s.book, s.err
}

func (s stubMarketData) GetPriceHistory(_ context.Context, _ clob.PriceHistoryRequest) ([]clob.PricePoint, error) {
	return s.history, s.err
}

func TestEligibilityFailsClosed(t *testing.T) {
	svc := NewService(ServiceConfig{})
	got := svc.Eligibility(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible {
		t.Fatal("expected eligible=false")
	}
	if got.Reason != eligibility.ReasonGeoUnknown {
		t.Fatalf("reason %q want %q", got.Reason, eligibility.ReasonGeoUnknown)
	}
}

func eligibilityFixturePath(parts ...string) string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		panic("runtime.Caller failed")
	}
	base := filepath.Join(filepath.Dir(file), "eligibility")
	return filepath.Join(append([]string{base}, parts...)...)
}

func newEligibilityGeoFixtureServer(t *testing.T) *httptest.Server {
	t.Helper()
	body, err := os.ReadFile(eligibilityFixturePath("geo", "testdata", "us.json"))
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/203.0.113.1/json" {
			t.Fatalf("geo path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func newEligibilityGeoblockFixtureServer(t *testing.T, name string) *httptest.Server {
	t.Helper()
	body, err := os.ReadFile(eligibilityFixturePath("geoblock", "testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestProductionEligibilityEvaluatorEnvWiring(t *testing.T) {
	geoSrv := newEligibilityGeoFixtureServer(t)
	geoblockSrv := newEligibilityGeoblockFixtureServer(t, "allowed.json")

	t.Setenv("MARKETS_GEOIP_BASE_URL", geoSrv.URL)
	t.Setenv("MARKETS_GEOIP_PATH", "/{ip}/json")
	t.Setenv("MARKETS_GEOBLOCK_BASE_URL", geoblockSrv.URL)
	t.Setenv("MARKETS_GEOBLOCK_PATH", "/api/geoblock")

	eval := ProductionEligibilityEvaluator(nil)
	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if !got.Eligible || got.Reason != "" || got.Region != "US" {
		t.Fatalf("got %+v", got)
	}
}

func TestProductionEligibilityEvaluatorFailsClosedWithoutGeoEnv(t *testing.T) {
	geoblockSrv := newEligibilityGeoblockFixtureServer(t, "allowed.json")

	t.Setenv("MARKETS_GEOIP_BASE_URL", "")
	t.Setenv("MARKETS_GEOBLOCK_BASE_URL", geoblockSrv.URL)
	t.Setenv("MARKETS_GEOBLOCK_PATH", "/api/geoblock")

	eval := ProductionEligibilityEvaluator(nil)
	got := eval.Check(context.Background(), eligibility.Input{ClientIP: "203.0.113.1"})
	if got.Eligible || got.Reason != eligibility.ReasonGeoUnknown {
		t.Fatalf("got %+v", got)
	}
}

func TestCapabilitiesStub(t *testing.T) {
	svc := NewService(ServiceConfig{})
	got := svc.Capabilities(context.Background())
	if got.Catalog {
		t.Fatal("expected catalog=false when disabled")
	}
	if got.Source != "stub" || got.Trading {
		t.Fatalf("capabilities %+v", got)
	}
}

func TestListEventsGamma(t *testing.T) {
	fixed := time.Date(2026, 7, 24, 12, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		CatalogEnabled:    true,
		CatalogProjection: stubProjection{
			observed: fixed,
			events: []EventSummary{
				{ID: "polymarket:event:1", Title: "Alpha", Provenance: UpstreamProvenance{ContentHash: "a"}},
				{ID: "polymarket:event:2", Title: "Beta", Provenance: UpstreamProvenance{ContentHash: "b"}},
			},
		},
		CatalogWorker: projectionTestWorker(),
		Now:           func() time.Time { return fixed },
	})

	got, err := svc.ListEvents(context.Background(), "", 50)
	if err != nil {
		t.Fatal(err)
	}
	if got.Source != "retropick_projection" || len(got.Events) != 2 {
		t.Fatalf("got %+v", got)
	}
	if got.Events[0].Title != "Alpha" {
		t.Fatalf("event %+v", got.Events[0])
	}
}

func TestListEventsPaginationCursor(t *testing.T) {
	fixed := time.Date(2026, 7, 24, 12, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		CatalogEnabled: true,
		CatalogProjection: stubProjection{
			observed: fixed,
			events: []EventSummary{
				{ID: "polymarket:event:1", Title: "One"},
				{ID: "polymarket:event:2", Title: "Two"},
			},
		},
		CatalogWorker: projectionTestWorker(),
		Now:           func() time.Time { return fixed },
	})

	got, err := svc.ListEvents(context.Background(), "", 1)
	if err != nil {
		t.Fatal(err)
	}
	if got.Cursor == nil || *got.Cursor != "1" {
		t.Fatalf("cursor %+v", got.Cursor)
	}
}

func TestListEventsRejectsInvalidCursor(t *testing.T) {
	t.Parallel()

	svc := NewService(ServiceConfig{
		CatalogEnabled:    true,
		CatalogProjection: stubProjection{observed: time.Now().UTC()},
		CatalogWorker:     projectionTestWorker(),
	})
	_, err := svc.ListEvents(context.Background(), "not-a-cursor", 10)
	if !errors.Is(err, ErrInvalidArgument) {
		t.Fatalf("error %v", err)
	}
}

func TestGetEventMapsRuleProvenance(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	event := EventDetail{
		ID:         "polymarket:event:123",
		Title:      "Event A",
		Status:     MarketStatusOpen,
		Markets: []MarketSummary{{
			ID: "polymarket:market:456",
			Outcomes: []Outcome{{
				Price: ptrDecimal("0.4"),
			}},
		}},
	}
	svc := NewService(ServiceConfig{
		CatalogEnabled:    true,
		CatalogProjection: stubProjection{observed: fixed, event: event, events: []EventSummary{{ID: event.ID}}},
		CatalogWorker:     projectionTestWorker(),
		Now:               func() time.Time { return fixed },
	})
	got, err := svc.GetEvent(context.Background(), "polymarket:event:123")
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != "polymarket:event:123" || len(got.Markets) != 1 {
		t.Fatalf("event %+v", got)
	}
	if got.Markets[0].Outcomes[0].Price == nil || *got.Markets[0].Outcomes[0].Price != "0.4" {
		t.Fatalf("market %+v", got.Markets[0])
	}
}

func TestGetMarketIncludesResolutionRule(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	market := MarketDetail{
		ID:          "polymarket:market:456",
		ConditionID: "0xabc",
		Question:    "Will A happen?",
		Resolution: ResolutionRule{
			ContentHash: "hash",
			Sources:     []ResolutionSource{{Name: "source", URL: "https://example.com/rule"}},
		},
	}
	svc := NewService(ServiceConfig{
		CatalogEnabled:    true,
		CatalogProjection: stubProjection{observed: fixed, market: market},
		CatalogWorker:     projectionTestWorker(),
		Now:               func() time.Time { return fixed },
	})
	got, err := svc.GetMarket(context.Background(), "polymarket:market:456")
	if err != nil {
		t.Fatal(err)
	}
	if got.Resolution.ContentHash == "" || len(got.Resolution.Sources) != 1 {
		t.Fatalf("market %+v", got)
	}
}

func ptrDecimal(raw string) *DecimalString {
	value := DecimalString(raw)
	return &value
}

func TestGetOrderBookLabelsStaleSnapshot(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		MarketDataEnabled: true,
		MarketData: stubMarketData{book: clob.OrderBook{
			ConditionID:  "0xabc",
			TokenID:      "token-yes",
			Timestamp:    fixed.Add(-10 * time.Second),
			Hash:         "book-hash",
			Bids:         []clob.Level{{Price: "0.4", Size: "1"}},
			Asks:         []clob.Level{{Price: "0.6", Size: "1"}},
			MinOrderSize: "1",
			TickSize:     "0.01",
		}},
		MarketProcessor: stubProcessor{},
		BookMaxAge:      5 * time.Second,
		Now:             func() time.Time { return fixed },
	})
	got, err := svc.GetOrderBook(context.Background(), "market-1", "token-yes")
	if err != nil {
		t.Fatal(err)
	}
	if got.Freshness.State != FreshnessStale {
		t.Fatalf("freshness %+v", got.Freshness)
	}
}

func TestGetHistoryPreservesSparsePoints(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		MarketDataEnabled: true,
		MarketData: stubMarketData{history: []clob.PricePoint{
			{Timestamp: fixed.Add(-time.Hour), Price: "0.4"},
			{Timestamp: fixed, Price: "0.5"},
		}},
		MarketProcessor: stubProcessor{},
		Now:             func() time.Time { return fixed },
	})
	got, err := svc.GetHistory(context.Background(), "market-1", "token-yes", "1d", 60)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Points) != 2 || got.Points[1].Price != "0.5" {
		t.Fatalf("history %+v", got)
	}
}

func TestGetHealthComputesComponentsFromSnapshot(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		MarketDataEnabled: true,
		MarketData: stubMarketData{book: clob.OrderBook{
			ConditionID:  "0xabc",
			TokenID:      "token-yes",
			Timestamp:    fixed,
			Hash:         "book-hash",
			Bids:         []clob.Level{{Price: "0.4", Size: "2"}},
			Asks:         []clob.Level{{Price: "0.6", Size: "3"}},
			MinOrderSize: "1",
			TickSize:     "0.01",
		}},
		MarketProcessor: stubProcessor{},
		BookMaxAge:      5 * time.Second,
		Now:             func() time.Time { return fixed },
	})
	got, err := svc.GetHealth(context.Background(), "market-1", "token-yes")
	if err != nil {
		t.Fatal(err)
	}
	if got.BidDepth != "2" || got.AskDepth != "3" {
		t.Fatalf("health %+v", got)
	}
}

func TestListEventsRecordsCatalogFreshness(t *testing.T) {
	gamma.ResetCatalogFreshnessMetrics()
	fixed := time.Date(2026, 7, 30, 6, 0, 0, 0, time.UTC)
	observed := fixed.Add(-30 * time.Second)
	svc := NewService(ServiceConfig{
		CatalogEnabled: true,
		CatalogProjection: stubProjection{
			observed: observed,
			events:   []EventSummary{{ID: "polymarket:event:1", Title: "One"}},
		},
		CatalogWorker: projectionTestWorker(),
		Now:           func() time.Time { return fixed },
	})
	if _, err := svc.ListEvents(context.Background(), "", 10); err != nil {
		t.Fatal(err)
	}
	if got := gamma.CatalogFreshnessP95(); got != 30 {
		t.Fatalf("p95 %v", got)
	}
}
