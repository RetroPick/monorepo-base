package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/feedregistry"
	"retropick/apps/backend/internal/registry"
)

// registerOpsFeedRoutes adds GET /feeds for the curated Chainlink feed registry.
func registerOpsFeedRoutes(r chi.Router, reg *registry.Registry) {
	r.Get("/feeds", func(w http.ResponseWriter, req *http.Request) {
		q := req.URL.Query()
		network := strings.TrimSpace(q.Get("network"))
		if network == "" {
			network = "base-sepolia"
		}
		var oc *int
		if s := strings.TrimSpace(q.Get("oracleClass")); s != "" {
			n, err := strconv.Atoi(s)
			if err != nil || n < 0 || n > 4 {
				WriteAPIError(w, http.StatusBadRequest, "INVALID_ORACLE_CLASS", "invalid oracleClass", nil)
				return
			}
			oc = &n
		}
		f, err := feedregistry.Filter(network, oc)
		if err != nil {
			WriteAPIError(w, http.StatusBadRequest, "INVALID_FEED_FILTER", err.Error(), nil)
			return
		}
		// When chain id in registry does not match deployment, still return data but note mismatch.
		note := ""
		if reg != nil && int64(f.ChainID) != reg.ChainID {
			note = "registry chainId does not match server registry.json chain; verify environment."
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"network":            f.Network,
			"chainId":            f.ChainID,
			"feeds":              f.Feeds,
			"source":             "static_registry",
			"registryNote":       f.SourceNote,
			"environmentWarning": note,
		})
	})
}
