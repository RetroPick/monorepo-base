package gamma

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestListEventsNormalizesIDs(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/events" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("limit"); got != "2" {
			t.Fatalf("limit %q", got)
		}
		if got := r.URL.Query().Get("offset"); got != "10" {
			t.Fatalf("offset %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[
			{"id":123,"slug":"event-a","title":"Event A"},
			{"id":"456","slug":"event-b","title":"Event B"}
		]`))
	}))
	defer srv.Close()

	c := NewClient(srv.URL)
	got, err := c.ListEvents(context.Background(), 2, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 {
		t.Fatalf("len %d", len(got))
	}
	if got[0].ID != "123" || got[0].Slug != "event-a" {
		t.Fatalf("first %+v", got[0])
	}
}
