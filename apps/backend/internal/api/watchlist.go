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
		if !WalletAuthorized(r, wallet, authSecretFromContext(r)) {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
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
		if !WalletAuthorized(r, wallet, authSecretFromContext(r)) {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
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

// UserWatchlistMutateHandler applies add/remove/import for the wallet in the JSON body (no signature).
func UserWatchlistMutateHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method"}`, http.StatusMethodNotAllowed)
			return
		}
		var body watchlistMutateBody
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		wallet := strings.TrimSpace(body.Wallet)
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
			return
		}
		wallet = strings.ToLower(wallet)
		if !WalletAuthorized(r, wallet, authSecretFromContext(r)) {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		action := strings.TrimSpace(strings.ToLower(body.Action))
		if action != "add" && action != "remove" && action != "import" {
			http.Error(w, `{"error":"invalid action"}`, http.StatusBadRequest)
			return
		}

		tplBytesList, err := resolveWatchlistTemplates(&body, action)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusBadRequest)
			return
		}

		ctx := r.Context()
		tx, err := pool.Begin(ctx)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		defer func() { _ = tx.Rollback(ctx) }()
		qtx := dbqueries.New(tx)
		if err := applyWatchlistMutation(ctx, qtx, wallet, action, tplBytesList); err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		if err := tx.Commit(ctx); err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		writeWatchlistMutateOK(w, wallet, action, tplBytesList)
	}
}
