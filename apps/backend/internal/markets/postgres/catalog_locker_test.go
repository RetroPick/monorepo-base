package postgres

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
)

func TestCatalogLockerExclusiveAcquireAndRelease(t *testing.T) {
	pool := integrationPool(t)
	lockerA, err := NewCatalogLocker(pool)
	if err != nil {
		t.Fatal(err)
	}
	lockerB, err := NewCatalogLocker(pool)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	leaseA, acquired, err := lockerA.TryAcquire(ctx)
	if err != nil || !acquired || leaseA == nil {
		t.Fatalf("first acquire acquired=%v err=%v", acquired, err)
	}
	defer func() {
		if err := leaseA.Release(ctx); err != nil {
			t.Fatalf("release A: %v", err)
		}
	}()

	_, acquiredB, err := lockerB.TryAcquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if acquiredB {
		t.Fatal("second worker must not acquire while first holds lock")
	}

	if err := leaseA.Release(ctx); err != nil {
		t.Fatal(err)
	}
	leaseA = nil

	leaseB, acquiredB, err := lockerB.TryAcquire(ctx)
	if err != nil || !acquiredB || leaseB == nil {
		t.Fatalf("second acquire after release acquired=%v err=%v", acquiredB, err)
	}
	if err := leaseB.Release(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestCatalogLockerConcurrentWorkersNeverOverlap(t *testing.T) {
	pool := integrationPool(t)
	lockerA, err := NewCatalogLocker(pool)
	if err != nil {
		t.Fatal(err)
	}
	lockerB, err := NewCatalogLocker(pool)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	var wg sync.WaitGroup
	overlap := make(chan struct{}, 1)
	for _, locker := range []*CatalogLocker{lockerA, lockerB} {
		wg.Add(1)
		go func(l *CatalogLocker) {
			defer wg.Done()
			for attempt := 0; attempt < 20; attempt++ {
				lease, acquired, err := l.TryAcquire(ctx)
				if err != nil || !acquired {
					time.Sleep(5 * time.Millisecond)
					continue
				}
				select {
				case overlap <- struct{}{}:
				default:
					t.Error("advisory lock overlap detected")
				}
				time.Sleep(2 * time.Millisecond)
				select {
				case <-overlap:
				default:
				}
				if err := lease.Release(ctx); err != nil {
					t.Errorf("release: %v", err)
				}
			}
		}(locker)
	}
	wg.Wait()
}

func integrationPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		t.Fatalf("RunMigrations: %v", err)
	}
	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}
