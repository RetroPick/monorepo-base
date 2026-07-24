package rewards

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// RecordClaim stores a prepared claim with nonce uniqueness.
func (s *Service) RecordClaim(ctx context.Context, wallet string, rewardLedgerEventID int64, payload map[string]any) (string, error) {
	if !s.Enabled || s.Pool == nil {
		return "", ErrDisabled
	}
	nonceBytes := sha256.Sum256([]byte(fmt.Sprintf("%s:%d:%v", wallet, rewardLedgerEventID, payload)))
	nonce := hex.EncodeToString(nonceBytes[:])
	payloadHash := nonceBytes
	walletBytes, err := hex.DecodeString(trim0x(wallet))
	if err != nil {
		return "", fmt.Errorf("rewards: invalid wallet")
	}
	var id int64
	err = s.Pool.QueryRow(ctx, `
INSERT INTO reward_claims (wallet, reward_ledger_event_id, claim_nonce, payload_hash, status)
VALUES ($1, $2, $3, $4, 'prepared')
ON CONFLICT (claim_nonce) DO NOTHING
RETURNING id
`, walletBytes, rewardLedgerEventID, nonce, payloadHash[:]).Scan(&id)
	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("rewards: claim replay rejected")
	}
	if err != nil {
		return "", err
	}
	return nonce, nil
}

func trim0x(s string) string {
	if len(s) >= 2 && (s[0:2] == "0x" || s[0:2] == "0X") {
		return s[2:]
	}
	return s
}

// ListClaimable loads claimable rewards from referral_reward_events and quest ledger.
func (s *Service) listClaimableFromDB(ctx context.Context, wallet string) ([]ClaimableReward, error) {
	if s.Pool == nil {
		return []ClaimableReward{}, nil
	}
	wb, err := hex.DecodeString(trim0x(wallet))
	if err != nil {
		return nil, err
	}
	rows, err := s.Pool.Query(ctx, `
SELECT id, amount::text, level::text, status
FROM referral_reward_events
WHERE referrer_wallet = $1 AND status = 'claimable'
ORDER BY created_at DESC
LIMIT 50
`, wb)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ClaimableReward
	for rows.Next() {
		var item ClaimableReward
		var level string
		if err := rows.Scan(&item.ID, &item.Amount, &level, &item.Status); err != nil {
			return nil, err
		}
		item.Reason = "referral_level_" + level
		item.Token = "G$"
		out = append(out, item)
	}
	return out, rows.Err()
}
