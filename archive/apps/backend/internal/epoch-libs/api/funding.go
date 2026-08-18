package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/funding"
	"retropick/apps/backend/internal/launchboard"
	"retropick/apps/backend/internal/registry"
)

type createFundingIntentRequest struct {
	Wallet              string `json:"wallet"`
	TargetAmountDecimal string `json:"targetAmountDecimal"`
	TargetUsdcAmount    string `json:"targetUsdcAmount"`
}

type fundingRouteSelectionRequest struct {
	Wallet  string `json:"wallet"`
	RouteID string `json:"routeId"`
}

type fundingTransitionRequest struct {
	Wallet         string `json:"wallet"`
	IdempotencyKey string `json:"idempotencyKey"`
	TxHash         string `json:"txHash"`
}

func FundingRouter(pool *pgxpool.Pool, reg *registry.Registry, svc *funding.Service) http.Handler {
	r := chi.NewRouter()
	r.Post("/intents", createFundingIntentHandler(pool, reg, svc))
	r.Get("/intents/{id}", getFundingIntentHandler(pool))
	r.Get("/intents/{id}/options", listFundingOptionsHandler(pool, svc))
	r.Post("/intents/{id}/select-route", selectFundingRouteHandler(pool))
	r.Post("/intents/{id}/execution-started", transitionFundingIntentHandler(pool, funding.StatusExecutionStarted))
	r.Post("/intents/{id}/source-tx", transitionFundingIntentHandler(pool, funding.StatusSourceTxSubmitted))
	r.Post("/intents/{id}/route-update", transitionFundingIntentHandler(pool, funding.StatusBridging))
	return r
}

func UserBalanceHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet, ok := requireAuthorizedWalletQuery(w, r, "wallet")
		if !ok {
			return
		}
		var available, locked string
		var updatedAt time.Time
		err := pool.QueryRow(r.Context(), `
SELECT usdc_available::text, usdc_locked::text, updated_at
FROM user_balances
WHERE LOWER(user_address) = LOWER($1)
`, wallet).Scan(&available, &locked, &updatedAt)
		if err == pgx.ErrNoRows {
			available = "0"
			locked = "0"
			updatedAt = time.Now().UTC()
		} else if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load user balance", nil)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"wallet":        wallet,
			"usdcAvailable": available,
			"usdcLocked":    locked,
			"updatedAt":     updatedAt.UTC().Format(time.RFC3339),
		})
	}
}

func createFundingIntentHandler(pool *pgxpool.Pool, reg *registry.Registry, svc *funding.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body createFundingIntentRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		if !common.IsHexAddress(body.Wallet) {
			http.Error(w, `{"error":"invalid wallet"}`, http.StatusBadRequest)
			return
		}
		if !WalletAuthorized(r, body.Wallet, authSecretFromContext(r)) {
			http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
			return
		}
		body.TargetAmountDecimal = strings.TrimSpace(body.TargetAmountDecimal)
		body.TargetUsdcAmount = strings.TrimSpace(body.TargetUsdcAmount)
		if body.TargetAmountDecimal == "" || body.TargetUsdcAmount == "" {
			http.Error(w, `{"error":"missing amount"}`, http.StatusBadRequest)
			return
		}
		if _, ok := fundingDecimalValid(body.TargetAmountDecimal); !ok {
			http.Error(w, `{"error":"invalid decimal amount"}`, http.StatusBadRequest)
			return
		}
		if v, ok := fundingDecimalValid(body.TargetUsdcAmount); !ok || v <= 0 {
			http.Error(w, `{"error":"invalid usdc amount"}`, http.StatusBadRequest)
			return
		}
		var id string
		var createdAt time.Time
		err := pool.QueryRow(r.Context(), `
INSERT INTO funding_intents (
    user_address, status, target_display_amount, target_amount_decimal, target_usdc_amount,
    settlement_chain_id, settlement_token_address, expires_at
) VALUES (LOWER($1), 'CREATED', $2, $2, $3::numeric, $4, $5, NOW() + INTERVAL '15 minutes')
RETURNING id::text, created_at
`, body.Wallet, body.TargetAmountDecimal, body.TargetUsdcAmount, reg.ChainID, strings.ToLower(reg.Contracts.StakeToken)).Scan(&id, &createdAt)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		if svc != nil {
			if intentID, parseErr := uuid.Parse(id); parseErr == nil {
				_ = svc.EnsureRouteOptions(r.Context(), intentID)
			}
		}
		writeJSON(w, http.StatusCreated, map[string]any{
			"id":        id,
			"wallet":    strings.ToLower(body.Wallet),
			"status":    "CREATED",
			"createdAt": createdAt.UTC().Format(time.RFC3339),
		})
	}
}

func getFundingIntentHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		intentID, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_INTENT_ID", "invalid funding intent id", nil)
			return
		}
		if _, ok := requireFundingIntentAccess(w, r, pool, intentID); !ok {
			return
		}
		intent, err := loadFundingIntent(r.Context(), pool, intentID.String())
		if err == pgx.ErrNoRows {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, intent)
	}
}

func listFundingOptionsHandler(pool *pgxpool.Pool, svc *funding.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		intentID, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			http.Error(w, `{"error":"invalid intent id"}`, http.StatusBadRequest)
			return
		}
		if _, ok := requireFundingIntentAccess(w, r, pool, intentID); !ok {
			return
		}
		if svc != nil && r.URL.Query().Get("refresh") == "1" {
			_ = svc.EnsureRouteOptions(r.Context(), intentID)
		}
		rows, err := pool.Query(r.Context(), `
SELECT id::text, provider, provider_route_id, source_chain_id, source_token_address,
       source_token_symbol, source_token_decimals, source_amount::text,
       estimated_usdc_received::text, min_usdc_received::text,
       estimated_duration_seconds, route_score::text, status, created_at
FROM funding_route_options
WHERE funding_intent_id = $1::uuid
ORDER BY route_score DESC NULLS LAST, created_at ASC
`, intentID.String())
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		options := []map[string]any{}
		for rows.Next() {
			var id, provider, providerRouteID, sourceToken, amount, est, min, routeScore, status string
			var symbol *string
			var sourceChain int64
			var decimals *int32
			var duration *int32
			var createdAt time.Time
			if err := rows.Scan(&id, &provider, &providerRouteID, &sourceChain, &sourceToken, &symbol, &decimals, &amount, &est, &min, &duration, &routeScore, &status, &createdAt); err != nil {
				http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
				return
			}
			options = append(options, map[string]any{
				"id":                       id,
				"provider":                 provider,
				"providerRouteId":          providerRouteID,
				"sourceChainId":            sourceChain,
				"sourceTokenAddress":       sourceToken,
				"sourceTokenSymbol":        symbol,
				"sourceTokenDecimals":      decimals,
				"sourceAmount":             amount,
				"estimatedUsdcReceived":    est,
				"minUsdcReceived":          min,
				"estimatedDurationSeconds": duration,
				"routeScore":               routeScore,
				"status":                   status,
				"createdAt":                createdAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]any{"options": options})
	}
}

func selectFundingRouteHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		intentID, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_INTENT_ID", "invalid funding intent id", nil)
			return
		}
		ownerWallet, ok := requireFundingIntentAccess(w, r, pool, intentID)
		if !ok {
			return
		}
		var body fundingRouteSelectionRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
			return
		}
		if _, err := validateOwnedWalletBinding(body.Wallet, ownerWallet); err != nil {
			if errors.Is(err, errInvalidWallet) {
				writeAPIError(w, http.StatusBadRequest, "INVALID_WALLET", err.Error(), nil)
			} else {
				writeAPIError(w, http.StatusForbidden, "WALLET_MISMATCH", err.Error(), nil)
			}
			return
		}
		routeID, err := uuid.Parse(strings.TrimSpace(body.RouteID))
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_ROUTE_ID", "invalid route id", nil)
			return
		}
		tx, err := pool.Begin(r.Context())
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not start funding route transaction", nil)
			return
		}
		defer tx.Rollback(r.Context())

		var currentStatus, lockedOwnerWallet string
		err = tx.QueryRow(r.Context(), `
SELECT status, user_address
FROM funding_intents
WHERE id = $1
FOR UPDATE
`, intentID).Scan(&currentStatus, &lockedOwnerWallet)
		if errors.Is(err, pgx.ErrNoRows) {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "funding intent not found", nil)
			return
		}
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load funding intent", nil)
			return
		}
		if !strings.EqualFold(lockedOwnerWallet, ownerWallet) {
			writeAPIError(w, http.StatusConflict, "OWNER_CHANGED", "funding intent owner changed during request", nil)
			return
		}
		if err := funding.ValidateTransition(currentStatus, funding.StatusRouteSelected); err != nil {
			writeAPIError(w, http.StatusConflict, "INVALID_TRANSITION", "invalid transition", nil)
			return
		}
		tag, err := tx.Exec(r.Context(), `
UPDATE funding_route_options
SET status = CASE WHEN id = $2 THEN 'SELECTED' ELSE 'AVAILABLE' END
WHERE funding_intent_id = $1
  AND (id = $2 OR status = 'SELECTED')
`, intentID, routeID)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not update funding route options", nil)
			return
		}
		if tag.RowsAffected() == 0 {
			writeAPIError(w, http.StatusNotFound, "ROUTE_NOT_FOUND", "route not found", nil)
			return
		}
		_, err = tx.Exec(r.Context(), `
UPDATE funding_intents
SET status = $2, selected_route_id = $3, updated_at = NOW()
WHERE id = $1
`, intentID, funding.StatusRouteSelected, routeID)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not update funding intent status", nil)
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not commit funding route selection", nil)
			return
		}
		intent, err := loadFundingIntent(r.Context(), pool, intentID.String())
		if err != nil {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "funding intent not found", nil)
			return
		}
		writeJSON(w, http.StatusOK, intent)
	}
}

func transitionFundingIntentHandler(pool *pgxpool.Pool, toStatus string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		intentID, err := uuid.Parse(chi.URLParam(r, "id"))
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_INTENT_ID", "invalid funding intent id", nil)
			return
		}
		ownerWallet, ok := requireFundingIntentAccess(w, r, pool, intentID)
		if !ok {
			return
		}
		var body fundingTransitionRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
			return
		}
		boundWallet, err := validateOwnedWalletBinding(body.Wallet, ownerWallet)
		if err != nil {
			if errors.Is(err, errInvalidWallet) {
				writeAPIError(w, http.StatusBadRequest, "INVALID_WALLET", err.Error(), nil)
			} else {
				writeAPIError(w, http.StatusForbidden, "WALLET_MISMATCH", err.Error(), nil)
			}
			return
		}
		if requiresIdempotencyKey(toStatus) && strings.TrimSpace(body.IdempotencyKey) == "" {
			writeAPIError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "missing idempotencyKey", nil)
			return
		}
		txHash := strings.TrimSpace(body.TxHash)
		if requiresTxHash(toStatus) && !isValidTxHash(txHash) {
			writeAPIError(w, http.StatusBadRequest, "INVALID_TX_HASH", "invalid txHash", nil)
			return
		}
		tx, err := pool.Begin(r.Context())
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not start funding transition transaction", nil)
			return
		}
		defer tx.Rollback(r.Context())

		var currentStatus, lockedOwnerWallet string
		err = tx.QueryRow(r.Context(), `
SELECT status, user_address
FROM funding_intents
WHERE id = $1
FOR UPDATE
`, intentID).Scan(&currentStatus, &lockedOwnerWallet)
		if errors.Is(err, pgx.ErrNoRows) {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "funding intent not found", nil)
			return
		}
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load funding intent", nil)
			return
		}
		if !strings.EqualFold(lockedOwnerWallet, ownerWallet) {
			writeAPIError(w, http.StatusConflict, "OWNER_CHANGED", "funding intent owner changed during request", nil)
			return
		}
		if err := funding.ValidateTransition(currentStatus, toStatus); err != nil {
			writeAPIError(w, http.StatusConflict, "INVALID_TRANSITION", "invalid transition", nil)
			return
		}
		idempotencyKey := strings.TrimSpace(body.IdempotencyKey)
		if idempotencyKey != "" {
			tag, err := tx.Exec(r.Context(), `
INSERT INTO funding_transition_guards (funding_intent_id, to_status, idempotency_key)
VALUES ($1, $2, $3)
ON CONFLICT (funding_intent_id, to_status, idempotency_key) DO NOTHING
`, intentID, toStatus, idempotencyKey)
			if err != nil {
				writeAPIError(w, http.StatusInternalServerError, "DB", "could not create funding transition guard", nil)
				return
			}
			if tag.RowsAffected() == 0 {
				writeAPIError(w, http.StatusConflict, "DUPLICATE_TRANSITION", "duplicate transition", nil)
				return
			}
		}
		_, err = tx.Exec(r.Context(), `
UPDATE funding_intents
SET status = $2, updated_at = NOW()
WHERE id = $1
`, intentID, toStatus)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not update funding intent status", nil)
			return
		}
		if txHash != "" {
			_, err = tx.Exec(r.Context(), `
INSERT INTO submitted_transactions (tx_hash, user_address, action, idempotency_key, status)
VALUES ($1, LOWER($2), 'funding_transition', NULLIF($3,''), 'submitted')
ON CONFLICT (tx_hash) DO UPDATE
SET status = EXCLUDED.status, updated_at = NOW()
`, txHash, boundWallet, strings.TrimSpace(body.IdempotencyKey))
			if err != nil {
				writeAPIError(w, http.StatusInternalServerError, "DB", "could not upsert submitted transaction", nil)
				return
			}
		}
		if err := tx.Commit(r.Context()); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not commit funding transition", nil)
			return
		}
		intent, err := loadFundingIntent(r.Context(), pool, intentID.String())
		if err != nil {
			writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "funding intent not found", nil)
			return
		}
		writeJSON(w, http.StatusOK, intent)
	}
}

func fundingDecimalValid(raw string) (int64, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, false
	}
	v, err := strconv.ParseInt(raw, 10, 64)
	return v, err == nil && v >= 0
}

func requiresIdempotencyKey(status string) bool {
	switch status {
	case funding.StatusExecutionStarted, funding.StatusSourceTxSubmitted, funding.StatusBridging:
		return true
	default:
		return false
	}
}

func requiresTxHash(status string) bool {
	return status == funding.StatusSourceTxSubmitted
}

func isValidTxHash(hash string) bool {
	if len(hash) != 66 || !strings.HasPrefix(hash, "0x") {
		return false
	}
	for _, c := range hash[2:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

func loadFundingIntent(ctx context.Context, pool *pgxpool.Pool, id string) (map[string]any, error) {
	var user, status, targetCurrency, targetAmount, targetUsdc, settlementToken string
	var chainID int64
	var recommended, selected *string
	var expiresAt, createdAt, updatedAt time.Time
	var failureCode, failureMessage *string
	err := pool.QueryRow(ctx, `
SELECT user_address, status, target_currency, target_amount_decimal, target_usdc_amount::text,
       settlement_chain_id, settlement_token_address, recommended_route_id::text, selected_route_id::text,
       expires_at, created_at, updated_at, failure_code, failure_message
FROM funding_intents
WHERE id = $1::uuid
`, id).Scan(&user, &status, &targetCurrency, &targetAmount, &targetUsdc, &chainID, &settlementToken, &recommended, &selected, &expiresAt, &createdAt, &updatedAt, &failureCode, &failureMessage)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"id":                  id,
		"wallet":              user,
		"status":              status,
		"targetCurrency":      targetCurrency,
		"targetAmountDecimal": targetAmount,
		"targetUsdcAmount":    targetUsdc,
		"settlementChainId":   chainID,
		"settlementToken":     settlementToken,
		"recommendedRouteId":  recommended,
		"selectedRouteId":     selected,
		"expiresAt":           expiresAt.UTC().Format(time.RFC3339),
		"createdAt":           createdAt.UTC().Format(time.RFC3339),
		"updatedAt":           updatedAt.UTC().Format(time.RFC3339),
		"failureCode":         failureCode,
		"failureMessage":      failureMessage,
	}, nil
}

func ChartHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		feedID := strings.TrimSpace(r.URL.Query().Get("feedId"))
		if feedID == "" {
			catalog, err := launchboard.Metadata()
			if err != nil {
				http.Error(w, `{"error":"feed registry"}`, http.StatusInternalServerError)
				return
			}
			meta, ok := catalog.LookupTemplateID(chi.URLParam(r, "templateId"))
			if !ok || strings.TrimSpace(meta.Feed.Address) == "" {
				http.Error(w, `{"error":"primary feed not found"}`, http.StatusNotFound)
				return
			}
			feedID = strings.ToLower(meta.Feed.Address)
		}
		interval := int32(60)
		if raw := r.URL.Query().Get("interval"); raw != "" {
			if n, err := strconv.ParseInt(raw, 10, 32); err == nil && n > 0 {
				interval = int32(n)
			}
		}
		limit := int32(500)
		if raw := r.URL.Query().Get("limit"); raw != "" {
			if n, err := strconv.ParseInt(raw, 10, 32); err == nil && n > 0 && n <= 2000 {
				limit = int32(n)
			}
		}
		rows, err := pool.Query(r.Context(), `
SELECT feed_id, interval_sec, bucket_start, open_e8::text, high_e8::text, low_e8::text, close_e8::text, source, sample_count, updated_at
FROM price_candles
WHERE feed_id = $1 AND interval_sec = $2
ORDER BY bucket_start DESC
LIMIT $3
`, feedID, interval, limit)
		if err != nil {
			http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		candles := []map[string]any{}
		for rows.Next() {
			var feed, open, high, low, close, source string
			var intervalSec int32
			var bucketStart, updatedAt time.Time
			var samples int32
			if err := rows.Scan(&feed, &intervalSec, &bucketStart, &open, &high, &low, &close, &source, &samples, &updatedAt); err != nil {
				http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
				return
			}
			candles = append(candles, map[string]any{
				"feedId":      feed,
				"intervalSec": intervalSec,
				"bucketStart": bucketStart.UTC().Format(time.RFC3339),
				"openE8":      open,
				"highE8":      high,
				"lowE8":       low,
				"closeE8":     close,
				"source":      source,
				"sampleCount": samples,
				"updatedAt":   updatedAt.UTC().Format(time.RFC3339),
			})
		}
		writeJSON(w, http.StatusOK, map[string]any{"feedId": feedID, "intervalSec": interval, "candles": candles})
	}
}
