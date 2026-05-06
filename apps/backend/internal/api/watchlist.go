package api

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
)

// UserWatchlistNonceHandler returns the current replay-protection nonce (legacy; unused when mutations are unsigned).
func UserWatchlistNonceHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(r.URL.Query().Get("wallet"))
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
			return
		}
		wallet = strings.ToLower(wallet)
		// Legacy nonce endpoint remains unsigned for compatibility with client watchlist flows.
		ctx := r.Context()
		q := dbqueries.New(pool)
		if err := q.CreateUserWatchlistNonceIfMissing(ctx, wallet); err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		n, err := q.GetUserWatchlistNonce(ctx, wallet)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"wallet": wallet, "nonce": n})
	}
}

// UserWatchlistListHandler lists watchlisted template ids for a wallet.
func UserWatchlistListHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(r.URL.Query().Get("wallet"))
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
			return
		}
		wallet = strings.ToLower(wallet)
		// Watchlist list is wallet-scoped and intentionally unsigned for guest/connect merge flow.
		ctx := r.Context()
		rows, err := dbqueries.New(pool).ListUserWatchlist(ctx, wallet)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		ids := make([]string, 0, len(rows))
		for _, row := range rows {
			if len(row.TemplateID) == 32 {
				ids = append(ids, "0x"+hex.EncodeToString(row.TemplateID))
			}
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"wallet": wallet, "templateIds": ids})
	}
}

type watchlistMutateBody struct {
	Wallet      string   `json:"wallet"`
	TemplateID  string   `json:"templateId"`
	TemplateIDs []string `json:"templateIds"`
	Action      string   `json:"action"`
}

// resolveWatchlistTemplates parses and validates template id bytes for add/remove/import.
func resolveWatchlistTemplates(body *watchlistMutateBody, action string) ([][]byte, error) {
	if action == "import" {
		if len(body.TemplateIDs) == 0 {
			return nil, fmt.Errorf("templateIds required")
		}
		if len(body.TemplateIDs) > 64 {
			return nil, fmt.Errorf("too many templateIds")
		}
		seen := make(map[string]struct{}, len(body.TemplateIDs))
		parts := make([]string, 0, len(body.TemplateIDs))
		for _, raw := range body.TemplateIDs {
			tplRaw := strings.TrimPrefix(strings.TrimSpace(raw), "0x")
			if len(tplRaw) != 64 {
				return nil, fmt.Errorf("invalid templateId")
			}
			if _, err := hex.DecodeString(tplRaw); err != nil {
				return nil, fmt.Errorf("invalid templateId")
			}
			hexID := "0x" + strings.ToLower(tplRaw)
			if _, ok := seen[hexID]; ok {
				continue
			}
			seen[hexID] = struct{}{}
			parts = append(parts, hexID)
		}
		if len(parts) == 0 {
			return nil, fmt.Errorf("templateIds required")
		}
		sort.Strings(parts)
		out := make([][]byte, 0, len(parts))
		for _, hexID := range parts {
			raw := strings.TrimPrefix(hexID, "0x")
			tb, err := hex.DecodeString(raw)
			if err != nil || len(tb) != 32 {
				return nil, fmt.Errorf("invalid templateId")
			}
			cp := make([]byte, 32)
			copy(cp, tb)
			out = append(out, cp)
		}
		return out, nil
	}
	tplRaw := strings.TrimPrefix(strings.TrimSpace(body.TemplateID), "0x")
	if len(tplRaw) != 64 {
		return nil, fmt.Errorf("invalid templateId")
	}
	tplBytes, err := hex.DecodeString(tplRaw)
	if err != nil || len(tplBytes) != 32 {
		return nil, fmt.Errorf("invalid templateId")
	}
	cp := make([]byte, 32)
	copy(cp, tplBytes)
	return [][]byte{cp}, nil
}

func applyWatchlistMutation(ctx context.Context, q *dbqueries.Queries, wallet, action string, tplBytesList [][]byte) error {
	switch action {
	case "add":
		return q.UpsertUserWatchlist(ctx, dbqueries.UpsertUserWatchlistParams{
			UserAddress: wallet,
			TemplateID:  tplBytesList[0],
		})
	case "remove":
		return q.DeleteUserWatchlist(ctx, dbqueries.DeleteUserWatchlistParams{
			UserAddress: wallet,
			TemplateID:  tplBytesList[0],
		})
	case "import":
		for _, tb := range tplBytesList {
			if err := q.UpsertUserWatchlist(ctx, dbqueries.UpsertUserWatchlistParams{
				UserAddress: wallet,
				TemplateID:  tb,
			}); err != nil {
				return err
			}
		}
		return nil
	default:
		return fmt.Errorf("invalid action")
	}
}

func writeWatchlistMutateOK(w http.ResponseWriter, wallet, action string, tplBytesList [][]byte) {
	out := map[string]any{
		"ok":     true,
		"wallet": wallet,
		"action": action,
	}
	if action == "import" {
		imported := make([]string, 0, len(tplBytesList))
		for _, tb := range tplBytesList {
			imported = append(imported, "0x"+hex.EncodeToString(tb))
		}
		out["templateIds"] = imported
	} else {
		out["templateId"] = "0x" + hex.EncodeToString(tplBytesList[0])
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

// UserWatchlistMutateHandler keeps only the guest-safe import compatibility path.
func UserWatchlistMutateHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeAPIError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed", nil)
			return
		}
		var body watchlistMutateBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
			return
		}
		wallet := strings.TrimSpace(body.Wallet)
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			writeAPIError(w, http.StatusBadRequest, "INVALID_WALLET", "invalid wallet", nil)
			return
		}
		wallet = strings.ToLower(wallet)
		action := strings.TrimSpace(strings.ToLower(body.Action))
		if action != "import" {
			writeAPIError(w, http.StatusForbidden, "AUTH_REQUIRED", "authenticated watchlist mutations moved to /api/v1/me/watchlist", nil)
			return
		}

		tplBytesList, err := resolveWatchlistTemplates(&body, action)
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_TEMPLATE_ID", err.Error(), nil)
			return
		}

		ctx := r.Context()
		tx, err := pool.Begin(ctx)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", "could not start watchlist transaction", nil)
			return
		}
		defer func() { _ = tx.Rollback(ctx) }()
		qtx := dbqueries.New(tx)
		if err := applyWatchlistMutation(ctx, qtx, wallet, action, tplBytesList); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", "could not update watchlist", nil)
			return
		}
		if err := tx.Commit(ctx); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", "could not commit watchlist update", nil)
			return
		}
		writeWatchlistMutateOK(w, wallet, action, tplBytesList)
	}
}

// UserWatchlistMutateAuthenticatedHandler applies add/remove/import for the authenticated wallet.
func UserWatchlistMutateAuthenticatedHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeAPIError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed", nil)
			return
		}
		if err := requireCSRFSameOrigin(r); err != nil {
			writeAPIError(w, http.StatusForbidden, "CSRF_REJECTED", err.Error(), nil)
			return
		}
		principal, ok := requireAuthenticatedPrincipal(w, r)
		if !ok {
			return
		}
		var body watchlistMutateBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
			return
		}
		action := strings.TrimSpace(strings.ToLower(body.Action))
		if action != "add" && action != "remove" && action != "import" {
			writeAPIError(w, http.StatusBadRequest, "INVALID_ACTION", "invalid action", nil)
			return
		}
		if wallet := strings.TrimSpace(body.Wallet); wallet != "" && !strings.EqualFold(wallet, principal.Wallet) {
			writeAPIError(w, http.StatusForbidden, "WALLET_MISMATCH", "wallet does not match active session", nil)
			return
		}
		tplBytesList, err := resolveWatchlistTemplates(&body, action)
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_TEMPLATE_ID", err.Error(), nil)
			return
		}
		ctx := r.Context()
		tx, err := pool.Begin(ctx)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", "could not start watchlist transaction", nil)
			return
		}
		defer func() { _ = tx.Rollback(ctx) }()
		qtx := dbqueries.New(tx)
		if err := applyWatchlistMutation(ctx, qtx, principal.Wallet, action, tplBytesList); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", "could not update watchlist", nil)
			return
		}
		if err := tx.Commit(ctx); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB_ERROR", "could not commit watchlist update", nil)
			return
		}
		writeWatchlistMutateOK(w, principal.Wallet, action, tplBytesList)
	}
}
