package indexer

import (
	"context"
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/jackc/pgx/v5"

	"retropick/apps/backend/internal/platform/bus"
	"retropick/apps/backend/internal/realtime"
)

// SetBus attaches an in-process event bus for V3 decoupling.
func (s *Service) SetBus(b bus.Bus) {
	s.bus = b
}

// RegisterDefaultSubscribers wires bus handlers for V3 fee and referral flows.
func (s *Service) RegisterDefaultSubscribers() {
	if s.bus == nil {
		return
	}
	s.bus.Subscribe("fee.withdrawn", s.handleFeeWithdrawnBus)
	s.bus.Subscribe("fee.routed", s.handleFeesRoutedBus)
}

func (s *Service) publishChainLog(ctx context.Context, name string, lg types.Log, decoded map[string]any) {
	if s.bus == nil {
		return
	}
	_ = s.bus.Publish(ctx, bus.ChainLogEvent{
		Name:        name,
		Log:         lg,
		TxHash:      lg.TxHash,
		BlockNumber: lg.BlockNumber,
		BlockHash:   lg.BlockHash,
		Decoded:     decoded,
	})
}

func (s *Service) handleFeeWithdrawnBus(ctx context.Context, e bus.Event) error {
	ev, ok := e.(bus.FeeWithdrawnEvent)
	if !ok {
		return nil
	}
	if s.referrals == nil || ev.Amount == "" {
		return nil
	}
	zeroTrader := common.Address{}.Bytes()
	zeroToken := common.Address{}.Bytes()
	marketID := feesWithdrawnMarketID(ev.Log)
	if err := s.referrals.ProcessFeeEvent(ctx, ev.Log.TxHash.Bytes(), int(ev.Log.Index), marketID, zeroTrader, zeroToken, ev.Amount, int64(ev.Log.BlockNumber)); err != nil {
		return err
	}
	return s.publishFeeWithdrawnRealtime(ctx, ev)
}

func (s *Service) publishFeeWithdrawnRealtime(ctx context.Context, ev bus.FeeWithdrawnEvent) error {
	if s.pool == nil {
		return nil
	}
	block := int64(ev.Log.BlockNumber)
	logIndex := int32(ev.Log.Index)
	_, inserted, err := realtime.Insert(ctx, s.pool, realtime.InsertEvent{
		Channel:     "reward:treasury",
		Type:        "fee_withdrawn",
		Scope:       "public",
		BlockNumber: &block,
		TxHash:      ev.Log.TxHash.Hex(),
		LogIndex:    &logIndex,
		Payload: map[string]any{
			"templateId": ev.TemplateID,
			"amount":     ev.Amount,
		},
		DedupeKey: fmt.Sprintf("fee_withdrawn:%s:%d", ev.Log.TxHash.Hex(), ev.Log.Index),
	})
	if err != nil || !inserted {
		return err
	}
	return nil
}

func (s *Service) handleFeesRoutedBus(ctx context.Context, e bus.Event) error {
	ev, ok := e.(bus.FeesRoutedEvent)
	if !ok {
		return nil
	}
	if s.onFeeRouted != nil {
		return s.onFeeRouted(ctx, ev)
	}
	return s.persistFeeRouteBatch(ctx, ev)
}

func (s *Service) persistFeeRouteBatch(ctx context.Context, ev bus.FeesRoutedEvent) error {
	if s.pool == nil {
		return nil
	}
	batchID := common.HexToHash(ev.BatchID)
	_, err := s.pool.Exec(ctx, `
INSERT INTO fee_route_batches (
  batch_id, token_address, gross_amount, treasury_amount, rewards_amount, community_amount,
  allocation_hash, tx_hash, log_index, block_number
) VALUES ($1, $2, $3::numeric, $4::numeric, $5::numeric, $6::numeric, $7, $8, $9, $10)
ON CONFLICT (tx_hash, log_index) DO NOTHING
`, batchID.Bytes(), ev.Token.Bytes(), ev.GrossAmount, ev.TreasuryAmount, ev.RewardsAmount, ev.CommunityAmount,
		nil, ev.Log.TxHash.Bytes(), int32(ev.Log.Index), int64(ev.Log.BlockNumber))
	return err
}

func (s *Service) recordIndexerBlock(ctx context.Context, tx pgx.Tx, blockNumber uint64, blockHash, parentHash common.Hash) error {
	_, err := tx.Exec(ctx, `
INSERT INTO indexer_blocks (block_number, block_hash, parent_hash)
VALUES ($1, $2, $3)
ON CONFLICT (block_number) DO UPDATE
SET block_hash = EXCLUDED.block_hash,
    parent_hash = EXCLUDED.parent_hash,
    indexed_at = now()
`, int64(blockNumber), blockHash.Bytes(), parentHash.Bytes())
	return err
}
