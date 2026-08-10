package wallet

import "github.com/jackc/pgx/v5/pgxpool"

// HandlerConfigFromPool builds production wallet HTTP wiring from a Postgres pool.
// Nil pool returns auth-only unwired config (empty discovery, link 503).
func HandlerConfigFromPool(pool *pgxpool.Pool) HandlerConfig {
	cfg := HandlerConfig{Sessions: ContextSessionResolver{}}
	if pool == nil {
		return cfg
	}
	store := NewPostgresAccountStore(pool)
	cfg.Discoverer = NewDiscoverer(store, NopRecorder{})
	cfg.Linker = store
	return cfg
}
