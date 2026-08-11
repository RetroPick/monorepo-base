package intelligence

import (
	"context"
	"fmt"
	"time"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/markets/intelligence/adapter/datatrades"
	"retropick/apps/backend/internal/markets/intelligence/feed"
	intelhttp "retropick/apps/backend/internal/markets/intelligence/http"
	"retropick/apps/backend/internal/markets/intelligence/ingest"
	"retropick/apps/backend/internal/markets/intelligence/model"
	"retropick/apps/backend/internal/markets/intelligence/params"
	"retropick/apps/backend/internal/markets/intelligence/provenance"
	"retropick/apps/backend/internal/markets/intelligence/store"
	"retropick/apps/backend/internal/markets/intelligence/whale"
)

// Config wires the intelligence module.
type Config struct {
	Enabled bool
	Now     func() time.Time
	Client  datatrades.Client
}

// Module is the Smart Money intelligence runtime bundle.
type Module struct {
	enabled  bool
	store    *store.MemoryStore
	ingestor *ingest.Ingestor
	now      func() time.Time
}

// NewModule constructs the whale feed module.
func NewModule(cfg Config) (*Module, error) {
	file, err := params.Load()
	if err != nil {
		return nil, err
	}
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	st := store.NewMemoryStore()
	classifier := whale.NewClassifier(file.WhaleScoreLaunch)
	ingestor := &ingest.Ingestor{
		Store:      st,
		Classifier: classifier,
		Writer:     provenance.NewWriter(),
		Now:        now,
	}
	mod := &Module{
		enabled:  cfg.Enabled,
		store:    st,
		ingestor: ingestor,
		now:      now,
	}
	if cfg.Client != nil && cfg.Enabled {
		if err := mod.syncClient(context.Background(), cfg.Client); err != nil {
			return nil, fmt.Errorf("intelligence bootstrap: %w", err)
		}
	}
	return mod, nil
}

func (m *Module) syncClient(ctx context.Context, client datatrades.Client) error {
	raws, err := client.ListTrades(ctx, time.Time{}, 1000)
	if err != nil {
		return err
	}
	for _, raw := range raws {
		ctxData := model.MarketContext{ImpactUnavailable: true}
		if _, err := m.ingestor.Raw(ctx, raw, ctxData); err != nil {
			return err
		}
	}
	return nil
}

// Enabled reports whether whale feed is operational.
func (m *Module) Enabled() bool {
	return m.enabled
}

// ListWhales serves feed queries.
func (m *Module) ListWhales(q feed.Query, now time.Time) feed.ListResponse {
	if !m.enabled {
		return feed.DisabledResponse(q.Limit, now)
	}
	return feed.List(m.store, q, now)
}

// RegisterRoutes mounts PUBLIC intelligence routes.
func (m *Module) RegisterRoutes(r chi.Router) {
	intelhttp.RegisterRoutes(r, m)
}

// Ingestor returns the trade ingestor for tests.
func (m *Module) Ingestor() *ingest.Ingestor {
	return m.ingestor
}

// Store returns the projection store for tests.
func (m *Module) Store() *store.MemoryStore {
	return m.store
}

// IngestFixture ingests a trade with market context (tests/dev).
func (m *Module) IngestFixture(ctx context.Context, trade model.NormalizedTrade, ctxData model.MarketContext) (ingest.Result, error) {
	return m.ingestor.Run(ctx, ingest.Input{Trade: trade, Context: ctxData})
}

// BootstrapFromFixtures loads trades with explicit market contexts.
func (m *Module) BootstrapFromFixtures(ctx context.Context, fixtures []FixtureTrade) error {
	for _, fx := range fixtures {
		trade := datatrades.ToNormalized(fx.Raw, m.now())
		if _, err := m.ingestor.Run(ctx, ingest.Input{
			Trade:   trade,
			Context: fx.Context,
		}); err != nil {
			return err
		}
	}
	return nil
}

// FixtureTrade pairs raw trade data with market context for bootstrap.
type FixtureTrade struct {
	Raw     datatrades.RawTrade
	Context model.MarketContext
}
