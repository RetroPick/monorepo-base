package api

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
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
)

type FundingAPIConfig struct {
	SettlementChainID      int64
	SettlementUSDCAddress  string
	SettlementReceiver     string
	MinDepositUSDC         string
	SoftMaxDepositUSDC     string
	HardMaxDepositUSDC     string
	SupportedSourceChains  []int64
	SupportedSourceTokens  []string
	SupportedProviderNames []string
	LifiWebhookSecret      string
}

type createFundingIntentV2Request struct {
	UserAddress    string `json:"userAddress"`
	TargetCurrency string `json:"targetCurrency"`
	TargetAmount   string `json:"targetAmount"`
	ClientNonce    string `json:"clientNonce"`
	Mode           string `json:"mode"`
}

func FundingAbstractionRouter(pool *pgxpool.Pool, svc *funding.Service, cfg FundingAPIConfig) http.Handler {
	r := chi.NewRouter()
	r.Get("/config", getFundingConfigHandler(cfg))
	r.Post("/intents", createFundingIntentV2Handler(pool, cfg))
	r.Post("/intents/{intentId}/scan-balances", scanFundingIntentBalancesHandler(pool, svc))
	r.Get("/intents/{intentId}/options", listFundingOptionsV2Handler(pool))
	r.Post("/intents/{intentId}/select-option", selectFundingOptionHandler(pool))
	r.Get("/intents/{intentId}", getFundingIntentV2Handler(pool))
	r.Get("/executions/{executionId}", getFundingExecutionHandler(pool))
	r.Post("/executions/{executionId}/start", fundingExecutionStartHandler(pool))
	r.Post("/executions/{executionId}/route-update", fundingExecutionRouteUpdateHandler(pool))
	r.Post("/executions/{executionId}/source-tx", fundingExecutionSourceTxHandler(pool))
	r.Post("/webhooks/lifi", fundingLifiWebhookHandler(pool, cfg))
	return r
}

func getFundingConfigHandler(cfg FundingAPIConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		supportedTokens := map[string][]string{}
		for _, chain := range cfg.SupportedSourceChains {
			supportedTokens[strconv.FormatInt(chain, 10)] = cfg.SupportedSourceTokens
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"settlement": map[string]any{
				"chainId": cfg.SettlementChainID,
				"token": map[string]any{
					"symbol":   "USDC",
					"address":  strings.ToLower(cfg.SettlementUSDCAddress),
					"decimals": 6,
				},
				"receiver": strings.ToLower(cfg.SettlementReceiver),
			},
			"limits": map[string]any{
				"minDepositUsdc":     cfg.MinDepositUSDC,
				"softMaxDepositUsdc": cfg.SoftMaxDepositUSDC,
				"hardMaxDepositUsdc": cfg.HardMaxDepositUSDC,
			},
			"supportedSourceChains": cfg.SupportedSourceChains,
			"supportedSourceTokens": supportedTokens,
			"providers":             cfg.SupportedProviderNames,
		})
	}
}

func createFundingIntentV2Handler(pool *pgxpool.Pool, cfg FundingAPIConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body createFundingIntentV2Request
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
			return
		}
		userAddress, ok := requireAuthorizedWalletValue(w, r, body.UserAddress)
		if !ok {
			return
		}
		targetUsdc, ok := usdcBaseUnits(body.TargetAmount)
		if !ok || targetUsdc <= 0 {
			writeAPIError(w, http.StatusBadRequest, "INVALID_TARGET_AMOUNT", "invalid target amount", nil)
			return
		}
		minAmt, _ := strconv.ParseInt(cfg.MinDepositUSDC, 10, 64)
		hardMax, _ := strconv.ParseInt(cfg.HardMaxDepositUSDC, 10, 64)
		if minAmt > 0 && targetUsdc < minAmt {
			writeAPIError(w, http.StatusBadRequest, "TARGET_TOO_LOW", "target amount below minimum", nil)
			return
		}
		if hardMax > 0 && targetUsdc > hardMax {
			writeAPIError(w, http.StatusBadRequest, "TARGET_TOO_HIGH", "target amount above maximum", nil)
			return
		}

		var err error
		var id string
		var createdAt, expiresAt time.Time
		err = pool.QueryRow(r.Context(), `
INSERT INTO funding_intents (
    user_address, client_nonce, status, target_currency, target_display_amount, target_amount_decimal, target_usdc_amount,
    settlement_chain_id, settlement_token_address, settlement_receiver_address, settlement_token_symbol, settlement_token_decimals,
    mode, expires_at
) VALUES (
    LOWER($1), NULLIF($2,''), $3, 'USD', $4, $4, $5::numeric,
    $6, LOWER($7), LOWER($8), 'USDC', 6, $9, NOW() + INTERVAL '15 minutes'
)
RETURNING id::text, created_at, expires_at
`, userAddress, strings.TrimSpace(body.ClientNonce), funding.StatusBalanceScanning, strings.TrimSpace(body.TargetAmount), strconv.FormatInt(targetUsdc, 10), cfg.SettlementChainID, cfg.SettlementUSDCAddress, cfg.SettlementReceiver, normalizedMode(body.Mode)).Scan(&id, &createdAt, &expiresAt)
		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "uniq_funding_intents_user_nonce") {
				writeAPIError(w, http.StatusConflict, "DUPLICATE_CLIENT_NONCE", "duplicate client nonce", nil)
				return
			}
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not create funding intent", nil)
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{
			"intentId": id,
			"status":   funding.StatusBalanceScanning,
			"target": map[string]any{
				"currency":      "USDC",
				"amount":        strconv.FormatInt(targetUsdc, 10),
				"displayAmount": strings.TrimSpace(body.TargetAmount),
			},
			"settlement": map[string]any{
				"chainId":      cfg.SettlementChainID,
				"tokenAddress": strings.ToLower(cfg.SettlementUSDCAddress),
				"receiver":     strings.ToLower(cfg.SettlementReceiver),
			},
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"expiresAt": expiresAt.UTC().Format(time.RFC3339),
		})
	}
}

func scanFundingIntentBalancesHandler(pool *pgxpool.Pool, svc *funding.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		intentID, err := uuid.Parse(chi.URLParam(r, "intentId"))
		if err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_INTENT_ID", "invalid funding intent id", nil)
			return
		}
		if _, ok := requireFundingIntentAccess(w, r, pool, intentID); !ok {
			return
		}
		if svc != nil {
			if err := svc.EnsureRouteOptions(r.Context(), intentID); err != nil {
				_ = setIntentStatus(r.Context(), pool, intentID, funding.StatusNoFundingOptions, "NO_FUNDING_OPTIONS", err.Error())
				writeAPIError(w, http.StatusConflict, "NO_FUNDING_OPTIONS", "no funding options available", nil)
				return
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": funding.StatusBalanceScanning})
	}
}

func listFundingOptionsV2Handler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		intentID, err := uuid.Parse(chi.URLParam(r, "intentId"))
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_INTENT_ID"}}`, http.StatusBadRequest)
			return
		}
		if _, ok := requireFundingIntentAccess(w, r, pool, intentID); !ok {
			return
		}
		rows, err := pool.Query(r.Context(), `
SELECT id::text, provider, source_chain_id, source_token_address, source_token_symbol, source_token_decimals,
       source_amount::text, estimated_usdc_received::text, min_usdc_received::text, estimated_duration_seconds,
       route_score::text, provider_route_id
FROM funding_route_options
WHERE funding_intent_id = $1
ORDER BY route_score DESC NULLS LAST, created_at ASC
`, intentID)
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		options := make([]map[string]any, 0)
		var recommended *string
		_ = pool.QueryRow(r.Context(), `SELECT recommended_route_id::text FROM funding_intents WHERE id = $1`, intentID).Scan(&recommended)
		for rows.Next() {
			var optionID, provider, sourceToken, sourceAmount, estAmount, minAmount, score, providerRouteID string
			var sourceSymbol *string
			var sourceDecimals *int32
			var sourceChain int64
			var duration *int32
			if err := rows.Scan(&optionID, &provider, &sourceChain, &sourceToken, &sourceSymbol, &sourceDecimals, &sourceAmount, &estAmount, &minAmount, &duration, &score, &providerRouteID); err != nil {
				http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
				return
			}
			options = append(options, map[string]any{
				"optionId": optionID,
				"provider": provider,
				"source": map[string]any{
					"chainId":               sourceChain,
					"tokenAddress":          sourceToken,
					"tokenSymbol":           sourceSymbol,
					"decimals":              sourceDecimals,
					"requiredAmount":        sourceAmount,
					"displayRequiredAmount": sourceAmount,
				},
				"destination": map[string]any{
					"chainId":           nil,
					"tokenSymbol":       "USDC",
					"estimatedToAmount": estAmount,
					"minToAmount":       minAmount,
				},
				"estimate": map[string]any{
					"estimatedDurationSeconds": duration,
				},
				"route": map[string]any{
					"summary": providerRouteID,
				},
				"score": score,
			})
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"intentId":            intentID.String(),
			"status":              funding.StatusOptionsReady,
			"recommendedOptionId": recommended,
			"options":             options,
		})
	}
}

func selectFundingOptionHandler(pool *pgxpool.Pool) http.HandlerFunc {
	type req struct {
		OptionID string `json:"optionId"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		intentID, err := uuid.Parse(chi.URLParam(r, "intentId"))
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_INTENT_ID"}}`, http.StatusBadRequest)
			return
		}
		if _, ok := requireFundingIntentAccess(w, r, pool, intentID); !ok {
			return
		}
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":{"code":"INVALID_JSON"}}`, http.StatusBadRequest)
			return
		}
		optionID, err := uuid.Parse(strings.TrimSpace(body.OptionID))
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_OPTION_ID"}}`, http.StatusBadRequest)
			return
		}
		tx, err := pool.Begin(r.Context())
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		defer tx.Rollback(r.Context())

		var sourceChain, destChain int64
		var sourceToken, sourceAmount, destToken, est, min string
		var provider string
		var snap []byte
		err = tx.QueryRow(r.Context(), `
SELECT provider, source_chain_id, source_token_address, source_amount::text,
       COALESCE(route_snapshot->>'toChainId','0')::bigint,
       COALESCE(route_snapshot->>'toTokenAddress',''),
       estimated_usdc_received::text, min_usdc_received::text, route_snapshot
FROM funding_route_options
WHERE id = $1 AND funding_intent_id = $2
`, optionID, intentID).Scan(&provider, &sourceChain, &sourceToken, &sourceAmount, &destChain, &destToken, &est, &min, &snap)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, `{"error":{"code":"OPTION_NOT_FOUND"}}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}

		var executionID string
		err = tx.QueryRow(r.Context(), `
INSERT INTO funding_executions (
    funding_intent_id, funding_route_option_id, provider, status, wallet_address,
    source_chain_id, source_token_address, source_amount,
    destination_chain_id, destination_token_address, expected_usdc_amount, min_usdc_amount, route_snapshot
)
SELECT fi.id, $2, $3, $4, fi.user_address, $5, $6, $7::numeric, $8, $9, $10::numeric, $11::numeric, $12::jsonb
FROM funding_intents fi
WHERE fi.id = $1
RETURNING id::text
`, intentID, optionID, provider, funding.StatusRouteSelected, sourceChain, sourceToken, sourceAmount, destChain, strings.ToLower(destToken), est, min, string(snap)).Scan(&executionID)
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}

		_, err = tx.Exec(r.Context(), `UPDATE funding_route_options SET status = CASE WHEN id = $2 THEN 'SELECTED' ELSE status END WHERE funding_intent_id = $1`, intentID, optionID)
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		_, err = tx.Exec(r.Context(), `UPDATE funding_intents SET status = $2, selected_route_id = $3, updated_at = NOW() WHERE id = $1`, intentID, funding.StatusRouteSelected, optionID)
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"intentId": intentID.String(),
			"status":   funding.StatusRouteSelected,
			"execution": map[string]any{
				"executionId":     executionID,
				"provider":        provider,
				"serializedRoute": json.RawMessage(snap),
				"routeVersion":    routeVersionHex(snap),
			},
		})
	}
}

func getFundingExecutionHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		executionID := strings.TrimSpace(chi.URLParam(r, "executionId"))
		executionUUID, err := uuid.Parse(executionID)
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_EXECUTION_ID"}}`, http.StatusBadRequest)
			return
		}
		if _, _, ok := requireFundingExecutionAccess(w, r, pool, executionUUID); !ok {
			return
		}
		var status, provider, sourceToken, destinationToken string
		var sourceChain, destinationChain int64
		var sourceAmount, expectedAmount, minAmount string
		var sourceTxHash, destinationTxHash *string
		var routeSnapshot []byte
		var updatedAt time.Time
		err = pool.QueryRow(r.Context(), `
SELECT status, provider, source_chain_id, source_token_address, source_amount::text,
       destination_chain_id, destination_token_address, expected_usdc_amount::text, min_usdc_amount::text,
       source_tx_hash, destination_tx_hash, route_snapshot, updated_at
FROM funding_executions
WHERE id::text = $1
`, executionID).Scan(&status, &provider, &sourceChain, &sourceToken, &sourceAmount, &destinationChain, &destinationToken, &expectedAmount, &minAmount, &sourceTxHash, &destinationTxHash, &routeSnapshot, &updatedAt)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, `{"error":{"code":"NOT_FOUND"}}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"executionId":        executionID,
			"status":             status,
			"provider":           provider,
			"sourceChainId":      sourceChain,
			"sourceToken":        sourceToken,
			"sourceAmount":       sourceAmount,
			"destinationChainId": destinationChain,
			"destinationToken":   destinationToken,
			"expectedUsdcAmount": expectedAmount,
			"minUsdcAmount":      minAmount,
			"sourceTxHash":       sourceTxHash,
			"destinationTxHash":  destinationTxHash,
			"serializedRoute":    json.RawMessage(routeSnapshot),
			"routeVersion":       routeVersionHex(routeSnapshot),
			"updatedAt":          updatedAt.UTC().Format(time.RFC3339),
		})
	}
}

func getFundingIntentV2Handler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		intentUUID, err := uuid.Parse(chi.URLParam(r, "intentId"))
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_INTENT_ID"}}`, http.StatusBadRequest)
			return
		}
		if _, ok := requireFundingIntentAccess(w, r, pool, intentUUID); !ok {
			return
		}
		intent, err := loadFundingIntent(r.Context(), pool, intentUUID.String())
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, `{"error":{"code":"NOT_FOUND"}}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"intentId":         intentUUID.String(),
			"status":           intent["status"],
			"targetUsdcAmount": intent["targetUsdcAmount"],
			"selectedOptionId": intent["selectedRouteId"],
			"failureCode":      intent["failureCode"],
			"failureMessage":   intent["failureMessage"],
			"updatedAt":        intent["updatedAt"],
		})
	}
}

func fundingExecutionStartHandler(pool *pgxpool.Pool) http.HandlerFunc {
	type req struct {
		WalletAddress          string `json:"walletAddress"`
		ClientRouteExecutionID string `json:"clientRouteExecutionId"`
		IdempotencyKey         string `json:"idempotencyKey"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":{"code":"INVALID_JSON"}}`, http.StatusBadRequest)
			return
		}
		executionID, err := uuid.Parse(chi.URLParam(r, "executionId"))
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_EXECUTION_ID"}}`, http.StatusBadRequest)
			return
		}
		wallet, intentID, ok := requireFundingExecutionAccess(w, r, pool, executionID)
		if !ok {
			return
		}
		if !common.IsHexAddress(body.WalletAddress) || !strings.EqualFold(wallet, body.WalletAddress) {
			writeAPIError(w, http.StatusForbidden, "WALLET_MISMATCH", "walletAddress does not match execution owner", nil)
			return
		}
		if strings.TrimSpace(body.IdempotencyKey) == "" {
			writeAPIError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "idempotencyKey is required", nil)
			return
		}
		if err := insertFundingTransitionGuard(r.Context(), pool, intentID, funding.StatusExecutionStarted, body.IdempotencyKey); err != nil {
			handleFundingGuardErr(w, err)
			return
		}
		_, err = pool.Exec(r.Context(), `
UPDATE funding_executions
SET status = $2, client_route_execution_id = NULLIF($3,''), updated_at = NOW()
WHERE id::text = $1
`, executionID.String(), funding.StatusExecutionStarted, strings.TrimSpace(body.ClientRouteExecutionID))
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		_, _ = pool.Exec(r.Context(), `
UPDATE funding_intents fi
SET status = $2, updated_at = NOW()
FROM funding_executions fe
WHERE fe.id::text = $1 AND fi.id = fe.funding_intent_id
`, executionID.String(), funding.StatusExecutionStarted)
		writeJSON(w, http.StatusOK, map[string]any{"status": funding.StatusExecutionStarted})
	}
}

func fundingExecutionRouteUpdateHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		executionID, err := uuid.Parse(chi.URLParam(r, "executionId"))
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_EXECUTION_ID"}}`, http.StatusBadRequest)
			return
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, `{"error":{"code":"INVALID_JSON"}}`, http.StatusBadRequest)
			return
		}
		_, intentID, ok := requireFundingExecutionAccess(w, r, pool, executionID)
		if !ok {
			return
		}
		idempotencyKey := strings.TrimSpace(stringValue(payload["idempotencyKey"]))
		if idempotencyKey == "" {
			writeAPIError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "idempotencyKey is required", nil)
			return
		}
		if err := insertFundingTransitionGuard(r.Context(), pool, intentID, funding.StatusBridging, idempotencyKey); err != nil {
			handleFundingGuardErr(w, err)
			return
		}
		raw, _ := json.Marshal(payload)
		_, err = pool.Exec(r.Context(), `
INSERT INTO route_update_events (funding_execution_id, provider, status, payload)
VALUES ($1, 'LIFI', $2, $3::jsonb)
`, executionID, fmt.Sprintf("%v", payload["status"]), string(raw))
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		_, _ = pool.Exec(r.Context(), `
UPDATE funding_executions
SET provider_status = $2::jsonb, updated_at = NOW()
WHERE id = $1
`, executionID, string(raw))
		if dstTx, ok := payload["destinationTxHash"].(string); ok && isValidTxHash(strings.TrimSpace(dstTx)) {
			_, _ = pool.Exec(r.Context(), `
UPDATE funding_executions
SET destination_tx_hash = LOWER($2), updated_at = NOW()
WHERE id = $1
`, executionID, dstTx)
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": funding.StatusBridging})
	}
}

func fundingExecutionSourceTxHandler(pool *pgxpool.Pool) http.HandlerFunc {
	type req struct {
		ChainID        int64  `json:"chainId"`
		TxHash         string `json:"txHash"`
		IdempotencyKey string `json:"idempotencyKey"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		executionID, err := uuid.Parse(chi.URLParam(r, "executionId"))
		if err != nil {
			http.Error(w, `{"error":{"code":"INVALID_EXECUTION_ID"}}`, http.StatusBadRequest)
			return
		}
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":{"code":"INVALID_JSON"}}`, http.StatusBadRequest)
			return
		}
		_, intentID, ok := requireFundingExecutionAccess(w, r, pool, executionID)
		if !ok {
			return
		}
		if !isValidTxHash(strings.TrimSpace(body.TxHash)) {
			http.Error(w, `{"error":{"code":"INVALID_TX_HASH"}}`, http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(body.IdempotencyKey) == "" {
			writeAPIError(w, http.StatusBadRequest, "MISSING_IDEMPOTENCY_KEY", "idempotencyKey is required", nil)
			return
		}
		if err := insertFundingTransitionGuard(r.Context(), pool, intentID, funding.StatusSourceTxSubmitted, body.IdempotencyKey); err != nil {
			handleFundingGuardErr(w, err)
			return
		}
		_, err = pool.Exec(r.Context(), `
UPDATE funding_executions
SET status = $2, source_chain_id = $3, source_tx_hash = LOWER($4), updated_at = NOW()
WHERE id::text = $1
`, executionID.String(), funding.StatusSourceTxSubmitted, body.ChainID, body.TxHash)
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		_, _ = pool.Exec(r.Context(), `
UPDATE funding_intents fi
SET status = $2, updated_at = NOW()
FROM funding_executions fe
WHERE fe.id::text = $1 AND fi.id = fe.funding_intent_id
`, executionID.String(), funding.StatusSourceTxSubmitted)
		writeJSON(w, http.StatusOK, map[string]any{"status": funding.StatusSourceTxSubmitted})
	}
}

func fundingLifiWebhookHandler(pool *pgxpool.Pool, cfg FundingAPIConfig) http.HandlerFunc {
	type webhookTx struct {
		ChainID int64  `json:"chainId"`
		TxHash  string `json:"txHash"`
		Type    string `json:"type"`
	}
	type webhookReq struct {
		EventID           string      `json:"eventId"`
		EventType         string      `json:"eventType"`
		ExecutionID       string      `json:"executionId"`
		RouteExecutionID  string      `json:"routeExecutionId"`
		Status            string      `json:"status"`
		SourceTxHash      string      `json:"sourceTxHash"`
		DestinationTxHash string      `json:"destinationTxHash"`
		ObservedTxHashes  []webhookTx `json:"observedTxHashes"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		if strings.TrimSpace(cfg.LifiWebhookSecret) != "" {
			if !constantTimeSecretEqual(r.Header.Get("X-Lifi-Webhook-Secret"), cfg.LifiWebhookSecret) {
				http.Error(w, `{"error":{"code":"UNAUTHORIZED"}}`, http.StatusUnauthorized)
				return
			}
		}
		var body webhookReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":{"code":"INVALID_JSON"}}`, http.StatusBadRequest)
			return
		}
		raw, _ := json.Marshal(body)
		if strings.TrimSpace(body.EventID) == "" {
			body.EventID = routeVersionHex(raw)
		}
		var eventID string
		tx, err := pool.Begin(r.Context())
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		defer tx.Rollback(r.Context())

		var executionUUID *uuid.UUID
		if id := strings.TrimSpace(body.ExecutionID); id != "" {
			if parsed, err := uuid.Parse(id); err == nil {
				executionUUID = &parsed
			}
		}
		err = tx.QueryRow(r.Context(), `
INSERT INTO funding_webhook_events (provider, event_id, execution_id, event_type, payload)
VALUES ('LIFI', $1, $2, NULLIF($3,''), $4::jsonb)
ON CONFLICT (provider, event_id) DO UPDATE
SET payload = EXCLUDED.payload, event_type = EXCLUDED.event_type
RETURNING id::text
`, body.EventID, executionUUID, strings.TrimSpace(body.EventType), string(raw)).Scan(&eventID)
		if err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		if executionUUID != nil {
			if isValidTxHash(strings.TrimSpace(body.SourceTxHash)) {
				_, _ = tx.Exec(r.Context(), `UPDATE funding_executions SET source_tx_hash = LOWER($2), updated_at = NOW() WHERE id = $1`, executionUUID, body.SourceTxHash)
			}
			if isValidTxHash(strings.TrimSpace(body.DestinationTxHash)) {
				_, _ = tx.Exec(r.Context(), `UPDATE funding_executions SET destination_tx_hash = LOWER($2), updated_at = NOW() WHERE id = $1`, executionUUID, body.DestinationTxHash)
			}
			_, _ = tx.Exec(r.Context(), `
INSERT INTO route_update_events (funding_execution_id, provider, status, payload)
VALUES ($1, 'LIFI', NULLIF($2,''), $3::jsonb)
`, executionUUID, strings.TrimSpace(body.Status), string(raw))
			if isValidTxHash(strings.TrimSpace(body.DestinationTxHash)) {
				_, _ = tx.Exec(r.Context(), `
UPDATE destination_usdc_transfers
SET webhook_event_id = $2::uuid, provenance = 'MERGED', provider_execution_ref = NULLIF($3,'')
WHERE tx_hash = LOWER($1)
`, body.DestinationTxHash, eventID, strings.TrimSpace(body.RouteExecutionID))
			}
		}
		if err := tx.Commit(r.Context()); err != nil {
			http.Error(w, `{"error":{"code":"DB"}}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusAccepted, map[string]any{"ok": true, "eventId": eventID})
	}
}

func constantTimeSecretEqual(got, want string) bool {
	return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}

func insertFundingTransitionGuard(ctx context.Context, pool *pgxpool.Pool, intentID uuid.UUID, toStatus, idempotencyKey string) error {
	tag, err := pool.Exec(ctx, `
INSERT INTO funding_transition_guards (funding_intent_id, to_status, idempotency_key)
VALUES ($1, $2, $3)
ON CONFLICT (funding_intent_id, to_status, idempotency_key) DO NOTHING
`, intentID, toStatus, strings.TrimSpace(idempotencyKey))
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("duplicate transition")
	}
	return nil
}

func handleFundingGuardErr(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}
	if strings.Contains(strings.ToLower(err.Error()), "duplicate transition") {
		writeAPIError(w, http.StatusConflict, "DUPLICATE_TRANSITION", "duplicate transition", nil)
		return
	}
	writeAPIError(w, http.StatusInternalServerError, "DB", "could not persist transition guard", nil)
}

func stringValue(v any) string {
	s, _ := v.(string)
	return s
}

func UserBalanceV2Handler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		wallet := strings.TrimSpace(chi.URLParam(r, "address"))
		wallet, ok := requireAuthorizedWalletValue(w, r, wallet)
		if !ok {
			return
		}
		var available, locked string
		err := pool.QueryRow(r.Context(), `
SELECT usdc_available::text, usdc_locked::text
FROM user_balances
WHERE LOWER(user_address) = LOWER($1)
`, wallet).Scan(&available, &locked)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load user balance", nil)
			return
		}
		if errors.Is(err, pgx.ErrNoRows) {
			available, locked = "0", "0"
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"userAddress": strings.ToLower(wallet),
			"asset":       "USDC",
			"chainId":     8453,
			"available":   available,
			"locked":      locked,
			"decimals":    6,
		})
	}
}

func EnterMarketFromBalanceHandler(pool *pgxpool.Pool, safetyBuffer time.Duration) http.HandlerFunc {
	type req struct {
		UserAddress string `json:"userAddress"`
		OutcomeID   int    `json:"outcomeId"`
		Amount      string `json:"amount"`
		IntentID    string `json:"intentId"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		var body req
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeAPIError(w, http.StatusBadRequest, "INVALID_JSON", "invalid json", nil)
			return
		}
		userAddress, ok := requireAuthorizedWalletValue(w, r, body.UserAddress)
		if !ok {
			return
		}
		amount, ok := fundingDecimalValid(body.Amount)
		if !ok || amount <= 0 {
			writeAPIError(w, http.StatusBadRequest, "INVALID_AMOUNT", "invalid amount", nil)
			return
		}
		marketID := chi.URLParam(r, "marketId")
		tx, err := pool.Begin(r.Context())
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not start market entry transaction", nil)
			return
		}
		defer tx.Rollback(r.Context())
		templateID, epochID, err := resolveActiveEpochForMarket(r.Context(), tx, marketID)
		if err != nil {
			writeAPIError(w, http.StatusNotFound, "MARKET_NOT_FOUND", "market not found", nil)
			return
		}
		var epochStatus string
		var lockAt *time.Time
		err = tx.QueryRow(r.Context(), `
SELECT status, lock_at
FROM epochs
WHERE template_id = $1 AND epoch_id = $2
`, templateID, epochID).Scan(&epochStatus, &lockAt)
		if err != nil {
			writeAPIError(w, http.StatusNotFound, "MARKET_NOT_FOUND", "market not found", nil)
			return
		}
		if !strings.EqualFold(epochStatus, "open") {
			writeAPIError(w, http.StatusConflict, "MARKET_LOCKED", "market is not open for trading", nil)
			return
		}
		if lockAt != nil && time.Now().UTC().Add(safetyBuffer).After(lockAt.UTC()) {
			writeAPIError(w, http.StatusConflict, "MARKET_LOCKED", "market is not open for trading", nil)
			return
		}

		var available int64
		if err := tx.QueryRow(r.Context(), `
SELECT COALESCE(usdc_available, 0)::bigint
FROM user_balances
WHERE LOWER(user_address) = LOWER($1)
FOR UPDATE
`, userAddress).Scan(&available); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not load user balance", nil)
			return
		}
		if available < amount {
			writeAPIError(w, http.StatusConflict, "INSUFFICIENT_BALANCE", "insufficient balance", nil)
			return
		}
		idem := fmt.Sprintf("market-entry:%s:%s:%d:%d", userAddress, marketID, body.OutcomeID, amount)
		tag, err := tx.Exec(r.Context(), `
INSERT INTO balance_ledger (
    user_address, delta_available, delta_locked, reason, reference_type, reference_id, idempotency_key
) VALUES ($1, $2::numeric, 0, 'MARKET_ENTRY_DEBIT', 'market', $3, $4)
ON CONFLICT (idempotency_key) DO NOTHING
`, userAddress, strconv.FormatInt(-amount, 10), marketID, idem)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not write balance ledger", nil)
			return
		}
		if tag.RowsAffected() == 0 {
			writeJSON(w, http.StatusOK, map[string]any{"status": "already_processed"})
			return
		}
		_, err = tx.Exec(r.Context(), `
UPDATE user_balances
SET usdc_available = usdc_available - $2::numeric, updated_at = NOW()
WHERE LOWER(user_address) = LOWER($1)
`, userAddress, amount)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not update user balance", nil)
			return
		}
		_, err = tx.Exec(r.Context(), `
INSERT INTO market_entries (user_address, market_id, outcome_id, amount, funding_intent_id, status)
VALUES (LOWER($1), $2, $3, $4::numeric, NULLIF($5,'')::uuid, 'CONFIRMED')
`, userAddress, marketID, body.OutcomeID, body.Amount, strings.TrimSpace(body.IntentID))
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not create market entry", nil)
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			writeAPIError(w, http.StatusInternalServerError, "DB", "could not commit market entry", nil)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "CONFIRMED", "marketId": marketID})
	}
}

func resolveActiveEpochForMarket(ctx context.Context, tx pgx.Tx, marketID string) ([]byte, int64, error) {
	marketID = strings.TrimSpace(marketID)
	if marketID == "" {
		return nil, 0, pgx.ErrNoRows
	}
	if strings.HasPrefix(strings.ToLower(marketID), "0x") {
		raw := strings.TrimPrefix(strings.ToLower(marketID), "0x")
		b, err := hex.DecodeString(raw)
		if err != nil || len(b) != 32 {
			return nil, 0, pgx.ErrNoRows
		}
		var epochID int64
		err = tx.QueryRow(ctx, `
SELECT active_epoch_id
FROM ledgers
WHERE template_id = $1
`, b).Scan(&epochID)
		return b, epochID, err
	}
	var templateID []byte
	var epochID int64
	err := tx.QueryRow(ctx, `
SELECT t.template_id, l.active_epoch_id
FROM templates t
JOIN ledgers l ON l.template_id = t.template_id
WHERE t.slug = $1
`, marketID).Scan(&templateID, &epochID)
	return templateID, epochID, err
}

func setIntentStatus(ctx context.Context, pool *pgxpool.Pool, intentID uuid.UUID, status, failureCode, failureMessage string) error {
	_, err := pool.Exec(ctx, `
UPDATE funding_intents
SET status = $2, failure_code = NULLIF($3,''), failure_message = NULLIF($4,''), updated_at = NOW()
WHERE id = $1
`, intentID, status, failureCode, failureMessage)
	return err
}

func normalizedMode(mode string) string {
	v := strings.ToUpper(strings.TrimSpace(mode))
	if v == "" {
		return "AUTO_BEST_SOURCE"
	}
	return v
}

func usdcBaseUnits(raw string) (int64, bool) {
	v := strings.TrimSpace(raw)
	if v == "" {
		return 0, false
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil || f <= 0 {
		return 0, false
	}
	base := math.Round(f * 1_000_000.0)
	if base <= 0 || base > math.MaxInt64 {
		return 0, false
	}
	return int64(base), true
}

func routeVersionHex(payload []byte) string {
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:])
}
