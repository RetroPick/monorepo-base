package indexer

import (
	"bytes"
	"context"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/jackc/pgx/v5"

	"retropick/apps/backend/internal/abiembed"
	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/platform/bus"
	"retropick/apps/backend/internal/realtime"
)

// SetFeeRouterAddress configures optional FeeRouter log indexing.
func (s *Service) SetFeeRouterAddress(addr string) error {
	if addr == "" || addr == "0x0000000000000000000000000000000000000000" {
		return nil
	}
	if !common.IsHexAddress(addr) {
		return fmt.Errorf("invalid fee router address %q", addr)
	}
	parsed, err := abi.JSON(bytes.NewReader(abiembed.FeeRouterJSON))
	if err != nil {
		return fmt.Errorf("fee router abi: %w", err)
	}
	s.feeRouter = common.HexToAddress(addr)
	s.feeRouterABI = parsed
	return nil
}

func (s *Service) handleFeeRouterLog(ctx context.Context, tx pgx.Tx, q *dbqueries.Queries, realtimeSeqs *[]int64, lg types.Log) error {
	if s.feeRouter == (common.Address{}) {
		return nil
	}
	ev, err := s.feeRouterABI.EventByID(lg.Topics[0])
	if err != nil {
		return nil
	}
	if ev.Name != "FeesRouted" {
		return nil
	}

	payload := map[string]any{"event": ev.Name}
	inserted, err := s.recordChainEvent(ctx, tx, lg, ev.Name, nil, nil, nil, payload)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	routed, err := decodeFeesRouted(ev, lg)
	if err != nil {
		return err
	}
	if s.bus != nil {
		_ = s.bus.Publish(ctx, routed)
	}
	return s.publishFeeRoutedRealtime(ctx, tx, realtimeSeqs, routed)
}

func decodeFeesRouted(ev *abi.Event, lg types.Log) (bus.FeesRoutedEvent, error) {
	out := bus.FeesRoutedEvent{Log: lg}
	if len(lg.Topics) >= 2 {
		out.BatchID = lg.Topics[1].Hex()
	}
	if len(lg.Topics) >= 3 {
		out.Token = common.BytesToAddress(lg.Topics[2].Bytes())
	}
	vars, err := ev.Inputs.Unpack(lg.Data)
	if err != nil {
		return out, fmt.Errorf("unpack FeesRouted: %w", err)
	}
	if len(vars) >= 4 {
		if gross, ok := vars[0].(*big.Int); ok {
			out.GrossAmount = gross.String()
		}
		if treasury, ok := vars[1].(*big.Int); ok {
			out.TreasuryAmount = treasury.String()
		}
		if rewards, ok := vars[2].(*big.Int); ok {
			out.RewardsAmount = rewards.String()
		}
		if community, ok := vars[3].(*big.Int); ok {
			out.CommunityAmount = community.String()
		}
	}
	return out, nil
}

func (s *Service) publishFeeRoutedRealtime(ctx context.Context, tx pgx.Tx, realtimeSeqs *[]int64, ev bus.FeesRoutedEvent) error {
	block := int64(ev.Log.BlockNumber)
	logIndex := int32(ev.Log.Index)
	return s.insertRealtimeEvent(ctx, tx, realtimeSeqs, realtime.InsertEvent{
		Channel:     "impact:gooddollar",
		Type:        "fee_routed",
		Scope:       "public",
		BlockNumber: &block,
		TxHash:      ev.Log.TxHash.Hex(),
		LogIndex:    &logIndex,
		Payload: map[string]any{
			"batchId":         ev.BatchID,
			"token":           ev.Token.Hex(),
			"grossAmount":     ev.GrossAmount,
			"treasuryAmount":  ev.TreasuryAmount,
			"rewardsAmount":   ev.RewardsAmount,
			"communityAmount": ev.CommunityAmount,
		},
		DedupeKey: fmt.Sprintf("fee_routed:%s:%d", ev.Log.TxHash.Hex(), ev.Log.Index),
	})
}
