package clob

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestGetOrderBookNormalizesPublicSnapshot(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/book" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("token_id"); got != "token-yes" {
			t.Fatalf("token_id %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"market":"0xabc",
			"asset_id":"token-yes",
			"timestamp":"1782753357257",
			"hash":"book-hash",
			"bids":[{"price":"0.01","size":"10"},{"price":"0.40","size":"5.5"}],
			"asks":[{"price":"0.99","size":"8"},{"price":"0.60","size":"4"}],
			"min_order_size":"5",
			"tick_size":"0.01",
			"neg_risk":false,
			"last_trade_price":"0.42"
		}`))
	}))
	defer srv.Close()

	got, err := NewClient(srv.URL).GetOrderBook(context.Background(), "token-yes")
	if err != nil {
		t.Fatal(err)
	}
	if got.ConditionID != "0xabc" || got.TokenID != "token-yes" || got.Hash != "book-hash" {
		t.Fatalf("book %+v", got)
	}
	if got.Timestamp.UnixMilli() != 1782753357257 {
		t.Fatalf("timestamp %s", got.Timestamp)
	}
	if len(got.Bids) != 2 || got.Bids[1].Price != "0.40" {
		t.Fatalf("bids %+v", got.Bids)
	}
}

func TestGetOrderBookRejectsInvalidDecimal(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"market":"0xabc",
			"asset_id":"token-yes",
			"timestamp":"1782753357257",
			"hash":"book-hash",
			"bids":[{"price":"NaN","size":"10"}],
			"asks":[],
			"min_order_size":"5",
			"tick_size":"0.01",
			"neg_risk":false
		}`))
	}))
	defer srv.Close()

	_, err := NewClient(srv.URL).GetOrderBook(context.Background(), "token-yes")
	if !errors.Is(err, ErrInvalidPayload) {
		t.Fatalf("error %v", err)
	}
}

func TestGetPriceHistoryPreservesDecimalTextAndGaps(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/prices-history" {
			t.Fatalf("path %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("market"); got != "token-yes" {
			t.Fatalf("market %q", got)
		}
		if got := r.URL.Query().Get("interval"); got != "1d" {
			t.Fatalf("interval %q", got)
		}
		if got := r.URL.Query().Get("fidelity"); got != "60" {
			t.Fatalf("fidelity %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"history":[
			{"t":1782666007,"p":0.085},
			{"t":1782673206,"p":"0.1250"}
		]}`))
	}))
	defer srv.Close()

	got, err := NewClient(srv.URL).GetPriceHistory(context.Background(), PriceHistoryRequest{
		TokenID:  "token-yes",
		Interval: "1d",
		Fidelity: 60,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Price != "0.085" || got[1].Price != "0.1250" {
		t.Fatalf("history %+v", got)
	}
	if got[1].Timestamp.Sub(got[0].Timestamp) <= time.Hour {
		t.Fatal("sparse history gap was collapsed")
	}
}

func TestGetPriceHistoryRejectsUnboundedQuery(t *testing.T) {
	t.Parallel()

	_, err := NewClient("https://clob.polymarket.com").GetPriceHistory(context.Background(), PriceHistoryRequest{
		TokenID:  "token-yes",
		Fidelity: 60,
	})
	if !errors.Is(err, ErrInvalidRequest) {
		t.Fatalf("error %v", err)
	}
}

func TestCLOBClassifiesRateLimit(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "throttled", http.StatusTooManyRequests)
	}))
	defer srv.Close()

	_, err := NewClient(srv.URL).GetOrderBook(context.Background(), "token-yes")
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("error %v", err)
	}
}

func TestCLOBRejectsOversizedPayload(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(strings.Repeat("x", maxResponseBytes+1)))
	}))
	defer srv.Close()

	_, err := NewClient(srv.URL).GetOrderBook(context.Background(), "token-yes")
	if !errors.Is(err, ErrInvalidPayload) {
		t.Fatalf("error %v", err)
	}
}
