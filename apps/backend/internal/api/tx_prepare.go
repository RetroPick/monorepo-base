package api

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

type txPrepareRequest struct {
	Wallet           string  `json:"wallet"`
	TemplateID       string  `json:"templateId"`
	EpochID          int64   `json:"epochId"`
	OutcomeIndex     int64   `json:"outcomeIndex"`
	FromOutcomeIndex int64   `json:"fromOutcomeIndex"`
	ToOutcomeIndex   int64   `json:"toOutcomeIndex"`
	Amount           string  `json:"amount"`
	EpochIDs         []int64 `json:"epochIds"`
	IdempotencyKey   string  `json:"idempotencyKey"`
}

type txSubmitRequest struct {
	Wallet         string `json:"wallet"`
	TxHash         string `json:"txHash"`
	Action         string `json:"action"`
	TemplateID     string `json:"templateId"`
	EpochID        int64  `json:"epochId"`
	IdempotencyKey string `json:"idempotencyKey"`
}

func TxRouter(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.Handler {
	r := chi.NewRouter()
	r.Post("/prepare/enter", prepareEnterHandler(pool, eth, reg))
	r.Post("/prepare/switch", prepareSwitchHandler(pool, eth, reg))
	r.Post("/prepare/claim", prepareClaimHandler(pool, eth, reg))
	r.Post("/submit", submitTxHandler(pool))
	return r
}

func prepareEnterHandler(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, ok := decodePrepareBody(w, r)
		if !ok {
			return
		}
		tid, ok := decodeTemplateID(w, body.TemplateID)
		if !ok {
			return
		}
		amount, ok := parsePositiveBig(w, body.Amount, "amount")
		if !ok {
			return
		}
		if body.OutcomeIndex < 0 || body.OutcomeIndex > 255 {
			http.Error(w, `{"error":"invalid outcomeIndex"}`, http.StatusBadRequest)
			return
		}
		if !ensureEpochTradeable(w, r, pool, tid, body.EpochID) {
			return
		}
		writePreparedTx(w, r, eth, reg, "enter", "depositToSide", []any{
			common.BytesToHash(tid),
			big.NewInt(body.EpochID),
			uint8(body.OutcomeIndex),
			amount,
		}, body)
	}
}

func prepareSwitchHandler(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, ok := decodePrepareBody(w, r)
		if !ok {
			return
		}
		tid, ok := decodeTemplateID(w, body.TemplateID)
		if !ok {
			return
		}
		amount, ok := parsePositiveBig(w, body.Amount, "amount")
		if !ok {
			return
		}
		if body.FromOutcomeIndex < 0 || body.FromOutcomeIndex > 255 || body.ToOutcomeIndex < 0 || body.ToOutcomeIndex > 255 || body.FromOutcomeIndex == body.ToOutcomeIndex {
			http.Error(w, `{"error":"invalid switch outcomes"}`, http.StatusBadRequest)
			return
		}
		if !ensureEpochTradeable(w, r, pool, tid, body.EpochID) {
			return
		}
		writePreparedTx(w, r, eth, reg, "switch", "switchSide", []any{
			common.BytesToHash(tid),
			big.NewInt(body.EpochID),
			uint8(body.FromOutcomeIndex),
			uint8(body.ToOutcomeIndex),
			amount,
		}, body)
	}
}

func prepareClaimHandler(pool *pgxpool.Pool, eth *ethops.Caller, reg *registry.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, ok := decodePrepareBody(w, r)
		if !ok {
			return
		}
		tid, ok := decodeTemplateID(w, body.TemplateID)
		if !ok {
			return
		}
		epochIDs := body.EpochIDs
		if len(epochIDs) == 0 && body.EpochID > 0 {
			epochIDs = []int64{body.EpochID}
		}
		if len(epochIDs) == 0 || len(epochIDs) > 50 {
			http.Error(w, `{"error":"invalid epochIds"}`, http.StatusBadRequest)
			return
		}
		if len(epochIDs) == 1 {
			if !ensureEpochClaimable(w, r, pool, tid, epochIDs[0]) {
				return
			}
			writePreparedTx(w, r, eth, reg, "claim", "claim", []any{
				common.BytesToHash(tid),
				big.NewInt(epochIDs[0]),
			}, body)
			return
		}
		args := make([]*big.Int, len(epochIDs))
		for i, eid := range epochIDs {
			if !ensureEpochClaimable(w, r, pool, tid, eid) {
				return
			}
			args[i] = big.NewInt(eid)
		}
		writePreparedTx(w, r, eth, reg, "claim_many", "claimMany", []any{
			common.BytesToHash(tid),
			args,
		}, body)
	}
}

func submitTxHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body txSubmitRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		if !common.IsHexAddress(body.Wallet) || !strings.HasPrefix(body.TxHash, "0x") || len(body.TxHash) != 66 {
			http.Error(w, `{"error":"invalid wallet or txHash"}`, http.StatusBadRequest)
			return
		}
		var tid any
		if body.TemplateID != "" {
			b, ok := decodeTemplateID(w, body.TemplateID)
			if !ok {
				return
			}
			tid = b
		}
		var epoch any
		if body.EpochID > 0 {
			epoch = body.EpochID
		}
		var idem any
		if body.IdempotencyKey != "" {
			idem = body.IdempotencyKey
		}
		_, err := pool.Exec(r.Context(), `
INSERT INTO submitted_transactions (tx_hash, user_address, action, template_id, epoch_id, idempotency_key)
VALUES ($1, LOWER($2), $3, $4, $5, $6)
ON CONFLICT (tx_hash) DO UPDATE SET
    status = 'submitted',
    updated_at = NOW()
`, strings.ToLower(body.TxHash), body.Wallet, strings.ToLower(body.Action), tid, epoch, idem)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "txHash": strings.ToLower(body.TxHash)})
	}
}

func decodePrepareBody(w http.ResponseWriter, r *http.Request) (txPrepareRequest, bool) {
	var body txPrepareRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
		return body, false
	}
	if body.Wallet != "" && !common.IsHexAddress(body.Wallet) {
		http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
		return body, false
	}
	return body, true
}

func decodeTemplateID(w http.ResponseWriter, raw string) ([]byte, bool) {
	s := strings.TrimPrefix(strings.TrimSpace(raw), "0x")
	b, err := hex.DecodeString(s)
	if err != nil || len(b) != 32 {
		http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
		return nil, false
	}
	return b, true
}

func parsePositiveBig(w http.ResponseWriter, raw string, field string) (*big.Int, bool) {
	n, ok := new(big.Int).SetString(strings.TrimSpace(raw), 10)
	if !ok || n.Sign() <= 0 {
		http.Error(w, fmt.Sprintf(`{"error":"invalid %s"}`, field), http.StatusBadRequest)
		return nil, false
	}
	return n, true
}

func ensureEpochTradeable(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, templateID []byte, epochID int64) bool {
	row, err := dbqueries.New(pool).GetEpoch(r.Context(), dbqueries.GetEpochParams{TemplateID: templateID, EpochID: epochID})
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, `{"error":"epoch not found"}`, http.StatusNotFound)
			return false
		}
		http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
		return false
	}
	now := time.Now().UTC()
	if row.Status != "open" || (row.OpenAt.Valid && now.Before(row.OpenAt.Time)) || (row.LockAt.Valid && !now.Before(row.LockAt.Time)) {
		http.Error(w, `{"error":"MARKET_LOCKED","message":"market is not open for trading"}`, http.StatusConflict)
		return false
	}
	return true
}

func ensureEpochClaimable(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, templateID []byte, epochID int64) bool {
	row, err := dbqueries.New(pool).GetEpoch(r.Context(), dbqueries.GetEpochParams{TemplateID: templateID, EpochID: epochID})
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, `{"error":"epoch not found"}`, http.StatusNotFound)
			return false
		}
		http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
		return false
	}
	if !row.Claimable {
		http.Error(w, `{"error":"not claimable"}`, http.StatusConflict)
		return false
	}
	return true
}

func writePreparedTx(w http.ResponseWriter, r *http.Request, eth *ethops.Caller, reg *registry.Registry, action string, method string, args []any, body txPrepareRequest) {
	if eth == nil {
		http.Error(w, `{"error":"eth client unavailable"}`, http.StatusServiceUnavailable)
		return
	}
	proxy := common.HexToAddress(reg.Contracts.MarketEngineProxy)
	calldata, err := eth.PrepareTx(reg.ChainID, proxy, method, args, nil)
	if err != nil {
		http.Error(w, `{"error":"prepare tx"}`, http.StatusBadRequest)
		return
	}
	expiresAt := time.Now().UTC().Add(90 * time.Second)
	idem := strings.TrimSpace(body.IdempotencyKey)
	if idem == "" {
		idem = action + ":" + body.TemplateID + ":" + strconv.FormatInt(body.EpochID, 10) + ":" + strconv.FormatInt(time.Now().UnixNano(), 10)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"action":         action,
		"chainId":        reg.ChainID,
		"to":             proxy.Hex(),
		"value":          "0",
		"data":           "0x" + hex.EncodeToString(calldata),
		"method":         method,
		"expiresAt":      expiresAt.Format(time.RFC3339),
		"idempotencyKey": idem,
	})
}
