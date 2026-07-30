package syncworker

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/catalog"
	"retropick/apps/backend/internal/markets/postgres"
)

const (
	workerSource = "polymarket_gamma"
	workerStream = "events"
)

// Status reports catalog sync lifecycle for readiness probes.
type Status struct {
	mu sync.RWMutex

	Ready         bool
	Degraded      bool
	Running       bool
	LastSuccessAt time.Time
	LastError     string
	LastPages     int
	CheckpointAge time.Duration
	BackoffUntil  time.Time
	HasProjection bool
}

func (s *Status) snapshot(now time.Time) Status {
	s.mu.RLock()
	defer s.mu.RUnlock()
	copy := *s
	if !s.LastSuccessAt.IsZero() {
		copy.CheckpointAge = now.Sub(s.LastSuccessAt)
	}
	return copy
}

func (s *Status) setRunning(running bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Running = running
}

func (s *Status) setSuccess(at time.Time, pages int, hasProjection bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Ready = hasProjection
	s.Degraded = false
	s.Running = false
	s.LastSuccessAt = at
	s.LastPages = pages
	s.LastError = ""
	s.BackoffUntil = time.Time{}
	s.HasProjection = hasProjection
}

func (s *Status) setBackoff(until time.Time, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Running = false
	s.Degraded = s.HasProjection
	s.BackoffUntil = until
	if err != nil {
		s.LastError = err.Error()
	}
}

// Config configures bounded catalog synchronization.
type Config struct {
	Syncer        *catalog.Syncer
	Reader        *postgres.CatalogReader
	Store         *postgres.Store
	Logger        *slog.Logger
	Interval      time.Duration
	PageSize      int
	MaxPages      int
	Backoff       time.Duration
	ShutdownGrace time.Duration
	Now           func() time.Time
	OnPageApplied func(ctx context.Context) error
}

// CatalogWorker runs periodic catalog sync with advisory-lock single-flight semantics.
type CatalogWorker struct {
	cfg    Config
	status Status
}

func NewCatalogWorker(cfg Config) (*CatalogWorker, error) {
	if cfg.Syncer == nil || cfg.Reader == nil || cfg.Store == nil {
		return nil, fmt.Errorf("catalog worker: syncer, reader, and store are required")
	}
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	if cfg.Interval <= 0 {
		cfg.Interval = 5 * time.Minute
	}
	if cfg.PageSize <= 0 {
		cfg.PageSize = 50
	}
	if cfg.MaxPages <= 0 {
		cfg.MaxPages = 1
	}
	if cfg.Backoff <= 0 {
		cfg.Backoff = 30 * time.Second
	}
	if cfg.ShutdownGrace <= 0 {
		cfg.ShutdownGrace = 10 * time.Second
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	return &CatalogWorker{cfg: cfg}, nil
}

func (w *CatalogWorker) Status() Status {
	return w.status.snapshot(w.cfg.Now())
}

func (w *CatalogWorker) WorkerState() markets.CatalogWorkerState {
	status := w.Status()
	return markets.CatalogWorkerSnapshotFrom(status.Ready, status.Degraded, status.HasProjection)
}

func (w *CatalogWorker) Run(ctx context.Context) error {
	if err := w.runOnce(ctx); err != nil {
		w.cfg.Logger.Warn("catalog initial sync failed", "err", err)
	}
	ticker := time.NewTicker(w.cfg.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := w.runOnce(ctx); err != nil {
				w.cfg.Logger.Warn("catalog sync failed", "err", err)
			}
		}
	}
}

func (w *CatalogWorker) runOnce(ctx context.Context) error {
	now := w.cfg.Now().UTC()
	if until := w.status.snapshot(now).BackoffUntil; !until.IsZero() && now.Before(until) {
		return nil
	}
	acquired, err := w.cfg.Reader.TryAdvisoryLock(ctx)
	if err != nil {
		return err
	}
	if !acquired {
		return nil
	}
	defer func() {
		_ = w.cfg.Reader.ReleaseAdvisoryLock(context.Background())
	}()

	w.status.setRunning(true)
	startOffset := 0
	checkpoint, err := w.cfg.Store.GetCheckpoint(ctx, workerSource, workerStream)
	if err == nil && checkpoint.Cursor != "" {
		if parsed, parseErr := strconv.Atoi(checkpoint.Cursor); parseErr == nil {
			startOffset = parsed
		}
	}

	result, err := w.cfg.Syncer.Run(ctx, catalog.RunOptions{
		PageSize:    w.cfg.PageSize,
		MaxPages:    w.cfg.MaxPages,
		StartOffset: startOffset,
	})
	if err != nil {
		w.status.setBackoff(now.Add(w.cfg.Backoff), err)
		return err
	}
	if w.cfg.OnPageApplied != nil {
		if err := w.cfg.OnPageApplied(ctx); err != nil {
			w.status.setBackoff(now.Add(w.cfg.Backoff), err)
			return err
		}
	}
	if _, err := w.cfg.Store.DeleteExpiredRawEvents(ctx, now); err != nil {
		w.cfg.Logger.Warn("catalog raw payload cleanup failed", "err", err)
	}
	projection, err := w.cfg.Reader.ProjectionStatus(ctx)
	if err != nil {
		w.status.setBackoff(now.Add(w.cfg.Backoff), err)
		return err
	}
	w.status.setSuccess(now, result.Pages, projection.HasProjection)
	w.cfg.Logger.Info("catalog sync complete",
		"pages", result.Pages,
		"events", result.Events,
		"markets", result.Markets,
		"projection_count", projection.EventCount,
	)
	return nil
}
