package positions

import (
	"context"
	"strings"
	"time"
)

const defaultReconcileInterval = 5 * time.Minute

// WorkerConfig wires the position reconciliation loop.
type WorkerConfig struct {
	Store    *ProjectionStore
	Venue    VenuePositionReader
	Metrics  Metrics
	Reorg    ReorgNotifier
	Interval time.Duration
	Now      func() time.Time
}

// Worker repairs position projections against venue truth.
type Worker struct {
	store    *ProjectionStore
	venue    VenuePositionReader
	metrics  Metrics
	reorg    ReorgNotifier
	interval time.Duration
	now      func() time.Time
}

// NewWorker builds a position reconciliation worker.
func NewWorker(cfg WorkerConfig) *Worker {
	store := cfg.Store
	if store == nil {
		store = NewProjectionStore()
	}
	metrics := cfg.Metrics
	if metrics == nil {
		metrics = nopMetrics{}
	}
	reorg := cfg.Reorg
	if reorg == nil {
		reorg = NopReorgNotifier{}
	}
	interval := cfg.Interval
	if interval <= 0 {
		interval = defaultReconcileInterval
	}
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	return &Worker{
		store:    store,
		venue:    cfg.Venue,
		metrics:  metrics,
		reorg:    reorg,
		interval: interval,
		now:      now,
	}
}

// Run executes the reconcile loop until ctx is cancelled.
func (w *Worker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			w.RunOnce(ctx)
		}
	}
}

// RunOnce performs a single reconciliation pass (exported for tests).
func (w *Worker) RunOnce(ctx context.Context) {
	w.runOnce(ctx)
}

func (w *Worker) runOnce(ctx context.Context) {
	if w.venue == nil {
		return
	}
	start := w.now()
	repaired := 0

	for _, userID := range w.reorg.PendingReorgs(ctx) {
		if userID == "" {
			continue
		}
		w.store.MarkUpdating(userID)
	}

	userIDs := w.store.ListUserIDs()
	for _, userID := range userIDs {
		if n := w.reconcileUser(ctx, userID); n > 0 {
			repaired += n
		}
	}

	w.metrics.RecordPositionReconcileRun(repaired, w.now().Sub(start))
}

func (w *Worker) reconcileUser(ctx context.Context, userID string) int {
	accountWallet, ok := w.store.AccountWalletForUser(userID)
	if !ok || strings.TrimSpace(accountWallet) == "" {
		return 0
	}

	venueRows, observedAt, err := w.venue.ListPositions(ctx, VenuePositionRequest{
		AccountWallet: accountWallet,
	})
	if err != nil {
		w.metrics.RecordPositionReconcileError(classifyVenueError(err))
		w.store.MarkReconciling(userID)
		w.metrics.RecordPositionDriftCount(w.driftCountForUser(userID))
		return 0
	}

	localRows := w.store.List(userID)
	drift := ComparePositions(localRows, venueRows)
	w.metrics.RecordPositionDriftCount(drift.Count)

	if drift.Count == 0 {
		w.markUserSynced(userID, accountWallet, observedAt)
		w.metrics.RecordPositionDriftCount(0)
		return 0
	}

	written := w.store.ApplyVenueRebuild(userID, accountWallet, venueRows, observedAt)
	if written == 0 && len(venueRows) > 0 {
		w.store.MarkReconciling(userID)
		return 0
	}
	w.metrics.RecordPositionDriftRepair(written)
	w.metrics.RecordPositionDriftCount(0)
	return written
}

func (w *Worker) driftCountForUser(userID string) int {
	return len(w.store.List(userID))
}

func (w *Worker) markUserSynced(userID, accountWallet string, observedAt time.Time) {
	rows := w.store.List(userID)
	if len(rows) == 0 {
		return
	}
	venueRows := make([]VenuePosition, 0, len(rows))
	for _, row := range rows {
		venueRows = append(venueRows, VenuePosition{
			TokenID:      row.TokenID,
			MarketID:     row.MarketID,
			ConditionID:  row.ConditionID,
			OutcomeLabel: row.OutcomeLabel,
			Size:         row.Size,
			AvgPrice:     row.AvgPrice,
			UpstreamID:   row.UpstreamID,
		})
	}
	w.store.ApplyVenueRebuild(userID, accountWallet, venueRows, observedAt)
}

func classifyVenueError(err error) string {
	if err == nil {
		return ""
	}
	switch {
	case strings.Contains(err.Error(), "credentials"):
		return "credentials_unwired"
	default:
		return "upstream"
	}
}
