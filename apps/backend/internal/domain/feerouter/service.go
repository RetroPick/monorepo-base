package feerouter

import (
	"context"
	"encoding/hex"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Batch is a persisted FeeRouter route operation.
type Batch struct {
	ID              int64     `json:"id"`
	BatchID         string    `json:"batchId"`
	TokenAddress    string    `json:"tokenAddress"`
	GrossAmount     string    `json:"grossAmount"`
	TreasuryAmount  string    `json:"treasuryAmount"`
	RewardsAmount   string    `json:"rewardsAmount"`
	CommunityAmount string    `json:"communityAmount"`
	TxHash          string    `json:"txHash"`
	LogIndex        int32     `json:"logIndex"`
	BlockNumber     int64     `json:"blockNumber"`
	CreatedAt       time.Time `json:"createdAt"`
}

// Service reads fee route batches from Postgres.
type Service struct {
	Pool *pgxpool.Pool
}

// New returns a fee-router ops service.
func New(pool *pgxpool.Pool) *Service {
	return &Service{Pool: pool}
}

// ListBatches returns recent fee route batches.
func (s *Service) ListBatches(ctx context.Context, limit int) ([]Batch, error) {
	if s.Pool == nil {
		return nil, nil
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.Pool.Query(ctx, `
SELECT id, batch_id, token_address, gross_amount::text, treasury_amount::text,
       rewards_amount::text, community_amount::text, tx_hash, log_index, block_number, created_at
FROM fee_route_batches
ORDER BY created_at DESC
LIMIT $1
`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Batch
	for rows.Next() {
		var b Batch
		var batchID, token, txHash []byte
		if err := rows.Scan(&b.ID, &batchID, &token, &b.GrossAmount, &b.TreasuryAmount, &b.RewardsAmount, &b.CommunityAmount, &txHash, &b.LogIndex, &b.BlockNumber, &b.CreatedAt); err != nil {
			return nil, err
		}
		b.BatchID = "0x" + hex.EncodeToString(batchID)
		b.TokenAddress = "0x" + hex.EncodeToString(token)
		b.TxHash = "0x" + hex.EncodeToString(txHash)
		out = append(out, b)
	}
	return out, rows.Err()
}
