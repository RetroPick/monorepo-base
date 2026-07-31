package syncworker

import (
	"context"
	"encoding/json"
	"errors"
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
	s.ready = s.hasProjection
	s.backoffUntil = until
	if err != nil {
		s.lastError = err.Error()
	}
}

func (s *workerStatus) applyProjection(observedAt time.Time, now time.Time, hasProjection bool, maxStale time.Duration, syncUnhealthy bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.hasProjection = hasProjection
	readiness := markets.EvaluateProjectionReadiness(observedAt, now, maxStale, hasProjection, syncUnhealthy)
	s.ready = readiness.Ready
	s.degraded = readiness.Degraded
	if readiness.Ready && !syncUnhealthy {
		s.lastSuccessAt = observedAt
		s.lastError = ""
		s.backoffUntil = time.Time{}
	}
}

func (s *workerStatus) setUnavailable(err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.running = false
	s.ready = false
	s.degraded = false
	s.hasProjection = false
	if err != nil {
		s.lastError = err.Error()
	}
}

type projectionReader interface {
	ProjectionStatus(ctx context.Context) (postgres.ProjectionStatus, error)
}

type catalogLocker interface {
	TryAcquire(ctx context.Context) (postgres.CatalogLease, bool, error)
}

// Config configures bounded catalog synchronization.
type Config struct {
	Syncer        *catalog.Syncer
	Reader        projectionReader
	Store         *postgres.Store
	Locker        catalogLocker
	Logger        *slog.Logger
	Interval      time.Duration
	PageSize      int
	MaxPages      int
	MaxStaleAge   time.Duration
	Backoff       time.Duration
	ShutdownGrace time.Duration
	Now           func() time.Time
	OnCatalogSynced func(ctx context.Context) error
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
	if cfg.MaxStaleAge <= 0 {
		cfg.MaxStaleAge = 15 * time.Minute
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

// Bootstrap initializes live worker state from durable projection/checkpoint data.
func (w *CatalogWorker) Bootstrap(ctx context.Context) error {
	return w.refreshProjectionState(ctx, false)
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
	if err := w.Bootstrap(ctx); err != nil {
		w.cfg.Logger.Warn("catalog bootstrap failed", "err", err)
	}
	if err := w.RunOnce(ctx); err != nil {
		w.cfg.Logger.Warn("catalog initial sync failed", "err", err)
	}
	ticker := time.NewTicker(w.cfg.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := w.RunOnce(ctx); err != nil {
				w.cfg.Logger.Warn("catalog sync failed", "err", err)
			}
		}
	}
}

func (w *CatalogWorker) RunOnce(ctx context.Context) error {
	return w.runOnce(ctx)
}

func (w *CatalogWorker) runOnce(ctx context.Context) error {
	now := w.cfg.Now().UTC()
	w.status.mu.RLock()
	backoffUntil := w.status.backoffUntil
	w.status.mu.RUnlock()
	if !backoffUntil.IsZero() && now.Before(backoffUntil) {
		if err := w.refreshProjectionState(ctx, true); err != nil {
			return err
		}
		return nil
	}

	lease, acquired, err := w.cfg.Locker.TryAcquire(ctx)
	if err != nil {
		return err
	}
	if !acquired {
		return w.refreshProjectionState(ctx, false)
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
		_ = w.refreshProjectionState(ctx, true)
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
		_ = w.refreshProjectionState(ctx, true)
		return err
	}
	if result.CycleComplete {
		if err := w.resetScanCycle(ctx, now, result); err != nil {
			w.status.setBackoff(now.Add(w.cfg.Backoff), err)
			_ = w.refreshProjectionState(ctx, true)
			return err
		}
	}
	if _, err := w.cfg.Store.DeleteExpiredRawEvents(ctx, now); err != nil {
		w.cfg.Logger.Warn("catalog raw payload cleanup failed", "err", err)
	}
	if err := w.refreshProjectionState(ctx, false); err != nil {
		return err
	}
	if w.cfg.OnCatalogSynced != nil {
		if err := w.cfg.OnCatalogSynced(ctx); err != nil {
			w.cfg.Logger.Warn("catalog synced callback failed", "err", err)
		}
	}
	return nil
}

func (w *CatalogWorker) refreshProjectionState(ctx context.Context, syncUnhealthy bool) error {
	projection, err := w.cfg.Reader.ProjectionStatus(ctx)
	if err != nil {
		w.status.setUnavailable(err)
		return err
	}
	now := w.cfg.Now().UTC()
	if !projection.HasProjection {
		w.status.applyProjection(time.Time{}, now, false, w.cfg.MaxStaleAge, syncUnhealthy)
		return nil
	}
	w.status.applyProjection(projection.LatestObserved, now, true, w.cfg.MaxStaleAge, syncUnhealthy)
	if syncUnhealthy && w.status.ready && w.cfg.Logger != nil {
		w.cfg.Logger.Info("catalog serving persisted projection while sync is degraded",
			"projection_count", projection.EventCount,
			"latest_observed", projection.LatestObserved,
		)
	} else if !syncUnhealthy && w.status.ready && w.cfg.Logger != nil {
		w.cfg.Logger.Info("catalog projection ready",
			"projection_count", projection.EventCount,
			"degraded", w.status.degraded,
		)
	}
	return nil
}

type scanCheckpointMetadata struct {
	Cycle int `json:"cycle"`
}

func (w *CatalogWorker) loadScanState(ctx context.Context) (offset int, cycle int, err error) {
	checkpoint, err := w.cfg.Store.GetCheckpoint(ctx, workerSource, workerStream)
	if err != nil {
		if errors.Is(err, postgres.ErrCheckpointNotFound) {
			return 0, 0, nil
		}
		return 0, 0, fmt.Errorf("catalog worker: load checkpoint: %w", err)
	}
	if checkpoint.Cursor != "" {
		parsed, parseErr := strconv.Atoi(checkpoint.Cursor)
		if parseErr != nil || parsed < 0 {
			return 0, 0, fmt.Errorf("catalog worker: invalid checkpoint cursor %q: %w", checkpoint.Cursor, parseErr)
		}
		offset = parsed
	}
	if len(checkpoint.Metadata) > 0 {
		var metadata scanCheckpointMetadata
		if decodeErr := json.Unmarshal(checkpoint.Metadata, &metadata); decodeErr != nil {
			w.cfg.Logger.Warn("catalog checkpoint metadata is malformed; starting new cycle", "err", decodeErr)
		} else if metadata.Cycle > 0 {
			cycle = metadata.Cycle
		}
	}
	return offset, cycle, nil
}

func (w *CatalogWorker) resetScanCycle(ctx context.Context, now time.Time, result catalog.Result) error {
	checkpoint, err := w.cfg.Store.GetCheckpoint(ctx, workerSource, workerStream)
	if err != nil {
		if !errors.Is(err, postgres.ErrCheckpointNotFound) {
			return fmt.Errorf("catalog worker: load checkpoint for cycle reset: %w", err)
		}
		checkpoint = postgres.Checkpoint{Source: workerSource, Stream: workerStream}
	}
	cycle := 1
	if len(checkpoint.Metadata) > 0 {
		var metadata scanCheckpointMetadata
		if decodeErr := json.Unmarshal(checkpoint.Metadata, &metadata); decodeErr == nil && metadata.Cycle > 0 {
			cycle = metadata.Cycle + 1
		}
	}
	metadata, err := json.Marshal(scanCheckpointMetadata{Cycle: cycle})
	if err != nil {
		return fmt.Errorf("catalog worker: marshal cycle metadata: %w", err)
	}
	highWatermark := checkpoint.HighWatermark
	return w.cfg.Store.UpsertCheckpoint(ctx, postgres.Checkpoint{
		Source:        workerSource,
		Stream:        workerStream,
		Cursor:        "0",
		HighWatermark: highWatermark,
		LastSuccessAt: now,
		Metadata:      metadata,
	})
}

var _ markets.CatalogWorkerState = (*CatalogWorker)(nil)
