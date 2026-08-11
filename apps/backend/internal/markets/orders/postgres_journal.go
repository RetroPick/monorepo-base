package orders

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrJournalInvalidInput        = errors.New("invalid order mutation journal input")
	ErrJournalIdempotencyConflict = errors.New("order mutation idempotency conflict")
)

const (
	MutationStateNotSubmitted       = "not_submitted"
	MutationStateIntentPersisted    = "submit_pending"
	MutationStateSubmitting         = "submitting"
	MutationStateUnknownReconciling = "unknown_reconciling"
	MutationStateAccepted           = "accepted"
	MutationStateRejected           = "rejected"
)

// MutationJournal is the durable correctness boundary for order submission.
type MutationJournal interface {
	ClaimSubmit(ctx context.Context, claim SubmitMutationClaim) (MutationClaim, error)
	MarkSubmitAccepted(ctx context.Context, result SubmitMutationResult) error
	MarkSubmitUnknown(ctx context.Context, result SubmitMutationResult) error
	MarkSubmitRejected(ctx context.Context, result SubmitMutationResult) error
}

// SubmitRecoveryJournal exposes durable unresolved submit state to startup reconciliation.
type SubmitRecoveryJournal interface {
	ListSubmitReconciliationCandidates(ctx context.Context, limit int) ([]UserOrderRecord, error)
	ClaimSubmitReconciliationCandidates(ctx context.Context, limit int, lease time.Duration) ([]UserOrderRecord, error)
	MarkSubmitReconciled(ctx context.Context, orderID, attemptID, venueOrderID, canonicalStatus string, observedAt time.Time) error
	MarkSubmitReconciledOpen(ctx context.Context, orderID, attemptID, venueOrderID string, observedAt time.Time) error
	MarkSubmitNotSubmitted(ctx context.Context, orderID string, observedAt time.Time) error
	MarkSubmitStillReconciling(ctx context.Context, orderID, attemptID, errorCode string, evidence map[string]string, observedAt time.Time) error
}

type OrderMutationIntent struct {
	PreviewID         uuid.UUID
	ContentHash       string
	SignedPayloadHash string
	MarketID          string
	TokenID           string
	Side              string
	Price             string
	Size              string
	MakerAmount       string
	TakerAmount       string
	ExchangeDomain    string
	MakerAddress      string
	SignerAddress     string
	UnsignedPayload   UnsignedOrderPayload
	Metadata          hashMetadata
	ExpiresAt         time.Time
}

type SubmitMutationClaim struct {
	UserID             string
	IdempotencyKey     string
	RequestFingerprint string
	Intent             OrderMutationIntent
}

type MutationClaim struct {
	OrderID            uuid.UUID
	PreviewID          uuid.UUID
	AttemptID          uuid.UUID
	AttemptNumber      int
	State              string
	VenueOrderID       string
	Existing           bool
	ShouldSubmit       bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
	RequestFingerprint string
}

type SubmitMutationResult struct {
	OrderID      uuid.UUID
	AttemptID    uuid.UUID
	State        string
	VenueOrderID string
	HTTPStatus   int
	ErrorCode    string
	Response     any
	ObservedAt   time.Time
}

type PostgresMutationJournal struct{ pool *pgxpool.Pool }

func NewPostgresMutationJournal(pool *pgxpool.Pool) *PostgresMutationJournal {
	return &PostgresMutationJournal{pool: pool}
}

func (c SubmitMutationClaim) Validate() error {
	if strings.TrimSpace(c.UserID) == "" ||
		strings.TrimSpace(c.IdempotencyKey) == "" ||
		!isSHA256Hex(c.RequestFingerprint) {
		return ErrJournalInvalidInput
	}
	if err := c.Intent.Validate(); err != nil {
		return err
	}
	return nil
}

func (i OrderMutationIntent) Validate() error {
	if i.PreviewID == uuid.Nil ||
		!isHashHex(i.ContentHash) ||
		!isHashHex(i.SignedPayloadHash) ||
		(i.Side != SideBuy && i.Side != SideSell) ||
		strings.TrimSpace(i.MarketID) == "" ||
		strings.TrimSpace(i.TokenID) == "" ||
		strings.TrimSpace(i.ExchangeDomain) == "" ||
		strings.TrimSpace(i.MakerAddress) == "" ||
		strings.TrimSpace(i.SignerAddress) == "" ||
		i.ExpiresAt.IsZero() {
		return ErrJournalInvalidInput
	}
	if i.ExchangeDomain != ExchangeDomainStandard && i.ExchangeDomain != ExchangeDomainNegRisk {
		return ErrJournalInvalidInput
	}
	if !isAddress(i.MakerAddress) || !isAddress(i.SignerAddress) {
		return ErrJournalInvalidInput
	}
	for _, raw := range []string{i.Price, i.Size, i.MakerAmount, i.TakerAmount} {
		if err := validateDecimalString(raw); err != nil {
			return ErrJournalInvalidInput
		}
	}
	return nil
}

func (j *PostgresMutationJournal) ClaimSubmit(ctx context.Context, claim SubmitMutationClaim) (MutationClaim, error) {
	if j == nil || j.pool == nil {
		return MutationClaim{}, ErrJournalInvalidInput
	}
	if err := claim.Validate(); err != nil {
		return MutationClaim{}, err
	}

	tx, err := j.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return MutationClaim{}, fmt.Errorf("begin submit journal tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := insertPreviewSnapshot(ctx, tx, claim); err != nil {
		return MutationClaim{}, err
	}

	orderID := uuid.New()
	now := time.Now().UTC()
	hasSemanticColumns, err := hasOrderJournalSemanticColumns(ctx, tx)
	if err != nil {
		return MutationClaim{}, err
	}
	var row pgx.Row
	if hasSemanticColumns {
		row = tx.QueryRow(ctx, `
INSERT INTO markets_user_orders (
    id, user_id, market_id, token_id, side, order_type, time_in_force,
    price, original_size, remaining_size, matched_size, status,
    idempotency_key, preview_id, preview_ref, request_fingerprint,
    maker_amount, taker_amount, salt,
    content_hash, signed_payload_hash, maker_address, signer_address,
    upstream_source, chain_id, exchange_domain, payload_json,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, 'LIMIT', 'GTC',
    $6, $7, $7, '0', $8,
    $9, $10, $11, $12,
    $13, $14, $15,
    $16, $17, $18, $19,
    'clob', 137, $20, $21,
    $22, $22
)
ON CONFLICT (user_id, idempotency_key) DO NOTHING
RETURNING id, created_at, updated_at
`, orderID, claim.UserID, claim.Intent.MarketID, claim.Intent.TokenID, claim.Intent.Side,
			claim.Intent.Price, claim.Intent.Size, MutationStateIntentPersisted, claim.IdempotencyKey,
			claim.Intent.PreviewID, claim.Intent.PreviewID.String(), claim.RequestFingerprint,
			claim.Intent.MakerAmount, claim.Intent.TakerAmount, claim.Intent.UnsignedPayload.Salt,
			claim.Intent.ContentHash, claim.Intent.SignedPayloadHash, strings.ToLower(claim.Intent.MakerAddress),
			strings.ToLower(claim.Intent.SignerAddress), claim.Intent.ExchangeDomain, mustJSON(orderPayloadSnapshot(claim)), now)
	} else {
		row = tx.QueryRow(ctx, `
INSERT INTO markets_user_orders (
    id, user_id, market_id, token_id, side, order_type, time_in_force,
    price, original_size, remaining_size, matched_size, status,
    idempotency_key, preview_id, preview_ref, request_fingerprint,
    content_hash, signed_payload_hash, maker_address, signer_address,
    upstream_source, chain_id, exchange_domain, payload_json,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, 'LIMIT', 'GTC',
    $6, $7, $7, '0', $8,
    $9, $10, $11, $12,
    $13, $14, $15, $16,
    'clob', 137, $17, $18,
    $19, $19
)
ON CONFLICT (user_id, idempotency_key) DO NOTHING
RETURNING id, created_at, updated_at
`, orderID, claim.UserID, claim.Intent.MarketID, claim.Intent.TokenID, claim.Intent.Side,
			claim.Intent.Price, claim.Intent.Size, MutationStateIntentPersisted, claim.IdempotencyKey,
			claim.Intent.PreviewID, claim.Intent.PreviewID.String(), claim.RequestFingerprint,
			claim.Intent.ContentHash, claim.Intent.SignedPayloadHash, strings.ToLower(claim.Intent.MakerAddress),
			strings.ToLower(claim.Intent.SignerAddress), claim.Intent.ExchangeDomain, mustJSON(orderPayloadSnapshot(claim)), now)
	}

	var insertedOrder uuid.UUID
	var createdAt, updatedAt time.Time
	if err := row.Scan(&insertedOrder, &createdAt, &updatedAt); err == nil {
		attemptID := uuid.New()
		if _, err := tx.Exec(ctx, `
INSERT INTO markets_order_attempts (
    id, user_id, order_id, preview_id, idempotency_key, attempt_status,
    request_fingerprint, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
`, attemptID, claim.UserID, insertedOrder, claim.Intent.PreviewID, claim.IdempotencyKey,
			MutationStateSubmitting, claim.RequestFingerprint, now); err != nil {
			return MutationClaim{}, fmt.Errorf("insert submit attempt: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return MutationClaim{}, fmt.Errorf("commit submit journal claim: %w", err)
		}
		return MutationClaim{
			OrderID:            insertedOrder,
			PreviewID:          claim.Intent.PreviewID,
			AttemptID:          attemptID,
			AttemptNumber:      1,
			State:              MutationStateSubmitting,
			ShouldSubmit:       true,
			CreatedAt:          createdAt,
			UpdatedAt:          updatedAt,
			RequestFingerprint: claim.RequestFingerprint,
		}, nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return MutationClaim{}, fmt.Errorf("insert submit intent: %w", err)
	}

	existing, err := loadExistingClaim(ctx, tx, claim.UserID, claim.IdempotencyKey)
	if err != nil {
		return MutationClaim{}, err
	}
	if existing.RequestFingerprint != claim.RequestFingerprint {
		return MutationClaim{}, ErrJournalIdempotencyConflict
	}
	if err := tx.Commit(ctx); err != nil {
		return MutationClaim{}, fmt.Errorf("commit submit journal replay: %w", err)
	}
	existing.Existing = true
	return existing, nil
}

func (j *PostgresMutationJournal) MarkSubmitAccepted(ctx context.Context, result SubmitMutationResult) error {
	return j.mark(ctx, result, orderStatusOpen, MutationStateAccepted)
}

func (j *PostgresMutationJournal) MarkSubmitUnknown(ctx context.Context, result SubmitMutationResult) error {
	return j.mark(ctx, result, orderStatusUnknown, MutationStateUnknownReconciling)
}

func (j *PostgresMutationJournal) MarkSubmitRejected(ctx context.Context, result SubmitMutationResult) error {
	return j.mark(ctx, result, OrderStatusRejected, MutationStateRejected)
}

func (j *PostgresMutationJournal) ListSubmitReconciliationCandidates(ctx context.Context, limit int) ([]UserOrderRecord, error) {
	return j.ClaimSubmitReconciliationCandidates(ctx, limit, 30*time.Second)
}

func (j *PostgresMutationJournal) ClaimSubmitReconciliationCandidates(ctx context.Context, limit int, lease time.Duration) ([]UserOrderRecord, error) {
	if j == nil || j.pool == nil {
		return nil, ErrJournalInvalidInput
	}
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	if lease <= 0 {
		lease = 30 * time.Second
	}
	leaseBefore := time.Now().UTC().Add(-lease)
	tx, err := j.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin list submit reconciliation candidates: %w", err)
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
WITH latest_attempt AS (
    SELECT DISTINCT ON (order_id)
        id, order_id, attempt_status
    FROM markets_order_attempts
    ORDER BY order_id, created_at DESC
),
eligible AS (
    SELECT o.id
    FROM markets_user_orders o
    LEFT JOIN latest_attempt a ON a.order_id = o.id
    WHERE (
        o.status IN ('submit_pending', 'submitting', 'unknown', 'unknown_reconciling')
        OR a.attempt_status IN ('submitting', 'unknown', 'unknown_reconciling')
    )
      AND (
        o.journal_locked_at IS NULL
        OR o.journal_locked_at < $2
      )
    ORDER BY o.updated_at ASC, o.id ASC
    LIMIT $1
    FOR UPDATE OF o SKIP LOCKED
),
claimed AS (
    UPDATE markets_user_orders o
    SET journal_locked_at = NOW()
    FROM eligible
    WHERE o.id = eligible.id
    RETURNING o.*
),
claimed_attempt AS (
    SELECT DISTINCT ON (a.order_id)
        a.id, a.order_id, a.attempt_status
    FROM markets_order_attempts a
    JOIN claimed c ON c.id = a.order_id
    ORDER BY a.order_id, a.created_at DESC
)
SELECT
    c.id::text,
    COALESCE(a.id::text, ''),
    c.user_id,
    COALESCE(c.upstream_id, ''),
    COALESCE(c.client_order_id, ''),
    COALESCE(c.content_hash, ''),
    COALESCE(c.request_fingerprint, ''),
    c.market_id,
    c.token_id,
    c.side,
    c.price,
    c.original_size,
    c.matched_size,
    c.remaining_size,
    c.status,
    COALESCE(c.rejection_reason, ''),
    c.exchange_domain,
    c.maker_address,
    COALESCE(c.maker_amount, c.payload_json #>> '{unsignedPayload,makerAmount}', ''),
    COALESCE(c.taker_amount, c.payload_json #>> '{unsignedPayload,takerAmount}', ''),
    COALESCE(c.salt, c.payload_json #>> '{unsignedPayload,salt}', ''),
    c.created_at,
    c.updated_at
FROM claimed c
LEFT JOIN claimed_attempt a ON a.order_id = c.id
ORDER BY c.updated_at ASC, c.id ASC
	`, limit, leaseBefore)
	if err != nil {
		return nil, fmt.Errorf("list submit reconciliation candidates: %w", err)
	}
	defer rows.Close()

	out := make([]UserOrderRecord, 0)
	for rows.Next() {
		var rec UserOrderRecord
		if err := rows.Scan(
			&rec.OrderID,
			&rec.AttemptID,
			&rec.UserID,
			&rec.VenueOrderID,
			&rec.ClientOrderID,
			&rec.ContentHash,
			&rec.RequestFingerprint,
			&rec.MarketID,
			&rec.TokenID,
			&rec.Side,
			&rec.Price,
			&rec.OriginalSize,
			&rec.FilledSize,
			&rec.RemainingSize,
			&rec.Status,
			&rec.RejectionReason,
			&rec.ExchangeDomain,
			&rec.Maker,
			&rec.MakerAmount,
			&rec.TakerAmount,
			&rec.Salt,
			&rec.CreatedAt,
			&rec.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan submit reconciliation candidate: %w", err)
		}
		out = append(out, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate submit reconciliation candidates: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit list submit reconciliation candidates: %w", err)
	}
	return out, nil
}

func (j *PostgresMutationJournal) MarkSubmitReconciledOpen(ctx context.Context, orderID, attemptID, venueOrderID string, observedAt time.Time) error {
	return j.MarkSubmitReconciled(ctx, orderID, attemptID, venueOrderID, OrderStatusOpen, observedAt)
}

func (j *PostgresMutationJournal) MarkSubmitReconciled(ctx context.Context, orderID, attemptID, venueOrderID, canonicalStatus string, observedAt time.Time) error {
	switch canonicalStatus {
	case OrderStatusOpen, OrderStatusPartiallyFilled, OrderStatusFilled:
	default:
		return ErrJournalInvalidInput
	}
	if observedAt.IsZero() {
		observedAt = time.Now().UTC()
	} else {
		observedAt = observedAt.UTC()
	}
	orderUUID, err := uuid.Parse(strings.TrimSpace(orderID))
	if err != nil {
		return ErrJournalInvalidInput
	}
	attemptUUID := uuid.Nil
	if strings.TrimSpace(attemptID) != "" {
		attemptUUID, err = uuid.Parse(strings.TrimSpace(attemptID))
		if err != nil {
			return ErrJournalInvalidInput
		}
	}
	evidence := map[string]any{
		"source":       "polymarket_clob_open_orders",
		"observedAt":   observedAt.Format(time.RFC3339Nano),
		"venueOrderId": venueOrderID,
		"venueStatus":  canonicalStatus,
		"retryable":    false,
		"terminal":     true,
	}
	return j.markByOrderWithResponse(ctx, orderUUID, attemptUUID, venueOrderID, canonicalStatus, MutationStateAccepted, "", evidence, observedAt)
}

func (j *PostgresMutationJournal) MarkSubmitNotSubmitted(ctx context.Context, orderID string, observedAt time.Time) error {
	orderUUID, err := uuid.Parse(strings.TrimSpace(orderID))
	if err != nil {
		return ErrJournalInvalidInput
	}
	return j.markByOrder(ctx, orderUUID, uuid.Nil, "", OrderStatusNotSubmitted, MutationStateNotSubmitted, "", observedAt)
}

func (j *PostgresMutationJournal) MarkSubmitStillReconciling(ctx context.Context, orderID, attemptID, errorCode string, evidence map[string]string, observedAt time.Time) error {
	orderUUID, err := uuid.Parse(strings.TrimSpace(orderID))
	if err != nil {
		return ErrJournalInvalidInput
	}
	attemptUUID := uuid.Nil
	if strings.TrimSpace(attemptID) != "" {
		attemptUUID, err = uuid.Parse(strings.TrimSpace(attemptID))
		if err != nil {
			return ErrJournalInvalidInput
		}
	}
	response := map[string]any{
		"status":   "unknown_reconciling",
		"evidence": evidence,
	}
	return j.markByOrderWithResponse(ctx, orderUUID, attemptUUID, "", orderStatusUnknown, MutationStateUnknownReconciling, errorCode, response, observedAt)
}

func (j *PostgresMutationJournal) mark(ctx context.Context, result SubmitMutationResult, orderStatus, attemptStatus string) error {
	if j == nil || j.pool == nil || result.OrderID == uuid.Nil || result.AttemptID == uuid.Nil {
		return ErrJournalInvalidInput
	}
	observedAt := result.ObservedAt.UTC()
	if observedAt.IsZero() {
		observedAt = time.Now().UTC()
	}
	response := mustJSON(result.Response)
	tx, err := j.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin submit journal mark tx: %w", err)
	}
	defer tx.Rollback(ctx)
	orderTag, err := tx.Exec(ctx, `
UPDATE markets_user_orders
SET status = $2,
    upstream_id = COALESCE(NULLIF($3, ''), upstream_id),
    observed_at = $4,
    rejection_reason = NULLIF($5, ''),
    journal_locked_at = NULL,
    updated_at = $4
WHERE id = $1
`, result.OrderID, orderStatus, result.VenueOrderID, observedAt, result.ErrorCode)
	if err != nil {
		return fmt.Errorf("mark submit order: %w", err)
	}
	if orderTag.RowsAffected() != 1 {
		return fmt.Errorf("mark submit order: %w", ErrJournalInvalidInput)
	}
	attemptTag, err := tx.Exec(ctx, `
UPDATE markets_order_attempts
SET attempt_status = $2,
    http_status = $3,
    error_code = NULLIF($4, ''),
    response_json = COALESCE($5, response_json),
    updated_at = $6
WHERE id = $1
`, result.AttemptID, attemptStatus, result.HTTPStatus, result.ErrorCode, response, observedAt)
	if err != nil {
		return fmt.Errorf("mark submit attempt: %w", err)
	}
	if attemptTag.RowsAffected() != 1 {
		return fmt.Errorf("mark submit attempt: %w", ErrJournalInvalidInput)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit submit journal mark: %w", err)
	}
	return nil
}

func (j *PostgresMutationJournal) markByOrder(ctx context.Context, orderID, attemptID uuid.UUID, venueOrderID, orderStatus, attemptStatus, errorCode string, observedAt time.Time) error {
	return j.markByOrderWithResponse(ctx, orderID, attemptID, venueOrderID, orderStatus, attemptStatus, errorCode, nil, observedAt)
}

func (j *PostgresMutationJournal) markByOrderWithResponse(ctx context.Context, orderID, attemptID uuid.UUID, venueOrderID, orderStatus, attemptStatus, errorCode string, response any, observedAt time.Time) error {
	if j == nil || j.pool == nil || orderID == uuid.Nil {
		return ErrJournalInvalidInput
	}
	if observedAt.IsZero() {
		observedAt = time.Now().UTC()
	} else {
		observedAt = observedAt.UTC()
	}
	tx, err := j.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin submit journal mark-by-order tx: %w", err)
	}
	defer tx.Rollback(ctx)

	orderTag, err := tx.Exec(ctx, `
UPDATE markets_user_orders
SET status = $2,
    upstream_id = COALESCE(NULLIF($3, ''), upstream_id),
    observed_at = $4,
    rejection_reason = NULLIF($5, ''),
    journal_locked_at = CASE WHEN $2 = 'unknown' THEN $4::timestamptz ELSE NULL END,
    updated_at = $4
WHERE id = $1
`, orderID, orderStatus, venueOrderID, observedAt, errorCode)
	if err != nil {
		return fmt.Errorf("mark submit order by order: %w", err)
	}
	if orderTag.RowsAffected() != 1 {
		return fmt.Errorf("mark submit order by order: %w", ErrJournalInvalidInput)
	}
	if attemptID != uuid.Nil {
		attemptTag, err := tx.Exec(ctx, `
UPDATE markets_order_attempts
SET attempt_status = $2,
    error_code = NULLIF($3, ''),
    response_json = COALESCE($4, response_json),
    updated_at = $5
WHERE id = $1
`, attemptID, attemptStatus, errorCode, mustJSON(response), observedAt)
		if err != nil {
			return fmt.Errorf("mark submit attempt by order: %w", err)
		}
		if attemptTag.RowsAffected() != 1 {
			return fmt.Errorf("mark submit attempt by order: %w", ErrJournalInvalidInput)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit submit journal mark-by-order: %w", err)
	}
	return nil
}

func insertPreviewSnapshot(ctx context.Context, tx pgx.Tx, claim SubmitMutationClaim) error {
	unsigned := mustJSON(claim.Intent.UnsignedPayload)
	human := mustJSON(map[string]any{
		"marketId": claim.Intent.MarketID,
		"tokenId":  claim.Intent.TokenID,
		"side":     claim.Intent.Side,
		"price":    claim.Intent.Price,
		"size":     claim.Intent.Size,
		"chainId":  polygonChainID,
	})
	_, err := tx.Exec(ctx, `
INSERT INTO markets_order_previews (
    id, user_id, market_id, token_id, side, price, size,
    order_type, time_in_force, maker_address, signer_address,
    exchange_domain, content_hash, expires_at, idempotency_key,
    unsigned_payload_json, human_summary_json, created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    'LIMIT', 'GTC', $8, $9,
    $10, $11, $12, NULL,
    $13, $14, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING
`, claim.Intent.PreviewID, claim.UserID, claim.Intent.MarketID, claim.Intent.TokenID,
		claim.Intent.Side, claim.Intent.Price, claim.Intent.Size, strings.ToLower(claim.Intent.MakerAddress),
		strings.ToLower(claim.Intent.SignerAddress), claim.Intent.ExchangeDomain, claim.Intent.ContentHash,
		claim.Intent.ExpiresAt.UTC(), unsigned, human)
	if err != nil {
		return fmt.Errorf("insert preview snapshot: %w", err)
	}
	return nil
}

func hasOrderJournalSemanticColumns(ctx context.Context, tx pgx.Tx) (bool, error) {
	var count int
	if err := tx.QueryRow(ctx, `
SELECT count(*)
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'markets_user_orders'
  AND column_name IN ('maker_amount', 'taker_amount', 'salt')
`).Scan(&count); err != nil {
		return false, fmt.Errorf("inspect submit journal columns: %w", err)
	}
	return count == 3, nil
}

func loadExistingClaim(ctx context.Context, tx pgx.Tx, userID, idempotencyKey string) (MutationClaim, error) {
	var claim MutationClaim
	err := tx.QueryRow(ctx, `
SELECT o.id, o.preview_id, o.status, COALESCE(o.upstream_id, ''),
       o.created_at, o.updated_at, o.request_fingerprint,
       COALESCE(a.id, '00000000-0000-0000-0000-000000000000'::uuid),
       CASE WHEN a.id IS NULL THEN 0 ELSE 1 END
FROM markets_user_orders o
LEFT JOIN LATERAL (
    SELECT id
    FROM markets_order_attempts
    WHERE order_id = o.id
    ORDER BY created_at ASC
    LIMIT 1
) a ON TRUE
WHERE o.user_id = $1 AND o.idempotency_key = $2
FOR UPDATE OF o
`, userID, idempotencyKey).Scan(&claim.OrderID, &claim.PreviewID, &claim.State, &claim.VenueOrderID,
		&claim.CreatedAt, &claim.UpdatedAt, &claim.RequestFingerprint, &claim.AttemptID, &claim.AttemptNumber)
	if err != nil {
		return MutationClaim{}, fmt.Errorf("load existing submit claim: %w", err)
	}
	return claim, nil
}

func orderPayloadSnapshot(claim SubmitMutationClaim) map[string]any {
	return map[string]any{
		"previewId":          claim.Intent.PreviewID.String(),
		"contentHash":        claim.Intent.ContentHash,
		"signedPayloadHash":  claim.Intent.SignedPayloadHash,
		"requestFingerprint": claim.RequestFingerprint,
		"unsignedPayload":    claim.Intent.UnsignedPayload,
		"metadata":           claim.Intent.Metadata,
	}
}

func mustJSON(v any) []byte {
	if v == nil {
		return nil
	}
	raw, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	return raw
}

func isHashHex(raw string) bool {
	raw = strings.TrimSpace(raw)
	if !strings.HasPrefix(raw, "0x") || len(raw) != 66 {
		return false
	}
	return isSHA256Hex(strings.TrimPrefix(raw, "0x"))
}

func isSHA256Hex(raw string) bool {
	raw = strings.TrimSpace(raw)
	if len(raw) != sha256.Size*2 {
		return false
	}
	for _, r := range raw {
		if (r < '0' || r > '9') && (r < 'a' || r > 'f') {
			return false
		}
	}
	return true
}

func isAddress(raw string) bool {
	raw = strings.ToLower(strings.TrimSpace(raw))
	if !strings.HasPrefix(raw, "0x") || len(raw) != 42 {
		return false
	}
	for _, r := range strings.TrimPrefix(raw, "0x") {
		if (r < '0' || r > '9') && (r < 'a' || r > 'f') {
			return false
		}
	}
	return true
}
