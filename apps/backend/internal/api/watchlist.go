package api

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

const watchlistDeadlineMax = 15 * time.Minute

// WatchlistSignMessage builds the canonical EIP-191 message body for watchlist mutations.
func WatchlistSignMessage(chainID int64, wallet, templateID, action string, deadline int64, nonce int64) string {
	wallet = strings.ToLower(strings.TrimSpace(wallet))
	templateID = strings.TrimSpace(templateID)
	if !strings.HasPrefix(templateID, "0x") {
		templateID = "0x" + templateID
	}
	templateID = strings.ToLower(templateID)
	return fmt.Sprintf(
		"RetroPick watchlist v1\nchainId=%d\nwallet=%s\ntemplateId=%s\naction=%s\ndeadline=%d\nnonce=%d\n",
		chainID, wallet, templateID, action, deadline, nonce,
	)
}

// WatchlistImportSignMessage signs a batch of template ids (comma-separated, lowercased) for one nonce bump.
func WatchlistImportSignMessage(chainID int64, wallet, templateIDsCSV string, deadline int64, nonce int64) string {
	wallet = strings.ToLower(strings.TrimSpace(wallet))
	templateIDsCSV = strings.TrimSpace(templateIDsCSV)
	return fmt.Sprintf(
		"RetroPick watchlist import v1\nchainId=%d\nwallet=%s\ntemplateIds=%s\ndeadline=%d\nnonce=%d\n",
		chainID, wallet, templateIDsCSV, deadline, nonce,
	)
}

// UserWatchlistNonceHandler returns the current replay-protection nonce (creates row at 0 if missing).
func UserWatchlistNonceHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(r.URL.Query().Get("wallet"))
		if !strings.HasPrefix(wallet, "0x") || len(wallet) != 42 {
			http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
			return
		}
		wallet = strings.ToLower(wallet)
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
	Wallet       string   `json:"wallet"`
	TemplateID   string   `json:"templateId"`
	TemplateIDs  []string `json:"templateIds"`
	Action       string   `json:"action"`
	Deadline     int64    `json:"deadline"`
	Nonce        int64    `json:"nonce"`
	Signature    string   `json:"signature"`
}

// UserWatchlistMutateHandler applies add/remove after verifying EIP-191 personal_sign and nonce.
func UserWatchlistMutateHandler(pool *pgxpool.Pool, reg *registry.Registry) http.HandlerFunc {
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
		action := strings.TrimSpace(strings.ToLower(body.Action))
		if action != "add" && action != "remove" && action != "import" {
			http.Error(w, `{"error":"invalid action"}`, http.StatusBadRequest)
			return
		}
		var tplBytesList [][]byte
		var msg string
		if action == "import" {
			if len(body.TemplateIDs) == 0 {
				http.Error(w, `{"error":"templateIds required"}`, http.StatusBadRequest)
				return
			}
			if len(body.TemplateIDs) > 64 {
				http.Error(w, `{"error":"too many templateIds"}`, http.StatusBadRequest)
				return
			}
			seen := make(map[string]struct{}, len(body.TemplateIDs))
			parts := make([]string, 0, len(body.TemplateIDs))
			for _, raw := range body.TemplateIDs {
				tplRaw := strings.TrimPrefix(strings.TrimSpace(raw), "0x")
				if len(tplRaw) != 64 {
					http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
					return
				}
				if _, err := hex.DecodeString(tplRaw); err != nil {
					http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
					return
				}
				hexID := "0x" + strings.ToLower(tplRaw)
				if _, ok := seen[hexID]; ok {
					continue
				}
				seen[hexID] = struct{}{}
				parts = append(parts, hexID)
			}
			if len(parts) == 0 {
				http.Error(w, `{"error":"templateIds required"}`, http.StatusBadRequest)
				return
			}
			sort.Strings(parts)
			for _, hexID := range parts {
				raw := strings.TrimPrefix(hexID, "0x")
				tb, err := hex.DecodeString(raw)
				if err != nil || len(tb) != 32 {
					http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
					return
				}
				cp := make([]byte, 32)
				copy(cp, tb)
				tplBytesList = append(tplBytesList, cp)
			}
			msg = WatchlistImportSignMessage(reg.ChainID, wallet, strings.Join(parts, ","), body.Deadline, body.Nonce)
		} else {
			tplRaw := strings.TrimPrefix(strings.TrimSpace(body.TemplateID), "0x")
			if len(tplRaw) != 64 {
				http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
				return
			}
			tplBytes, err := hex.DecodeString(tplRaw)
			if err != nil || len(tplBytes) != 32 {
				http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
				return
			}
			cp := make([]byte, 32)
			copy(cp, tplBytes)
			tplBytesList = append(tplBytesList, cp)
			msg = WatchlistSignMessage(reg.ChainID, wallet, body.TemplateID, action, body.Deadline, body.Nonce)
		}
		sig := strings.TrimSpace(body.Signature)
		if !strings.HasPrefix(sig, "0x") || len(sig) < 130 {
			http.Error(w, `{"error":"invalid signature"}`, http.StatusBadRequest)
			return
		}
		sigBytes := common.FromHex(sig)
		now := time.Now().Unix()
		if body.Deadline <= now {
			http.Error(w, `{"error":"deadline expired"}`, http.StatusBadRequest)
			return
		}
		if body.Deadline > now+int64(watchlistDeadlineMax.Seconds()) {
			http.Error(w, `{"error":"deadline too far"}`, http.StatusBadRequest)
			return
		}

		signer := common.HexToAddress(wallet)
		if !ethops.VerifyPersonalSign(signer, []byte(msg), sigBytes) {
			http.Error(w, `{"error":"invalid signature"}`, http.StatusUnauthorized)
			return
		}

		ctx := r.Context()
		tx, err := pool.Begin(ctx)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		defer func() { _ = tx.Rollback(ctx) }()

		if _, err := tx.Exec(ctx, `INSERT INTO user_watchlist_nonce (user_address, nonce) VALUES ($1, 0) ON CONFLICT (user_address) DO NOTHING`, wallet); err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		var dbNonce int64
		if err := tx.QueryRow(ctx, `SELECT nonce FROM user_watchlist_nonce WHERE LOWER(user_address)=LOWER($1) FOR UPDATE`, wallet).Scan(&dbNonce); err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		if dbNonce != body.Nonce {
			http.Error(w, `{"error":"stale nonce"}`, http.StatusConflict)
			return
		}

		qtx := dbqueries.New(tx)
		switch action {
		case "add":
			if err := qtx.UpsertUserWatchlist(ctx, dbqueries.UpsertUserWatchlistParams{
				UserAddress: wallet,
				TemplateID:  tplBytesList[0],
			}); err != nil {
				http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
				return
			}
		case "remove":
			if err := qtx.DeleteUserWatchlist(ctx, dbqueries.DeleteUserWatchlistParams{
				UserAddress: wallet,
				TemplateID:  tplBytesList[0],
			}); err != nil {
				http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
				return
			}
		case "import":
			for _, tb := range tplBytesList {
				if err := qtx.UpsertUserWatchlist(ctx, dbqueries.UpsertUserWatchlistParams{
					UserAddress: wallet,
					TemplateID:  tb,
				}); err != nil {
					http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
					return
				}
			}
		}

		if _, err := tx.Exec(ctx, `UPDATE user_watchlist_nonce SET nonce = nonce + 1, updated_at = NOW() WHERE LOWER(user_address)=LOWER($1)`, wallet); err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		if err := tx.Commit(ctx); err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}

		out := map[string]any{
			"ok":        true,
			"wallet":    wallet,
			"action":    action,
			"nextNonce": dbNonce + 1,
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
}

// Remove unused import strconv if any - I used strconv? I didn't - remove
