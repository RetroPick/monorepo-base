package indexer

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"retropick/apps/backend/internal/platform/bus"
)

func decodeFeesWithdrawn(lg types.Log) bus.FeeWithdrawnEvent {
	out := bus.FeeWithdrawnEvent{Log: lg}
	if len(lg.Topics) >= 2 {
		out.TemplateID = lg.Topics[1].Hex()
	}
	if len(lg.Data) >= 32 {
		amount := new(big.Int).SetBytes(lg.Data[:32])
		out.Amount = amount.String()
	}
	return out
}

func feesWithdrawnMarketID(lg types.Log) []byte {
	if len(lg.Topics) >= 2 {
		return lg.Topics[1].Bytes()
	}
	return common.Hash{}.Bytes()
}

func (s *Service) filterAddresses() []common.Address {
	addrs := []common.Address{s.proxy}
	if s.feeRouter != (common.Address{}) {
		addrs = append(addrs, s.feeRouter)
	}
	return addrs
}
