package api

import (
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

func requireAuthenticatedPrincipal(w http.ResponseWriter, r *http.Request) (*Principal, bool) {
	principal, err := PrincipalFromRequest(r, authSecretFromContext(r))
	if err != nil || principal == nil || !strings.HasPrefix(principal.Wallet, "0x") {
		writeAPIError(w, http.StatusUnauthorized, "UNAUTHENTICATED", "sign in required", nil)
		return nil, false
	}
	return principal, true
}

func cloneRequestWithWallet(r *http.Request, wallet string) *http.Request {
	req := r.Clone(r.Context())
	u := *req.URL
	q := u.Query()
	q.Set("wallet", wallet)
	u.RawQuery = q.Encode()
	req.URL = &u
	return req
}

func MeRouter(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.Handler {
	r := chi.NewRouter()
	r.Get("/balance", func(w http.ResponseWriter, r *http.Request) {
		principal, ok := requireAuthenticatedPrincipal(w, r)
		if !ok {
			return
		}
		UserBalanceHandler(pool).ServeHTTP(w, cloneRequestWithWallet(r, principal.Wallet))
	})
	r.Get("/positions", func(w http.ResponseWriter, r *http.Request) {
		principal, ok := requireAuthenticatedPrincipal(w, r)
		if !ok {
			return
		}
		UserPositionsHandler(pool, eth, reg).ServeHTTP(w, cloneRequestWithWallet(r, principal.Wallet))
	})
	r.Get("/claims", func(w http.ResponseWriter, r *http.Request) {
		principal, ok := requireAuthenticatedPrincipal(w, r)
		if !ok {
			return
		}
		UserClaimsHandler(pool).ServeHTTP(w, cloneRequestWithWallet(r, principal.Wallet))
	})
	r.Get("/portfolio-summary", func(w http.ResponseWriter, r *http.Request) {
		principal, ok := requireAuthenticatedPrincipal(w, r)
		if !ok {
			return
		}
		UserPortfolioSummaryHandler(pool, eth, reg).ServeHTTP(w, cloneRequestWithWallet(r, principal.Wallet))
	})
	r.Get("/watchlist", func(w http.ResponseWriter, r *http.Request) {
		principal, ok := requireAuthenticatedPrincipal(w, r)
		if !ok {
			return
		}
		UserWatchlistListHandler(pool).ServeHTTP(w, cloneRequestWithWallet(r, principal.Wallet))
	})
	r.Post("/watchlist", UserWatchlistMutateAuthenticatedHandler(pool))
	r.Get("/events", func(w http.ResponseWriter, r *http.Request) {
		principal, ok := requireAuthenticatedPrincipal(w, r)
		if !ok {
			return
		}
		limit := int32(100)
		if ls := strings.TrimSpace(r.URL.Query().Get("limit")); ls != "" {
			// Keep legacy parser semantics by relying on the query helper already used elsewhere.
			if parsed, err := strconv.ParseInt(ls, 10, 32); err == nil && parsed > 0 && parsed <= 500 {
				limit = int32(parsed)
			}
		}
		rows, err := dbqueries.New(pool).ListUserChainEvents(r.Context(), dbqueries.ListUserChainEventsParams{
			UserAddress: principal.Wallet,
			Limit:       limit,
		})
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", "could not load user events", nil)
			return
		}
		WriteUserEventsResponse(w, rows)
	})
	return r
}

func WriteUserEventsResponse(w http.ResponseWriter, rows []dbqueries.ChainEvent) {
	out := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		var indexedAt any
		if row.IndexedAt.Valid {
			indexedAt = row.IndexedAt.Time.UTC().Format(time.RFC3339)
		}
		m := map[string]any{
			"id":           row.ID,
			"blockNumber":  row.BlockNumber,
			"txHash":       row.TxHash,
			"logIndex":     row.LogIndex,
			"contractAddr": row.ContractAddr,
			"eventName":    row.EventName,
			"indexedAt":    indexedAt,
		}
		if len(row.TemplateID) == 32 {
			m["templateId"] = "0x" + hex.EncodeToString(row.TemplateID)
		}
		if row.EpochID.Valid {
			m["epochId"] = row.EpochID.Int64
		}
		if row.UserAddress.Valid {
			m["userAddress"] = row.UserAddress.String
		}
		if len(row.Payload) > 0 {
			var payload any
			if err := json.Unmarshal(row.Payload, &payload); err == nil {
				m["payload"] = payload
			}
		}
		out = append(out, m)
	}
	writeJSON(w, http.StatusOK, map[string]any{"events": out})
}
