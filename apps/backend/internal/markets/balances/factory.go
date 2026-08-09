package balances

import (
	"strings"
	"time"

	"retropick/apps/backend/internal/markets/wallet"
)

// ProductionConfig wires production balance read dependencies for main/ router owners.
//
// G3 main handoff (when Postgres wallet store is wired):
//
//	store := wallet.NewPostgresAccountStore(pool)
//	disc := wallet.NewDiscoverer(store, marketsMetrics)
//	balances.RegisterRoutes(r, balances.NewProductionHandlerConfig(balances.ProductionConfig{
//	    Discoverer: disc,
//	    CLOBURL:    cfg.CLOBAPIURL,
//	    L2Store:    balances.UnwiredL2CredentialStore{}, // swap when L2 auth lands
//	}))
type ProductionConfig struct {
	Discoverer *wallet.Discoverer
	CLOBURL    string
	L2Store    L2CredentialStore
	Timeout    time.Duration
}

// NewProductionReaderConfig builds a ReaderConfig with ClobVenueSource.
func NewProductionReaderConfig(cfg ProductionConfig) ReaderConfig {
	clobURL := strings.TrimSpace(cfg.CLOBURL)
	if clobURL == "" {
		clobURL = "https://clob.polymarket.com"
	}
	client := NewClobBalanceClient(clobURL, cfg.Timeout)
	return ReaderConfig{
		Discoverer: cfg.Discoverer,
		Venue:      NewClobVenueSource(client, cfg.L2Store),
	}
}

// NewProductionHandlerConfig builds a HandlerConfig for eligible /me/balances routes.
func NewProductionHandlerConfig(cfg ProductionConfig) HandlerConfig {
	readerCfg := NewProductionReaderConfig(cfg)
	return HandlerConfig{
		Reader:   NewReader(readerCfg),
		Sessions: wallet.ContextSessionResolver{},
	}
}
