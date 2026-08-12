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

func TestDataAPIClient_ListPositionsMapsCanonicalEconomicsWithoutInventingMissingValues(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]map[string]any{
			{
				"asset": "tok-complete", "conditionId": "cond-complete", "size": 12.5, "avgPrice": 0.55,
				"curPrice": 0.64, "initialValue": 6.875, "currentValue": 8, "cashPnl": 1.125, "realizedPnl": -0.25, "redeemable": true,
			},
			{
				"asset": "tok-partial", "conditionId": "cond-partial", "size": 3, "avgPrice": 0.5,
				// Explicit zero is canonical; omitted economics stay unavailable.
				"cashPnl": 0,
			},
		})
	}))
	t.Cleanup(srv.Close)

	rows, _, err := positions.NewDataAPIClient(srv.URL, time.Second).ListPositions(context.Background(), positions.VenuePositionRequest{AccountWallet: "0xabc"})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 {
		t.Fatalf("rows = %+v", rows)
	}
	complete := rows[0]
	if complete.MarkPrice != "0.64" || complete.CostBasisAmount != "6875000" || complete.UnrealizedPnL != "1.125" || complete.RealizedPnL != "-0.25" || complete.ClaimableAmount != "8" || !complete.Redeemable {
		t.Fatalf("complete economics = %+v", complete)
	}
	if !complete.MarkPriceAvailable || !complete.CostBasisAvailable || !complete.UnrealizedPnLAvailable || !complete.RealizedPnLAvailable || !complete.RedeemableAvailable || !complete.ClaimableAmountAvailable {
		t.Fatalf("complete economics availability = %+v", complete)
	}
	if complete.UnrealizedPnL == complete.RealizedPnL {
		t.Fatalf("cashPnl and realizedPnl must remain distinct components: %+v", complete)
	}
	partial := rows[1]
	if partial.MarkPrice != "" || partial.CostBasisAmount != "" || partial.RealizedPnL != "" || partial.ClaimableAmount != "" || partial.UnrealizedPnL != "0" || partial.Redeemable {
		t.Fatalf("partial economics = %+v", partial)
	}
	if partial.MarkPriceAvailable || partial.CostBasisAvailable || partial.RealizedPnLAvailable || partial.ClaimableAmountAvailable || partial.RedeemableAvailable || !partial.UnrealizedPnLAvailable {
		t.Fatalf("partial economics availability = %+v", partial)
	}
}

func TestDataAPIClient_ListPositionsRejectsInconsistentCurrentValueForClaimableAmount(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode([]map[string]any{{"asset": "tok-inconsistent", "conditionId": "cond-inconsistent", "size": 12.5, "curPrice": 0.64, "currentValue": 8.01, "redeemable": true}})
	}))
	t.Cleanup(srv.Close)
	rows, _, err := positions.NewDataAPIClient(srv.URL, time.Second).ListPositions(context.Background(), positions.VenuePositionRequest{AccountWallet: "0xabc"})
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].ClaimableAmountAvailable || rows[0].ClaimableAmount != "" {
		t.Fatalf("inconsistent current value became claimable economics: %+v", rows)
	}
}
