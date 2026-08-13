package positions

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/markets"
)

// PostgresStore persists venue-derived position projections. It is safe to
// rebuild repeatedly: upstream identity and the user/account/token tuple are
// both idempotency boundaries.
type PostgresStore struct{ pool *pgxpool.Pool }

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore { return &PostgresStore{pool: pool} }

func (s *PostgresStore) ApplyVenueRebuild(ctx context.Context, userID, accountWallet string, rows []VenuePosition, observedAt time.Time) (int, error) {
	if s == nil || s.pool == nil || strings.TrimSpace(userID) == "" || strings.TrimSpace(accountWallet) == "" {
		return 0, fmt.Errorf("position projection store: invalid rebuild input")
	}
	if observedAt.IsZero() {
		observedAt = time.Now().UTC()
	} else {
		observedAt = observedAt.UTC()
	}
	wallet := strings.ToLower(strings.TrimSpace(accountWallet))
	for _, row := range rows {
		if strings.TrimSpace(row.TokenID) == "" {
			continue
		}
		if _, err := markets.ParseDecimalString(row.Size); err != nil {
			return 0, fmt.Errorf("position projection size: %w", err)
		}
		if row.AvgPrice != "" {
			if _, err := markets.ParseDecimalString(row.AvgPrice); err != nil {
				return 0, fmt.Errorf("position projection average price: %w", err)
			}
		}
		if err := validateEconomics(row); err != nil {
			return 0, err
		}
	}
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, fmt.Errorf("begin position rebuild: %w", err)
	}
	defer tx.Rollback(ctx)

	seen := make([]string, 0, len(rows))
	written := 0
	for _, row := range rows {
		tokenID := strings.TrimSpace(row.TokenID)
		if tokenID == "" {
			continue
		}
		upstreamID := strings.TrimSpace(row.UpstreamID)
		if upstreamID == "" {
			upstreamID = userID + ":" + wallet + ":" + tokenID
		}
		id := uuid.New()
		result, err := tx.Exec(ctx, `
INSERT INTO markets_position_projections (
	    id, user_id, account_wallet, market_id, token_id, condition_id, size,
	    avg_entry_price, mark_price, cost_basis_amount, unrealized_pnl, realized_pnl,
	    mark_price_observed, cost_basis_observed, unrealized_pnl_observed, realized_pnl_observed,
	    resolution_status, redeemable, redeemable_observed, claimable_amount, claimable_amount_observed, freshness_state,
	    freshness_reason, upstream_source, upstream_id, observed_at, version, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, ''), NULLIF($9, ''), NULLIF($10, '')::bigint, NULLIF($11, ''), NULLIF($12, ''),
    $17, $18, $19, $20, 'active', $13, $21, NULLIF($14, ''), $22, 'fresh', '', 'polymarket_data_api', $15, $16, 1, $16, $16)
ON CONFLICT (user_id, account_wallet, token_id) DO UPDATE SET
    market_id = EXCLUDED.market_id,
    condition_id = EXCLUDED.condition_id,
    size = EXCLUDED.size,
    avg_entry_price = EXCLUDED.avg_entry_price,
    mark_price = CASE WHEN $17 THEN EXCLUDED.mark_price ELSE markets_position_projections.mark_price END,
    mark_price_observed = $17,
    cost_basis_amount = CASE WHEN $18 THEN EXCLUDED.cost_basis_amount ELSE markets_position_projections.cost_basis_amount END,
    cost_basis_observed = $18,
    unrealized_pnl = CASE WHEN $19 THEN EXCLUDED.unrealized_pnl ELSE markets_position_projections.unrealized_pnl END,
    unrealized_pnl_observed = $19,
    realized_pnl = CASE WHEN $20 THEN EXCLUDED.realized_pnl ELSE markets_position_projections.realized_pnl END,
    realized_pnl_observed = $20,
    resolution_status = 'active',
    redeemable = CASE WHEN $21 THEN EXCLUDED.redeemable ELSE markets_position_projections.redeemable END,
    redeemable_observed = $21,
    claimable_amount = CASE WHEN $22 THEN EXCLUDED.claimable_amount ELSE markets_position_projections.claimable_amount END,
    claimable_amount_observed = $22,
    freshness_state = 'fresh',
    freshness_reason = '',
    upstream_source = EXCLUDED.upstream_source,
    upstream_id = EXCLUDED.upstream_id,
    observed_at = EXCLUDED.observed_at,
    version = markets_position_projections.version + 1,
    updated_at = EXCLUDED.updated_at
WHERE markets_position_projections.observed_at < EXCLUDED.observed_at
`, id, userID, wallet, row.MarketID, tokenID, row.ConditionID, row.Size, row.AvgPrice, row.MarkPrice, row.CostBasisAmount, row.UnrealizedPnL, row.RealizedPnL, row.Redeemable, row.ClaimableAmount, upstreamID, observedAt, row.MarkPriceAvailable, row.CostBasisAvailable, row.UnrealizedPnLAvailable, row.RealizedPnLAvailable, row.RedeemableAvailable, row.ClaimableAmountAvailable)
		if err != nil {
			return 0, fmt.Errorf("upsert position projection: %w", err)
		}
		seen = append(seen, tokenID)
		written += int(result.RowsAffected())
	}
	// Never delete a missing snapshot row: incomplete venue data is explicitly
	// represented as reconciling instead of inventing a zero balance. observed_at
	// is also the durable tombstone boundary: advancing it here prevents an older
	// present snapshot from resurrecting a position after a newer missing one.
	missingResult, err := tx.Exec(ctx, `
UPDATE markets_position_projections
SET freshness_state = 'reconciling',
    freshness_reason = 'missing_from_venue_snapshot',
    mark_price_observed = FALSE,
    cost_basis_observed = FALSE,
    unrealized_pnl_observed = FALSE,
    realized_pnl_observed = FALSE,
    redeemable_observed = FALSE,
    claimable_amount_observed = FALSE,
    observed_at = $4,
    version = markets_position_projections.version + 1,
    updated_at = $4
WHERE user_id = $1 AND account_wallet = $2
  AND NOT (token_id = ANY($3::text[]))
  AND observed_at < $4
`, userID, wallet, seen, observedAt)
	if err != nil {
		return 0, fmt.Errorf("mark missing position projections: %w", err)
	}
	written += int(missingResult.RowsAffected())
	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit position rebuild: %w", err)
	}
	return written, nil
}

func (s *PostgresStore) List(ctx context.Context, userID string) ([]PositionRecord, error) {
	if s == nil || s.pool == nil || strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("position projection store: invalid list input")
	}
	rows, err := s.pool.Query(ctx, `
SELECT id::text, user_id, account_wallet, token_id, market_id, condition_id,
	   COALESCE(size, ''), COALESCE(avg_entry_price, ''),
	   COALESCE(mark_price, ''), mark_price_observed,
	   COALESCE(cost_basis_amount::text, ''), cost_basis_observed,
	   COALESCE(unrealized_pnl, ''), unrealized_pnl_observed,
	   COALESCE(realized_pnl, ''), realized_pnl_observed,
	   redeemable, redeemable_observed,
	   COALESCE(claimable_amount, ''), claimable_amount_observed,
	   freshness_state,
	   upstream_source, upstream_id, observed_at, updated_at
FROM markets_position_projections
WHERE user_id = $1
ORDER BY updated_at DESC, id DESC
`, userID)
	if err != nil {
		return nil, fmt.Errorf("list position projections: %w", err)
	}
	defer rows.Close()
	out := make([]PositionRecord, 0)
	for rows.Next() {
		var rec PositionRecord
		var freshness string
		if err := rows.Scan(&rec.PositionID, &rec.UserID, &rec.AccountWallet, &rec.TokenID, &rec.MarketID, &rec.ConditionID,
			&rec.Size, &rec.AvgPrice,
			&rec.MarkPrice, &rec.MarkPriceObserved,
			&rec.CostBasisAmount, &rec.CostBasisObserved,
			&rec.UnrealizedPnL, &rec.UnrealizedPnLObserved,
			&rec.RealizedPnL, &rec.RealizedPnLObserved,
			&rec.Redeemable, &rec.RedeemableObserved,
			&rec.ClaimableAmount, &rec.ClaimableAmountObserved,
			&freshness, &rec.UpstreamSource, &rec.UpstreamID, &rec.ObservedAt, &rec.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan position projection: %w", err)
		}
		switch freshness {
		case "fresh":
			rec.SyncStatus = SyncStatusSynced
		case "reconciling", "drift_detected":
			rec.SyncStatus = SyncStatusReconciling
		default:
			rec.SyncStatus = SyncStatusUpdating
		}
		out = append(out, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate position projections: %w", err)
	}
	return out, nil
}

// ListUserAccounts returns all linked durable reconciliation subjects,
// including accounts without an existing open-position projection.
func (s *PostgresStore) ListUserAccounts(ctx context.Context) ([]PositionRecord, error) {
	if s == nil || s.pool == nil {
		return nil, fmt.Errorf("position projection store: unavailable")
	}
	rows, err := s.pool.Query(ctx, `
SELECT user_id, account_wallet
FROM markets_wallet_accounts
WHERE link_status = 'linked'
UNION
SELECT user_id, account_wallet
FROM markets_position_projections
ORDER BY user_id, account_wallet
`)
	if err != nil {
		return nil, fmt.Errorf("list position projection accounts: %w", err)
	}
	defer rows.Close()
	out := make([]PositionRecord, 0)
	for rows.Next() {
		var rec PositionRecord
		if err := rows.Scan(&rec.UserID, &rec.AccountWallet); err != nil {
			return nil, fmt.Errorf("scan position projection account: %w", err)
		}
		out = append(out, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate position projection accounts: %w", err)
	}
	return out, nil
}

func (s *PostgresStore) Healthy(ctx context.Context) bool {
	return s != nil && s.pool != nil && s.pool.Ping(ctx) == nil
}
