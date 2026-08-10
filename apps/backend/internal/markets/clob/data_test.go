package clob

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestListOpenOrdersHappyPath(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/data/orders" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if r.Method != http.MethodGet {
			t.Fatalf("method %s", r.Method)
		}
		if r.Header.Get("POLY_API_KEY") == "" {
			t.Fatal("missing L2 headers")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"id":"ord-1","client_order_id":"coid-1","asset_id":"tok-1","side":"buy","price":"0.55","original_size":"10","maker_amount":"5500000","taker_amount":"10000000","salt":479249096354,"status":"live","maker_address":"0xabc","created_at":"2026-01-01T00:00:00Z"}]`))
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})

	rows, err := client.ListOpenOrders(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].OrderID != "ord-1" || rows[0].Side != "BUY" {
		t.Fatalf("rows %+v", rows)
	}
	if rows[0].ClientOrderID != "coid-1" || rows[0].Salt != "479249096354" {
		t.Fatalf("match ids %+v", rows[0])
	}
	if rows[0].MakerAmount != "5500000" || rows[0].TakerAmount != "10000000" {
		t.Fatalf("amounts %+v", rows[0])
	}
}

func TestListTradesHappyPath(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/data/trades" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if r.Method != http.MethodGet {
			t.Fatalf("method %s", r.Method)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"id":"trade-9","taker_order_id":"ord-9","asset_id":"tok-9","side":"sell","price":"0.42","size":"3","status":"matched","match_time":"2026-01-01T00:00:00Z"}]`))
	}))
	defer srv.Close()

	client := NewTradingClient(TradingClientConfig{
		BaseURL: srv.URL,
		Creds:   StaticCredentialProvider{Creds: SandboxCredentials()},
	})

	rows, err := client.ListTrades(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 1 || rows[0].TradeID != "trade-9" || rows[0].OrderID != "ord-9" {
		t.Fatalf("rows %+v", rows)
	}
}
