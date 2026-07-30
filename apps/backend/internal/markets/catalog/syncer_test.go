package catalog

import (
	"context"
	"errors"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/gamma"
)

type sourceStub struct {
	rows  []gamma.Event
	calls int
}

func (s *sourceStub) ListEvents(_ context.Context, limit, offset int) ([]gamma.Event, error) {
	s.calls++
	if offset >= len(s.rows) {
		return []gamma.Event{}, nil
	}
	end := offset + limit
	if end > len(s.rows) {
		end = len(s.rows)
	}
	return s.rows[offset:end], nil
}

type repeatingSource struct {
	row   gamma.Event
	calls int
}

func (s *repeatingSource) ListEvents(_ context.Context, limit, _ int) ([]gamma.Event, error) {
	s.calls++
	rows := make([]gamma.Event, limit)
	for i := range rows {
		rows[i] = s.row
	}
	return rows, nil
}

type storeStub struct {
	pages []Page
	err   error
}

func (s *storeStub) ApplyPage(_ context.Context, page Page) error {
	if s.err != nil {
		return s.err
	}
	s.pages = append(s.pages, page)
	return nil
}

func TestSyncerCompletesCycleOnShortPage(t *testing.T) {
	t.Parallel()

	source := &sourceStub{rows: []gamma.Event{catalogFixture()}}
	store := &storeStub{}
	syncer, err := NewSyncer(SyncerConfig{Source: source, Store: store})
	if err != nil {
		t.Fatal(err)
	}

	result, err := syncer.Run(context.Background(), RunOptions{PageSize: 10, MaxPages: 5})
	if err != nil {
		t.Fatal(err)
	}
	if !result.CycleComplete || result.LimitReached {
		t.Fatalf("result %+v", result)
	}
	if len(store.pages) != 1 {
		t.Fatalf("pages %d", len(store.pages))
	}
	if store.pages[0].Checkpoint.Cursor != "0" {
		t.Fatalf("checkpoint cursor %q", store.pages[0].Checkpoint.Cursor)
	}
}

func TestSyncerEmptyPageCompletesCycleWithoutApply(t *testing.T) {
	t.Parallel()

	source := &sourceStub{rows: []gamma.Event{}}
	store := &storeStub{}
	syncer, err := NewSyncer(SyncerConfig{Source: source, Store: store})
	if err != nil {
		t.Fatal(err)
	}

	result, err := syncer.Run(context.Background(), RunOptions{PageSize: 10, MaxPages: 1, StartOffset: 50})
	if err != nil {
		t.Fatal(err)
	}
	if !result.CycleComplete || result.Pages != 0 {
		t.Fatalf("result %+v pages %d", result, len(store.pages))
	}
	if len(store.pages) != 0 {
		t.Fatal("empty terminal page must not apply projection")
	}
}

func TestSyncerMapsCatalogAndAdvancesCheckpointAtomically(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 7, 30, 3, 0, 0, 0, time.UTC)
	source := &sourceStub{rows: []gamma.Event{catalogFixture()}}
	store := &storeStub{}
	syncer, err := NewSyncer(SyncerConfig{
		Source: source,
		Store:  store,
		Now:    func() time.Time { return now },
	})
	if err != nil {
		t.Fatal(err)
	}

	result, err := syncer.Run(context.Background(), RunOptions{PageSize: 2, MaxPages: 2})
	if err != nil {
		t.Fatal(err)
	}
	if result.Events != 1 || result.Markets != 1 || result.Pages != 1 || !result.CycleComplete {
		t.Fatalf("result %+v", result)
	}
	if len(store.pages) != 1 {
		t.Fatalf("pages %d", len(store.pages))
	}
	page := store.pages[0]
	if page.Checkpoint.Cursor != "0" || !page.Checkpoint.LastSuccessAt.Equal(now) {
		t.Fatalf("checkpoint %+v", page.Checkpoint)
	}
	event := page.Events[0]
	if event.ID != "polymarket:event:123" || event.SchemaVersion != markets.SchemaVersion {
		t.Fatalf("event %+v", event)
	}
	market := page.Markets[0]
	if market.ID != "polymarket:market:456" || market.EventID != event.ID {
		t.Fatalf("market %+v", market)
	}
	if market.Outcomes[0].ID != "polymarket:token:token-yes" {
		t.Fatalf("outcome %+v", market.Outcomes[0])
	}
	if market.Resolution.ContentHash == "" || len(page.RawEvents) != 1 {
		t.Fatalf("page %+v", page)
	}
}

func TestSyncerDoesNotAdvanceCheckpointWhenProjectionFails(t *testing.T) {
	t.Parallel()

	source := &sourceStub{rows: []gamma.Event{catalogFixture()}}
	store := &storeStub{err: errors.New("write failed")}
	syncer, err := NewSyncer(SyncerConfig{Source: source, Store: store})
	if err != nil {
		t.Fatal(err)
	}

	result, err := syncer.Run(context.Background(), RunOptions{PageSize: 1, MaxPages: 1})
	if err == nil {
		t.Fatal("Run succeeded")
	}
	if result.Pages != 0 || len(store.pages) != 0 {
		t.Fatalf("result %+v pages %d", result, len(store.pages))
	}
}

func TestSyncerBoundsBackfillPages(t *testing.T) {
	t.Parallel()

	source := &repeatingSource{row: catalogFixture()}
	store := &storeStub{}
	syncer, err := NewSyncer(SyncerConfig{Source: source, Store: store})
	if err != nil {
		t.Fatal(err)
	}

	result, err := syncer.Run(context.Background(), RunOptions{PageSize: 1, MaxPages: 2})
	if err != nil {
		t.Fatal(err)
	}
	if source.calls != 2 || result.Pages != 2 || !result.LimitReached {
		t.Fatalf("calls %d result %+v", source.calls, result)
	}
}

func TestRuleHashIsDeterministicAndChangesWithRule(t *testing.T) {
	t.Parallel()

	first := catalogFixture()
	second := catalogFixture()
	firstRule := MapEvent(first, time.Unix(1, 0).UTC()).Markets[0].Resolution.ContentHash
	secondRule := MapEvent(second, time.Unix(2, 0).UTC()).Markets[0].Resolution.ContentHash
	if firstRule != secondRule {
		t.Fatalf("same rule hashes differ: %s %s", firstRule, secondRule)
	}
	second.Markets[0].Description = "Changed resolution rule"
	changed := MapEvent(second, time.Unix(2, 0).UTC()).Markets[0].Resolution.ContentHash
	if changed == firstRule {
		t.Fatal("changed rule retained the same hash")
	}
}

func TestMapEventPreservesTombstoneStatus(t *testing.T) {
	t.Parallel()

	row := catalogFixture()
	row.Active = false
	row.Closed = true
	row.Archived = true
	mapped := MapEvent(row, time.Unix(1, 0).UTC())
	if mapped.Event.Status != markets.MarketStatusArchived {
		t.Fatalf("status %q", mapped.Event.Status)
	}
}

func catalogFixture() gamma.Event {
	updated := time.Date(2026, 7, 30, 2, 59, 0, 0, time.UTC)
	return gamma.Event{
		ID:               "123",
		Slug:             "event-a",
		Title:            "Event A",
		Description:      "Event rules",
		ResolutionSource: "https://example.com/event",
		UpdatedAt:        &updated,
		Active:           true,
		Markets: []gamma.Market{{
			ID:               "456",
			ConditionID:      "0xabc",
			Question:         "Will A happen?",
			Description:      "Resolve Yes if A happens.",
			ResolutionSource: "https://example.com/market",
			UpdatedAt:        &updated,
			Active:           true,
			EnableOrderBook:  true,
			Outcomes: []gamma.Outcome{
				{Name: "Yes", TokenID: "token-yes", Price: "0.42"},
				{Name: "No", TokenID: "token-no", Price: "0.58"},
			},
		}},
	}
}
