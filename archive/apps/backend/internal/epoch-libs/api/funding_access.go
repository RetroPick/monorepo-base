package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func requireFundingIntentAccess(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, intentID uuid.UUID) (string, bool) {
	var wallet string
	err := pool.QueryRow(r.Context(), `SELECT user_address FROM funding_intents WHERE id = $1`, intentID).Scan(&wallet)
	if errors.Is(err, pgx.ErrNoRows) {
		writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "funding intent not found", nil)
		return "", false
	}
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "DB", "could not load funding intent owner", nil)
		return "", false
	}
	if !WalletAuthorized(r, wallet, authSecretFromContext(r)) {
		writeAPIError(w, http.StatusUnauthorized, "UNAUTHORIZED", "wallet authorization required", nil)
		return "", false
	}
	return strings.ToLower(wallet), true
}

func requireFundingExecutionAccess(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, executionID uuid.UUID) (string, uuid.UUID, bool) {
	var wallet string
	var intentID uuid.UUID
	err := pool.QueryRow(r.Context(), `
SELECT fi.user_address, fi.id
FROM funding_executions fe
JOIN funding_intents fi ON fi.id = fe.funding_intent_id
WHERE fe.id = $1
`, executionID).Scan(&wallet, &intentID)
	if errors.Is(err, pgx.ErrNoRows) {
		writeAPIError(w, http.StatusNotFound, "NOT_FOUND", "funding execution not found", nil)
		return "", uuid.Nil, false
	}
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "DB", "could not load funding execution owner", nil)
		return "", uuid.Nil, false
	}
	if !WalletAuthorized(r, wallet, authSecretFromContext(r)) {
		writeAPIError(w, http.StatusUnauthorized, "UNAUTHORIZED", "wallet authorization required", nil)
		return "", uuid.Nil, false
	}
	return strings.ToLower(wallet), intentID, true
}
