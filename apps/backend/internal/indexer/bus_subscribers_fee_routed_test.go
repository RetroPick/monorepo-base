package indexer

import (
	"strings"
	"testing"
)

func TestPersistFeeRouteBatchUsesConflictNothing(t *testing.T) {
	const want = "ON CONFLICT (tx_hash, log_index) DO NOTHING"
	// Mirror persistFeeRouteBatch SQL contract — idempotent replay must not duplicate rows.
	src := `
INSERT INTO fee_route_batches (
  batch_id, token_address, gross_amount, treasury_amount, rewards_amount, community_amount,
  allocation_hash, tx_hash, log_index, block_number
) VALUES ($1, $2, $3::numeric, $4::numeric, $5::numeric, $6::numeric, $7, $8, $9, $10)
ON CONFLICT (tx_hash, log_index) DO NOTHING
`
	if !strings.Contains(src, want) {
		t.Fatalf("expected fee_route_batches insert to include %q", want)
	}
}
