package realtime

import (
	"context"
	"log/slog"

	marketsconfig "retropick/apps/backend/internal/markets/config"
	upstreamws "retropick/apps/backend/internal/markets/upstream/ws"
)

type plannerAdapter struct {
	inner *upstreamws.Planner
}

func (p plannerAdapter) Subscribe(tokenID, marketID string) {
	p.inner.Subscribe(tokenID, marketID, upstreamws.PriorityClientView)
}

func (p plannerAdapter) Unsubscribe(tokenID string) {
	p.inner.Unsubscribe(tokenID)
}

// Runtime wires upstream supervisor, producer, and public hub.
type Runtime struct {
	Hub        *Hub
	Producer   *Producer
	Planner    *upstreamws.Planner
	Supervisor *upstreamws.Supervisor
	Handler    *Handler
}

type RuntimeConfig struct {
	Config   marketsconfig.Config
	REST     RESTSnapshotter
	Registry TokenRegistry
	Logger   *slog.Logger
}

// TokenRegistryMap is an in-memory token→market registry.
type TokenRegistryMap struct {
	tokens map[string]string
}

func NewTokenRegistryMap() *TokenRegistryMap {
	return &TokenRegistryMap{tokens: make(map[string]string)}
}

func (m *TokenRegistryMap) Register(tokenID, marketID string) {
	m.tokens[tokenID] = marketID
}

func (m *TokenRegistryMap) MarketForToken(tokenID string) (string, bool) {
	marketID, ok := m.tokens[tokenID]
	return marketID, ok
}

func NewRuntime(cfg RuntimeConfig) (*Runtime, error) {
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	hub := NewHub(64)
	go hub.Run()

	producer := NewProducer(ProducerConfig{
		Hub:        hub,
		REST:       cfg.REST,
		Registry:   cfg.Registry,
		BookMaxAge: cfg.Config.BookMaxAge,
		Logger:     logger,
	})

	planner := upstreamws.NewPlanner(upstreamws.PlannerConfig{
		MaxSubscribedAssets: cfg.Config.RealtimeMaxAssets,
	})

	supervisor, err := upstreamws.NewSupervisor(upstreamws.SupervisorConfig{
		URL:              cfg.Config.RealtimeWSURL,
		MaxAssetsPerConn: cfg.Config.RealtimeMaxPerConn,
		Logger:           logger,
		OnDisconnect:     producer.OnUpstreamDisconnect,
	}, planner, producer.HandleUpstream)
	if err != nil {
		return nil, err
	}

	handler := NewHandler(HandlerConfig{
		Hub:            hub,
		Planner:        plannerAdapter{inner: planner},
		AllowedOrigins: cfg.Config.RealtimeAllowedOrigins,
		Logger:         logger,
		OnSubscribe:    producer.OnClientSubscribe,
	})

	return &Runtime{
		Hub:        hub,
		Producer:   producer,
		Planner:    planner,
		Supervisor: supervisor,
		Handler:    handler,
	}, nil
}

func (r *Runtime) Start(ctx context.Context) {
	r.Producer.SetOperational(true)
	r.Supervisor.Start(ctx)
}

func (r *Runtime) Stop() {
	r.Producer.SetOperational(false)
	r.Supervisor.Stop()
}

func (r *Runtime) Operational() bool {
	return r.Producer.Operational()
}

// CatalogTokenLookup adapts catalog reader for token validation.
type CatalogTokenLookup struct {
	LookupMarket func(ctx context.Context, tokenID string) (marketID string, ok bool, err error)
}

func (l CatalogTokenLookup) ValidateToken(ctx context.Context, marketID, tokenID string) error {
	validator := CatalogTokenValidator{Lookup: l.LookupMarket}
	return validator.ValidateToken(ctx, marketID, tokenID)
}
