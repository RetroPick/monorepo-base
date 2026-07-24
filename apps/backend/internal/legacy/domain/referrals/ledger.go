package referrals

import (
	"context"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
)

// Level bps: L1 30%, L2 15%, L3 9%, L4 6%. Treasury base 40%.
var levelBps = []int64{3000, 1500, 900, 600}

const treasuryBaseBps int64 = 4000

// RewardLine is one referral reward allocation from a fee event.
type RewardLine struct {
	Referrer common.Address
	Level    int
	Amount   *big.Int
}

// Allocation splits a fee across referral levels and treasury remainder.
func Allocation(fee *big.Int, ancestors []common.Address) (rewards []RewardLine, treasury *big.Int) {
	if fee == nil || fee.Sign() <= 0 {
		return nil, big.NewInt(0)
	}
	treasury = new(big.Int).Mul(fee, big.NewInt(treasuryBaseBps))
	treasury.Div(treasury, big.NewInt(10000))
	rewards = make([]RewardLine, 0, 4)
	for i, bps := range levelBps {
		amount := new(big.Int).Mul(fee, big.NewInt(bps))
		amount.Div(amount, big.NewInt(10000))
		if i < len(ancestors) && ancestors[i] != (common.Address{}) {
			rewards = append(rewards, RewardLine{
				Referrer: ancestors[i],
				Level:    i + 1,
				Amount:   amount,
			})
		} else {
			treasury.Add(treasury, amount)
		}
	}
	return rewards, treasury
}

func walletBytes(addr common.Address) []byte {
	return addr.Bytes()
}

func normalizeWallet(wallet string) (common.Address, error) {
	wallet = strings.TrimSpace(wallet)
	if !common.IsHexAddress(wallet) {
		return common.Address{}, fmt.Errorf("referrals: invalid wallet")
	}
	return common.HexToAddress(wallet), nil
}

// ApplyCodeBinding persists a referral binding if not locked.
func (s *Service) ApplyCodeBinding(ctx context.Context, referee, referrer, code string) error {
	if s.Pool == nil {
		return nil
	}
	ref, err := normalizeWallet(referee)
	if err != nil {
		return err
	}
	rem, err := normalizeWallet(referrer)
	if err != nil {
		return err
	}
	if ref == rem {
		return fmt.Errorf("referrals: self-referral rejected")
	}
	_, err = s.Pool.Exec(ctx, `
INSERT INTO referral_bindings (referee_wallet, referrer_wallet, referral_code)
VALUES ($1, $2, $3)
ON CONFLICT (referee_wallet) DO UPDATE
SET referrer_wallet = EXCLUDED.referrer_wallet,
    referral_code = EXCLUDED.referral_code
WHERE referral_bindings.locked_at IS NULL
`, walletBytes(ref), walletBytes(rem), code)
	return err
}

// LockBinding locks referral before first fee event.
func (s *Service) LockBinding(ctx context.Context, referee string) error {
	if s.Pool == nil {
		return nil
	}
	ref, err := normalizeWallet(referee)
	if err != nil {
		return err
	}
	_, err = s.Pool.Exec(ctx, `
UPDATE referral_bindings
SET locked_at = COALESCE(locked_at, now())
WHERE referee_wallet = $1
`, walletBytes(ref))
	return err
}

// Ancestors returns up to depth direct referrers walking the binding chain.
func (s *Service) Ancestors(ctx context.Context, trader common.Address, depth int) ([]common.Address, error) {
	if s.Pool == nil {
		return nil, nil
	}
	out := make([]common.Address, 0, depth)
	current := trader
	seen := map[common.Address]struct{}{current: {}}
	for i := 0; i < depth; i++ {
		var referrer []byte
		err := s.Pool.QueryRow(ctx, `
SELECT referrer_wallet FROM referral_bindings WHERE referee_wallet = $1
`, walletBytes(current)).Scan(&referrer)
		if err == pgx.ErrNoRows || len(referrer) == 0 {
			break
		}
		if err != nil {
			return nil, err
		}
		parent := common.BytesToAddress(referrer)
		if _, dup := seen[parent]; dup {
			return nil, fmt.Errorf("referrals: cycle detected")
		}
		seen[parent] = struct{}{}
		out = append(out, parent)
		current = parent
	}
	return out, nil
}

// ProcessFeeEvent records fee and referral reward lines idempotently.
func (s *Service) ProcessFeeEvent(ctx context.Context, txHash []byte, logIndex int, marketID, trader, token []byte, feeAmount string, blockNumber int64) error {
	if s.Pool == nil || !s.Enabled {
		return nil
	}
	traderAddr := common.BytesToAddress(trader)
	if traderAddr != (common.Address{}) {
		if err := s.LockBinding(ctx, traderAddr.Hex()); err != nil {
			return err
		}
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var feeEventID int64
	err = tx.QueryRow(ctx, `
INSERT INTO fee_events (tx_hash, log_index, market_id, trader_wallet, token_address, fee_amount, block_number)
VALUES ($1, $2, $3, $4, $5, $6::numeric, $7)
ON CONFLICT (tx_hash, log_index) DO UPDATE SET fee_amount = fee_events.fee_amount
RETURNING id
`, txHash, logIndex, marketID, trader, token, feeAmount, blockNumber).Scan(&feeEventID)
	if err != nil {
		return err
	}

	fee := new(big.Int)
	fee.SetString(feeAmount, 10)
	var rewards []RewardLine
	if traderAddr != (common.Address{}) {
		ancestors, err := s.Ancestors(ctx, traderAddr, 4)
		if err != nil {
			return err
		}
		rewards, _ = Allocation(fee, ancestors)
	}
	for _, r := range rewards {
		_, err = tx.Exec(ctx, `
INSERT INTO referral_reward_events (fee_event_id, referrer_wallet, trader_wallet, level, amount, status)
VALUES ($1, $2, $3, $4, $5::numeric, 'claimable')
ON CONFLICT (fee_event_id, referrer_wallet, level) DO NOTHING
`, feeEventID, walletBytes(r.Referrer), trader, r.Level, r.Amount.String())
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
