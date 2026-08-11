package orders

import (
	"context"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/postgres"
	"retropick/apps/backend/internal/markets/wallet"
)

// ProductionConfig wires live order preview and submit dependencies.
type ProductionConfig struct {
	Discoverer         *wallet.Discoverer
	Pool               dbqueries.DBTX
	Catalog            markets.CatalogProjection
	CLOBURL            string
	BuilderCode        string
	Metrics            Recorder
	SubmitMetrics      SubmitMetrics
	OrderSubmitEnabled bool
	L2Creds            clob.CredentialProvider
	Projections        *ProjectionStore
}

// NewProductionService builds a preview+submit service for markets-api.
func NewProductionService(cfg ProductionConfig) *Service {
	var tokens TokenCatalog
	if cfg.Pool != nil {
		if reg, err := postgres.NewCatalogTokenRegistry(cfg.Pool); err == nil {
			_ = reg.Bootstrap(context.Background(), 10000)
			tokens = reg
		}
	}
	var books BookConstraints
	if cfg.CLOBURL != "" {
		books = clob.NewClient(cfg.CLOBURL)
	}

	submitEnabled := cfg.OrderSubmitEnabled
	if env := strings.TrimSpace(os.Getenv("MARKETS_ORDER_SUBMIT_ENABLED")); env == "true" || env == "1" {
		submitEnabled = true
	}

	var venue VenueSubmitter
	var cancelVenue VenueCanceller
	var journal MutationJournal
	if pool, ok := cfg.Pool.(*pgxpool.Pool); ok {
		journal = NewPostgresMutationJournal(pool)
	}
	// Production mutations require the durable PostgreSQL boundary. The
	// process-local gate in SubmitOrder is retained only for isolated tests.
	if journal == nil {
		submitEnabled = false
	}
	if cfg.CLOBURL != "" {
		creds := cfg.L2Creds
		if creds == nil {
			creds = clob.UnwiredCredentialProvider{}
		}
		tradingClient := clob.NewTradingClient(clob.TradingClientConfig{
			BaseURL: cfg.CLOBURL,
			Creds:   creds,
		})
		venue = tradingClient
		cancelVenue = clobVenueCanceller{client: tradingClient}
	}

	return NewService(ServiceConfig{
		Discoverer:  cfg.Discoverer,
		Tokens:      tokens,
		Markets:     cfg.Catalog,
		Books:       books,
		BuilderCode: cfg.BuilderCode,
		Metrics:     cfg.Metrics,
		Projections: cfg.Projections,
		Submit: SubmitConfig{
			OrderSubmitEnabled: submitEnabled,
			Venue:              venue,
			Journal:            journal,
			Metrics:            cfg.SubmitMetrics,
		},
		Cancel: CancelConfig{
			OrderSubmitEnabled: submitEnabled,
			Venue:              cancelVenue,
		},
	})
}

// NewProductionHandlerConfig returns handler wiring for markets-api main.
func NewProductionHandlerConfig(cfg ProductionConfig) HandlerConfig {
	return HandlerConfig{
		Service:  NewProductionService(cfg),
		Sessions: wallet.ContextSessionResolver{},
	}
}
