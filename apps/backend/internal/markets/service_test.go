package markets

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/gamma"
)

type stubCatalog struct {
	rows []gamma.Event
}

func (s stubCatalog) ListEvents(_ context.Context, limit, offset int) ([]gamma.Event, error) {
	if offset >= len(s.rows) {
		return []gamma.Event{}, nil
	}
	end := offset + limit
	if end > len(s.rows) {
		end = len(s.rows)
	}
	return s.rows[offset:end], nil
}

func TestEligibilityFailsClosed(t *testing.T) {
	svc := NewService(ServiceConfig{})
	got := svc.Eligibility(context.Background())
	if got.Eligible {
		t.Fatal("expected eligible=false")
	}
	if got.Reason == "" {
		t.Fatal("expected reason")
	}
}

func TestCapabilitiesStub(t *testing.T) {
	svc := NewService(ServiceConfig{})
	got := svc.Capabilities(context.Background())
	if got.Catalog {
		t.Fatal("expected catalog=false when disabled")
	}
}

func TestListEventsGamma(t *testing.T) {
	fixed := time.Date(2026, 7, 24, 12, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		CatalogEnabled: true,
		Catalog: stubCatalog{rows: []gamma.Event{
			{ID: "1", Slug: "a", Title: "Alpha"},
			{ID: "2", Slug: "b", Title: "Beta"},
		}},
		Now: func() time.Time { return fixed },
	})

	got, err := svc.ListEvents(context.Background(), "", 50)
	if err != nil {
		t.Fatal(err)
	}
	if got.Source != "gamma" || len(got.Events) != 2 {
		t.Fatalf("got %+v", got)
	}
	if got.Events[0].Title != "Alpha" {
		t.Fatalf("event %+v", got.Events[0])
	}
}

func TestListEventsPaginationCursor(t *testing.T) {
	svc := NewService(ServiceConfig{
		CatalogEnabled: true,
		Catalog: stubCatalog{rows: []gamma.Event{
			{ID: "1", Title: "One"},
			{ID: "2", Title: "Two"},
		}},
	})

	got, err := svc.ListEvents(context.Background(), "", 1)
	if err != nil {
		t.Fatal(err)
	}
	if got.Cursor == nil || *got.Cursor != "1" {
		t.Fatalf("cursor %+v", got.Cursor)
	}
}
