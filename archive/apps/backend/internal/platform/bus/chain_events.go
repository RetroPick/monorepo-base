package bus

import (
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// ChainLogEvent is published after a log is decoded and persisted to chain_events.
type ChainLogEvent struct {
	Name        string
	Log         types.Log
	TxHash      common.Hash
	BlockNumber uint64
	BlockHash   common.Hash
	Decoded     map[string]any
}

func (e ChainLogEvent) Topic() string {
	return "chain." + e.Name
}

// FeeWithdrawnEvent is emitted when MarketEngine withdraws fees to treasury.
type FeeWithdrawnEvent struct {
	TemplateID string
	Amount     string
	Log        types.Log
}

func (e FeeWithdrawnEvent) Topic() string { return "fee.withdrawn" }

// FeesRoutedEvent is emitted when FeeRouter routes a batch.
type FeesRoutedEvent struct {
	BatchID         string
	Token           common.Address
	GrossAmount     string
	TreasuryAmount  string
	RewardsAmount   string
	CommunityAmount string
	Log             types.Log
}

func (e FeesRoutedEvent) Topic() string { return "fee.routed" }
