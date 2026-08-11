package positions_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/positions"
)

func TestDataAPIClient_ListPositions(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/positions" {
			http.NotFound(w, r)
			return
		}
		if got := r.URL.Query().Get("user"); got != "0xabc" {
			t.Fatalf("user = %q", got)
		}
		_ = json.NewEncoder(w).Encode([]map[string]any{
			{
				"asset":       "tok-1",
				"conditionId": "cond-1",
				"size":        "12.5",
				"avgPrice":    "0.55",
				"outcome":     "Yes",
				"slug":        "test-market",
			},
		})
	}))
	t.Cleanup(srv.Close)

	client := positions.NewDataAPIClient(srv.URL, time.Second)
	rows, observedAt, err := client.ListPositions(context.Background(), positions.VenuePositionRequest{
		AccountWallet: "0xabc",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 {
		t.Fatalf("rows = %+v", rows)
	}
	if rows[0].TokenID != "tok-1" || rows[0].Size != "12.5" {
		t.Fatalf("row = %+v", rows[0])
	}
	if observedAt.IsZero() {
		t.Fatal("expected observedAt")
	}
}

func TestDataAPIClient_RejectsMutatingMethods(t *testing.T) {
	t.Parallel()

	var methods []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		methods = append(methods, r.Method)
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		_, _ = w.Write([]byte("[]"))
	}))
	t.Cleanup(srv.Close)

	client := positions.NewDataAPIClient(srv.URL, time.Second)
	_, _, err := client.ListPositions(context.Background(), positions.VenuePositionRequest{AccountWallet: "0xabc"})
	if err != nil {
		t.Fatal(err)
	}
	for _, method := range methods {
		if method != http.MethodGet {
			t.Fatalf("unexpected method %q", method)
		}
	}
}
