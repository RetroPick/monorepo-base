package gooddollar

import (
	"context"
	"encoding/hex"
	"strings"
)

// UpsertGoodIDStatus caches GoodID verification from an external check.
func (s *Service) UpsertGoodIDStatus(ctx context.Context, wallet string, verified bool, rootWallet string) error {
	if s.Pool == nil {
		return nil
	}
	wb, err := hex.DecodeString(trim0x(wallet))
	if err != nil {
		return err
	}
	var root []byte
	if rootWallet != "" {
		root, err = hex.DecodeString(trim0x(rootWallet))
		if err != nil {
			return err
		}
	}
	_, err = s.Pool.Exec(ctx, `
INSERT INTO gooddollar_user_status (wallet, goodid_verified, root_wallet, last_checked_at)
VALUES ($1, $2, $3, now())
ON CONFLICT (wallet) DO UPDATE SET
  goodid_verified = EXCLUDED.goodid_verified,
  root_wallet = EXCLUDED.root_wallet,
  last_checked_at = now()
`, wb, verified, root)
	return err
}

func trim0x(s string) string {
	s = strings.TrimSpace(s)
	if len(s) >= 2 && strings.EqualFold(s[:2], "0x") {
		return s[2:]
	}
	return s
}
