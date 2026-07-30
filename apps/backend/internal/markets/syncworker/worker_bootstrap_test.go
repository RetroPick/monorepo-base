package syncworker

import (
	"context"
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/postgres"
)

type readerStub struct {
	status postgres.ProjectionStatus
	err    error
}

func (r *readerStub) ProjectionStatus(context.Context) (postgres.ProjectionStatus, error) {
	return r.status, r.err
}

type lockerStub struct {
	acquired bool
}

func (s *lockerStub) TryAcquire(context.Context) (postgres.CatalogLease, bool, error) {
	if s.acquired {
		return nil, false, nil
	}
	s.acquired = true
	return &leaseStub{release: func() { s.acquired = false }}, true, nil
}

type leaseStub struct {
	release func()
}

func (l *leaseStub) Release(context.Context) error {
	if l.release != nil {
		l.release()
	}
	return nil
}

func TestBootstrapInitializesFromExistingProjection(t *testing.T) {
	t.Parallel()
	observed := time.Date(2026, 7, 30, 10, 0, 0, 0, time.UTC)
	now := time.Date(2026, 7, 30, 10, 5, 0, 0, time.UTC)
	worker := &CatalogWorker{
		cfg: Config{
			Reader: &readerStub{status: postgres.ProjectionStatus{
				EventCount:     3,
				LatestObserved: observed,
				HasProjection:  true,
			}},
			MaxStaleAge: 15 * time.Minute,
			Now:         func() time.Time { return now },
		},
	}
	if err := worker.Bootstrap(context.Background()); err != nil {
		t.Fatal(err)
	}
	if !worker.WorkerReady() || worker.WorkerDegraded() || !worker.ProjectionAvailable() {
		t.Fatalf("ready=%v degraded=%v projection=%v", worker.WorkerReady(), worker.WorkerDegraded(), worker.ProjectionAvailable())
	}
}

func TestPassiveReplicaRefreshesProjectionWithoutLock(t *testing.T) {
	t.Parallel()
	observed := time.Date(2026, 7, 30, 10, 0, 0, 0, time.UTC)
	now := time.Date(2026, 7, 30, 10, 5, 0, 0, time.UTC)
	locker := &lockerStub{acquired: true}
	worker := &CatalogWorker{
		cfg: Config{
			Locker: locker,
			Reader: &readerStub{status: postgres.ProjectionStatus{
				EventCount:     2,
				LatestObserved: observed,
				HasProjection:  true,
			}},
			MaxStaleAge: 15 * time.Minute,
			Now:         func() time.Time { return now },
		},
	}
	if err := worker.runOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if !worker.WorkerReady() || !worker.ProjectionAvailable() {
		t.Fatalf("ready=%v projection=%v", worker.WorkerReady(), worker.ProjectionAvailable())
	}
}

func TestBootstrapMarksOverAgeProjectionUnavailable(t *testing.T) {
	t.Parallel()
	observed := time.Date(2026, 7, 30, 8, 0, 0, 0, time.UTC)
	now := time.Date(2026, 7, 30, 10, 0, 0, 0, time.UTC)
	worker := &CatalogWorker{
		cfg: Config{
			Reader: &readerStub{status: postgres.ProjectionStatus{
				EventCount:     1,
				LatestObserved: observed,
				HasProjection:  true,
			}},
			MaxStaleAge: 15 * time.Minute,
			Now:         func() time.Time { return now },
		},
	}
	if err := worker.Bootstrap(context.Background()); err != nil {
		t.Fatal(err)
	}
	if worker.WorkerReady() || !worker.ProjectionAvailable() {
		t.Fatalf("ready=%v projection=%v", worker.WorkerReady(), worker.ProjectionAvailable())
	}
}
