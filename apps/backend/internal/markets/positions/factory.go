package positions

import (
	"os"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/wallet"
)

// ProductionConfig wires production position read and reconcile dependencies.
//
// Glue handoff (main.go owner — not MKT-P4-001 owned_paths):
//
//	posStore := positions.NewProjectionStore()
//	posCfg := positions.ProductionConfig{
//	    Discoverer: disc,
//	    DataAPIURL: cfg.DataAPIURL,
//	    Store:      posStore,
//	    Metrics:    metricsRecorder,
//	}
//	positions.RegisterMeRoutes(r, positions.NewProductionHandlerConfig(posCfg))
//	if positions.PositionReconcileEnabled() {
//	    go positions.NewProductionWorker(posCfg).Run(ctx)
//	}
type ProductionConfig struct {
	Discoverer *wallet.Discoverer
	DataAPIURL string
	Store      *ProjectionStore
	Fills      FillSource
	Metrics    Metrics
	Reorg      ReorgNotifier
	Timeout    time.Duration
	Interval   time.Duration
}

// PositionReconcileEnabled reports whether the position reconcile worker should run.
func PositionReconcileEnabled() bool {
	switch strings.TrimSpace(strings.ToLower(os.Getenv("MARKETS_POSITION_RECONCILE_ENABLED"))) {
	case "false", "0", "off":
		return false
	default:
		return true
	}
}

// NewProductionReaderConfig builds a ReaderConfig with Data API venue source.
func NewProductionReaderConfig(cfg ProductionConfig) ReaderConfig {
	store := cfg.Store
	if store == nil {
		store = NewProjectionStore()
	}
	dataURL := strings.TrimSpace(cfg.DataAPIURL)
	if dataURL == "" {
		dataURL = defaultDataAPIBaseURL
	}
	return ReaderConfig{
		Discoverer: cfg.Discoverer,
		Store:      store,
		Venue:      NewDataAPIClient(dataURL, cfg.Timeout),
		Fills:      cfg.Fills,
	}
}

// NewProductionHandlerConfig builds a HandlerConfig for eligible /me/positions routes.
func NewProductionHandlerConfig(cfg ProductionConfig) HandlerConfig {
	return HandlerConfig{
		Reader:   NewReader(NewProductionReaderConfig(cfg)),
		Sessions: wallet.ContextSessionResolver{},
	}
}

// NewProductionWorker builds the position reconcile worker for markets-api glue.
func NewProductionWorker(cfg ProductionConfig) *Worker {
	readerCfg := NewProductionReaderConfig(cfg)
	return NewWorker(WorkerConfig{
		Store:    readerCfg.Store,
		Venue:    readerCfg.Venue,
		Metrics:  cfg.Metrics,
		Reorg:    cfg.Reorg,
		Interval: cfg.Interval,
	})
}
