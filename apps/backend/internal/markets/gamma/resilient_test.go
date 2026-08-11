package gamma

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestResilientClientCacheHit(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"id":"1","title":"Event A"}]`))
	}))
	defer srv.Close()

	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	client := NewResilientClient(srv.URL, ResilientConfig{
		CacheTTL: time.Minute,
		Now:      func() time.Time { return now },
	})

	ctx := context.Background()
	first, err := client.ListEvents(ctx, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	second, err := client.ListEvents(ctx, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 1 {
		t.Fatalf("calls %d", calls.Load())
	}
	if len(first) != 1 || len(second) != 1 || first[0].ID != "1" {
		t.Fatalf("first %+v second %+v", first, second)
	}
}

func TestResilientClient429Retry(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if calls.Add(1) == 1 {
			w.Header().Set("Retry-After", "0")
			http.Error(w, "throttled", http.StatusTooManyRequests)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"123","title":"Event A"}`))
	}))
	defer srv.Close()

	client := NewResilientClient(srv.URL, ResilientConfig{
		CacheTTL:          time.Minute,
		Max429Retries:     2,
		Initial429Backoff: time.Millisecond,
	})
	got, err := client.GetEvent(context.Background(), "123")
	if err != nil {
		t.Fatal(err)
	}
	if got.ID != "123" || calls.Load() != 2 {
		t.Fatalf("event %+v calls %d", got, calls.Load())
	}
}

func TestResilientClientCircuitBreaker(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "boom", http.StatusBadGateway)
	}))
	defer srv.Close()

	now := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	client := NewResilientClient(srv.URL, ResilientConfig{
		FailureThreshold: 2,
		CircuitCooldown:  time.Minute,
		Now:              func() time.Time { return now },
	})
	ctx := context.Background()
	for i := 0; i < 2; i++ {
		_, err := client.ListEvents(ctx, 1, 0)
		if !errors.Is(err, ErrUpstream) {
			t.Fatalf("attempt %d: error %v", i+1, err)
		}
	}
	_, err := client.ListEvents(ctx, 1, 0)
	if !errors.Is(err, ErrUpstream) {
		t.Fatalf("circuit open error %v", err)
	}
}

func TestResilientClientDoesNotReturnExpiredCacheAfterUpstreamFailure(t *testing.T) {
	t.Parallel()

	var calls atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if calls.Add(1) == 1 {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"id":"456","question":"Will A happen?"}`))
			return
		}
		http.Error(w, "boom", http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	start := time.Date(2026, 7, 30, 12, 0, 0, 0, time.UTC)
	now := start
	client := NewResilientClient(srv.URL, ResilientConfig{
		CacheTTL:         time.Second,
		FailureThreshold: 1,
		CircuitCooldown:  time.Minute,
		Now:              func() time.Time { return now },
	})
	ctx := context.Background()

	first, err := client.GetMarket(ctx, "456")
	if err != nil {
		t.Fatal(err)
	}
	if first.Question != "Will A happen?" {
		t.Fatalf("first %+v", first)
	}

	now = start.Add(2 * time.Second)
	if _, err := client.GetMarket(ctx, "456"); err == nil {
		t.Fatal("expected expired cache to be rejected after upstream failure")
	}
	if calls.Load() != 2 {
		t.Fatalf("calls %d", calls.Load())
	}
}
