package devseed

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestRefreshReappliesSeedAtInterval(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	calls := 0
	done := make(chan error, 1)
	go func() {
		done <- Refresh(ctx, 10*time.Millisecond, func(context.Context) error {
			calls++
			if calls == 2 {
				cancel()
			}
			return nil
		})
	}()

	if err := <-done; !errors.Is(err, context.Canceled) {
		t.Fatalf("Refresh error = %v, want context cancellation", err)
	}
	if calls != 2 {
		t.Fatalf("apply calls = %d, want 2", calls)
	}
}

func TestRefreshRejectsNonPositiveInterval(t *testing.T) {
	if err := Refresh(context.Background(), 0, func(context.Context) error { return nil }); err == nil {
		t.Fatal("Refresh succeeded with zero interval")
	}
}
