package syncworker

import (
	"context"
	"encoding/json"
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

// WorkerSnapshot reports catalog sync lifecycle for observability only.
type WorkerSnapshot struct {
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

type workerStatus struct {
	mu sync.RWMutex

	ready         bool
	degraded      bool
	running       bool
	lastSuccessAt time.Time
	lastError     string
	lastPages     int
	backoffUntil  time.Time
	hasProjection bool
}

func (s *workerStatus) snapshot(now time.Time) WorkerSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	copy := WorkerSnapshot{
		Ready:         s.ready,
		Degraded:      s.degraded,
		Running:       s.running,
		LastSuccessAt: s.lastSuccessAt,
		LastError:     s.lastError,
		LastPages:     s.lastPages,
		BackoffUntil:  s.backoffUntil,
		HasProjection: s.hasProjection,
	}
	if !s.lastSuccessAt.IsZero() {
		copy.CheckpointAge = now.Sub(s.lastSuccessAt)
	}
	return copy
}

func (s *workerStatus) setRunning(running bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.running = running
}

func (s *workerStatus) setSuccess(at time.Time, pages int, hasProjection bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ready = hasProjection
	s.degraded = false
	s.running = false
	s.lastSuccessAt = at
	s.lastPages = pages
	s.lastError = ""
	s.backoffUntil = time.Time{}
	s.hasProjection = hasProjection
}

func (s *workerStatus) setBackoff(until time.Time, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.running = false
	s.degraded = s.hasProjection
	s.backoffUntil = until
	if err != nil {
		s.lastError = err.Error()
	}
}

// Config configures bounded catalog synchronization.
type Config struct {
	Syncer        *catalog.Syncer
	Reader        *postgres.CatalogReader
	Store         *postgres.Store
	Locker        *postgres.CatalogLocker
	Logger        *slog.Logger
	Interval      time.Duration
	PageSize      int
	MaxPages      int
	Backoff       time.Duration
	ShutdownGrace time.Duration
	Now           func() time.Time
}

// CatalogWorker runs periodic catalog sync with advisory-lock single-flight semantics.
// It implements markets.CatalogWorkerState with live mutex-protected reads.
type CatalogWorker struct {
	cfg    Config
	status workerStatus
}

func NewCatalogWorker(cfg Config) (*CatalogWorker, error) {
	if cfg.Syncer == nil || cfg.Reader == nil || cfg.Store == nil || cfg.Locker == nil {
		return nil, fmt.Errorf("catalog worker: syncer, reader, store, and locker are required")
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

// StatusSnapshot returns a point-in-time copy for observability only.
func (w *CatalogWorker) StatusSnapshot() WorkerSnapshot {
	return w.status.snapshot(w.cfg.Now())
}

func (w *CatalogWorker) WorkerReady() bool {
	w.status.mu.RLock()
	defer w.status.mu.RUnlock()
	return w.status.ready
}

func (w *CatalogWorker) WorkerDegraded() bool {
	w.status.mu.RLock()
	defer w.status.mu.RUnlock()
	return w.status.degraded
}

func (w *CatalogWorker) ProjectionAvailable() bool {
	w.status.mu.RLock()
	defer w.status.mu.RUnlock()
	return w.status.hasProjection
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
	w.status.mu.RLock()
	backoffUntil := w.status.backoffUntil
	w.status.mu.RUnlock()
	if !backoffUntil.IsZero() && now.Before(backoffUntil) {
		return nil
	}

	lease, acquired, err := w.cfg.Locker.TryAcquire(ctx)
	if err != nil {
		return err
	}
	if !acquired {
		return nil
	}
	defer func() {
		releaseCtx, cancel := context.WithTimeout(context.Background(), w.cfg.ShutdownGrace)
		defer cancel()
		if releaseErr := lease.Release(releaseCtx); releaseErr != nil {
			w.cfg.Logger.Warn("catalog advisory lock release failed", "err", releaseErr)
		}
	}()

	w.status.setRunning(true)
	startOffset, cycle, err := w.loadScanState(ctx)
	if err != nil {
		w.status.setBackoff(now.Add(w.cfg.Backoff), err)
		return err
	}

	result, err := w.cfg.Syncer.Run(ctx, catalog.RunOptions{
		PageSize:    w.cfg.PageSize,
		MaxPages:    w.cfg.MaxPages,
		StartOffset: startOffset,
		Cycle:       cycle,
	})
	if err != nil {
		w.status.setBackoff(now.Add(w.cfg.Backoff), err)
		return err
	}
	if result.CycleComplete {
		if err := w.resetScanCycle(ctx, now, result); err != nil {
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
		"cycle_complete", result.CycleComplete,
	)
	return nil
}

type scanCheckpointMetadata struct {
	Cycle int `json:"cycle"`
}

func (w *CatalogWorker) loadScanState(ctx context.Context) (offset int, cycle int, err error) {
	checkpoint, err := w.cfg.Store.GetCheckpoint(ctx, workerSource, workerStream)
	if err != nil {
		return 0, 0, nil
	}
	if checkpoint.Cursor != "" {
		if parsed, parseErr := strconv.Atoi(checkpoint.Cursor); parseErr == nil && parsed >= 0 {
			offset = parsed
		}
	}
	if len(checkpoint.Metadata) > 0 {
		var metadata scanCheckpointMetadata
		if decodeErr := json.Unmarshal(checkpoint.Metadata, &metadata); decodeErr == nil && metadata.Cycle > 0 {
			cycle = metadata.Cycle
		}
	}
	return offset, cycle, nil
}

func (w *CatalogWorker) resetScanCycle(ctx context.Context, now time.Time, result catalog.Result) error {
	checkpoint, err := w.cfg.Store.GetCheckpoint(ctx, workerSource, workerStream)
	if err != nil {
		checkpoint = postgres.Checkpoint{Source: workerSource, Stream: workerStream}
	}
	cycle := 1
	if len(checkpoint.Metadata) > 0 {
		var metadata scanCheckpointMetadata
		if decodeErr := json.Unmarshal(checkpoint.Metadata, &metadata); decodeErr == nil {
			cycle = metadata.Cycle + 1
		}
	}
	metadata, err := json.Marshal(scanCheckpointMetadata{Cycle: cycle})
	if err != nil {
		return fmt.Errorf("catalog worker: marshal cycle metadata: %w", err)
	}
	return w.cfg.Store.UpsertCheckpoint(ctx, postgres.Checkpoint{
		Source:        workerSource,
		Stream:        workerStream,
		Cursor:        "0",
		HighWatermark: checkpoint.HighWatermark,
		LastSuccessAt: now,
		Metadata:      metadata,
	})
}

var _ markets.CatalogWorkerState = (*CatalogWorker)(nil)
