package markets

import (
	"testing"
	"time"
)

func TestComputeEventsETagWeakIncludesPageDimensions(t *testing.T) {
	t.Parallel()
	observed := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	cursor := "10"
	body := EventsListResponse{
		Events: []EventSummary{{
			ID:         "polymarket:event:1",
			Provenance: UpstreamProvenance{ContentHash: "hash-1"},
		}},
		Page:       PageInfo{NextCursor: &cursor, Limit: 25},
		Provenance: UpstreamProvenance{ObservedAt: observed},
	}
	etag := computeEventsETag(body)
	if etag[:3] != `W/"` {
		t.Fatalf("expected weak etag, got %q", etag)
	}
	otherPage := body
	otherPage.Page.Limit = 50
	if computeEventsETag(otherPage) == etag {
		t.Fatal("different limits must not share etag")
	}
}

func TestEtagMatchesCommaSeparatedAndWildcard(t *testing.T) {
	t.Parallel()
	etag := `W/"abc123"`
	if !etagMatches(`W/"abc123", W/"other"`, etag) {
		t.Fatal("expected comma-separated match")
	}
	if !etagMatches("*", etag) {
		t.Fatal("expected wildcard match")
	}
	if etagMatches(`W/"other"`, etag) {
		t.Fatal("unexpected match")
	}
}
