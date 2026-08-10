package realtime

import (
	"context"
	"log/slog"
	"sync"
	"time"

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
	Status     *StatusProvider
	Signals    *SignalPipeline
	cancel     context.CancelFunc
	mu         sync.Mutex
	started    bool
}

type RuntimeConfig struct {
	Config            marketsconfig.Config
	REST              RESTSnapshotter
	Registry          TokenRegistry
	Validator         TokenValidator
	Signals           *SignalPipeline
	Logger            *slog.Logger
	ReconcileInterval time.Duration
}

func NewRuntime(cfg RuntimeConfig) (*Runtime, error) {
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	status := NewStatusProvider(true)
	status.SetRegistryReady(cfg.Registry != nil)
	hub := NewHub(HubConfig{MaxQueue: 64, MaxConnections: 1000, MaxPerIP: 50})

	producer := NewProducer(ProducerConfig{
		Hub:        hub,
		REST:       cfg.REST,
		Registry:   cfg.Registry,
		Signals:    cfg.Signals,
		Status:     status,
		BookMaxAge: cfg.Config.BookMaxAge,
		Logger:     logger,
	})

	reconcileInterval := cfg.ReconcileInterval
	if reconcileInterval <= 0 {
		reconcileInterval = 5 * time.Second
	}
	planner := upstreamws.NewPlanner(upstreamws.PlannerConfig{
		MaxSubscribedAssets: cfg.Config.RealtimeMaxAssets,
		ReconcileInterval:   reconcileInterval,
	})

	supervisor, err := upstreamws.NewSupervisor(upstreamws.SupervisorConfig{
		URL:               cfg.Config.RealtimeWSURL,
		MaxAssetsPerConn:  cfg.Config.RealtimeMaxPerConn,
		ReconcileInterval: reconcileInterval,
		Logger:            logger,
		OnDisconnect:      producer.OnUpstreamShardDisconnect,
	}, planner, producer.HandleUpstream)
	if err != nil {
		return nil, err
	}

	handler := NewHandler(HandlerConfig{
		Hub:            hub,
		Planner:        plannerAdapter{inner: planner},
		AllowedOrigins: cfg.Config.RealtimeAllowedOrigins,
		Validator:      cfg.Validator,
		Logger:         logger,
		OnSubscribe:    producer.OnClientSubscribe,
	})

	return &Runtime{
		Hub:        hub,
		Producer:   producer,
		Planner:    planner,
		Supervisor: supervisor,
		Handler:    handler,
		Status:     status,
		Signals:    cfg.Signals,
	}, nil
}

func (r *Runtime) Start(ctx context.Context) {
	r.mu.Lock()
	if r.started {
		r.mu.Unlock()
		return
	}
	runCtx, cancel := context.WithCancel(ctx)
	r.cancel = cancel
	r.started = true
	r.mu.Unlock()

	r.Hub.Start(runCtx)
	r.Status.SetHubRunning(true)
	if r.Signals != nil {
		r.Signals.Start(runCtx)
	}
	r.Supervisor.Start(runCtx)
	r.Producer.StartRESTValidation(runCtx, 30*time.Second)
	go r.statusLoop(runCtx)
}

func (r *Runtime) Stop() {
	r.mu.Lock()
	if r.cancel != nil {
		r.cancel()
		r.cancel = nil
	}
	r.started = false
	r.mu.Unlock()
	if r.Signals != nil {
		stopCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		r.Signals.Stop(stopCtx)
		cancel()
	}
	r.Supervisor.Stop()
	r.Hub.Stop()
	r.Status.SetHubRunning(false)
}

func (r *Runtime) statusLoop(ctx context.Context) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.Status.UpdateFromSupervisor(r.Supervisor, r.Planner, r.Producer)
		}
	}
}

func (r *Runtime) Operational() bool {
	if r == nil || r.Status == nil {
		return false
	}
	return r.Status.Operational()
}

func (r *Runtime) CapabilitiesRealtime() bool {
	if r == nil || r.Status == nil {
		return false
	}
	return r.Status.CapabilitiesRealtime()
}

func (r *Runtime) CapabilitiesLiveSignals() bool {
	if r == nil || r.Signals == nil {
		return false
	}
	return r.Signals.Operational()
}

func (r *Runtime) HealthRealtime() string {
	if r == nil || r.Status == nil {
		return "disabled"
	}
	return r.Status.HealthCheck()
}

func (r *Runtime) SetRegistryReady(ok bool) {
	if r == nil || r.Status == nil {
		return
	}
	r.Status.SetRegistryReady(ok)
}

// CatalogTokenLookup adapts catalog reader for token validation.
type CatalogTokenLookup struct {
	LookupMarket func(ctx context.Context, tokenID string) (marketID string, ok bool, err error)
}

func (l CatalogTokenLookup) ValidateToken(ctx context.Context, marketID, tokenID string) error {
	validator := CatalogTokenValidator{Lookup: l.LookupMarket}
	return validator.ValidateToken(ctx, marketID, tokenID)
}

// RegistryRefresher can reload token mappings after catalog sync.
type RegistryRefresher interface {
	Refresh(ctx context.Context) error
	Ready() bool
}
