package gamma

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestGetEventNormalizesNestedMarkets(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/events/123" {
			t.Fatalf("path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id":"123",
			"slug":"event-a",
			"title":"Event A",
			"description":"Rules summary",
			"resolutionSource":"https://example.com/rules",
			"active":true,
			"closed":false,
			"updatedAt":"2026-07-30T00:00:00Z",
			"markets":[{
				"id":"456",
				"conditionId":"0xabc",
				"question":"Will A happen?",
				"description":"Resolve Yes if A happens.",
				"resolutionSource":"https://example.com/market-rule",
				"active":true,
				"closed":false,
				"enableOrderBook":true,
				"negRisk":false,
				"outcomes":"[\"Yes\",\"No\"]",
				"outcomePrices":"[\"0.42\",\"0.58\"]",
				"clobTokenIds":"[\"token-yes\",\"token-no\"]"
			}]
		}`))
	}))
	defer srv.Close()

	got, err := NewClient(srv.URL).GetEvent(context.Background(), "123")
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != "123" || len(got.Markets) != 1 {
		t.Fatalf("event %+v", got)
	}
	market := got.Markets[0]
	if market.ConditionID != "0xabc" || len(market.Outcomes) != 2 {
		t.Fatalf("market %+v", market)
	}
	if market.Outcomes[0].Name != "Yes" || market.Outcomes[0].TokenID != "token-yes" || market.Outcomes[0].Price != "0.42" {
		t.Fatalf("outcome %+v", market.Outcomes[0])
	}
	if market.ResolutionSource != "https://example.com/market-rule" {
		t.Fatalf("resolution source %q", market.ResolutionSource)
	}
}

func TestGetMarketCanonicalIDShape(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":456,"question":"Will A happen?"}`))
	}))
	defer srv.Close()

	got, err := NewClient(srv.URL).GetMarket(context.Background(), "456")
	if err != nil {
		t.Fatal(err)
	}
	if CanonicalMarketID(got.ID) != "polymarket:market:456" {
		t.Fatalf("canonical %q from upstream id %q", CanonicalMarketID(got.ID), got.ID)
	}
}

func TestGetMarketRejectsMismatchedOutcomeArrays(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id":"456",
			"conditionId":"0xabc",
			"question":"Will A happen?",
			"outcomes":"[\"Yes\",\"No\"]",
			"clobTokenIds":"[\"token-yes\"]"
		}`))
	}))
	defer srv.Close()

	_, err := NewClient(srv.URL).GetMarket(context.Background(), "456")
	if !errors.Is(err, ErrInvalidPayload) {
		t.Fatalf("error %v", err)
	}
}

func TestGammaClassifiesRateLimit(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "throttled", http.StatusTooManyRequests)
	}))
	defer srv.Close()

	_, err := NewClient(srv.URL).ListEvents(context.Background(), 1, 0)
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("error %v", err)
	}
}

func TestGammaClassifiesNotFound(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.NotFound(w, nil)
	}))
	defer srv.Close()

	_, err := NewClient(srv.URL).GetEvent(context.Background(), "missing")
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("error %v", err)
	}
}

func TestGammaRejectsOversizedPayload(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(strings.Repeat("x", maxResponseBytes+1)))
	}))
	defer srv.Close()

	_, err := NewClient(srv.URL).ListEvents(context.Background(), 1, 0)
	if !errors.Is(err, ErrInvalidPayload) {
		t.Fatalf("error %v", err)
	}
}
