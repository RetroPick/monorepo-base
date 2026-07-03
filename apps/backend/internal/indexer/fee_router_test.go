package indexer

import (
	"bytes"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"retropick/apps/backend/internal/abiembed"
	"retropick/apps/backend/internal/platform/bus"
)

func TestDecodeFeesRoutedUnpacksIndexedAndDataFields(t *testing.T) {
	parsed, err := abi.JSON(bytes.NewReader(abiembed.FeeRouterJSON))
	if err != nil {
		t.Fatalf("abi: %v", err)
	}
	ev := parsed.Events["FeesRouted"]

	batchID := common.HexToHash("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	token := common.HexToAddress("0x1111111111111111111111111111111111111111")
	gross := big.NewInt(100)
	treasury := big.NewInt(40)
	rewards := big.NewInt(50)
	community := big.NewInt(10)
	allocationHash := common.HexToHash("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")

	data, err := ev.Inputs.NonIndexed().Pack(gross, treasury, rewards, community, allocationHash)
	if err != nil {
		t.Fatalf("pack: %v", err)
	}

	lg := types.Log{
		Topics: []common.Hash{
			ev.ID,
			batchID,
			common.BytesToHash(common.LeftPadBytes(token.Bytes(), 32)),
		},
		Data: data,
	}

	got, err := decodeFeesRouted(&ev, lg)
	if err != nil {
		t.Fatalf("decodeFeesRouted: %v", err)
	}
	if got.BatchID != batchID.Hex() {
		t.Fatalf("batchId got %s", got.BatchID)
	}
	if got.Token != token {
		t.Fatalf("token got %s", got.Token.Hex())
	}
	if got.GrossAmount != "100" || got.TreasuryAmount != "40" || got.RewardsAmount != "50" || got.CommunityAmount != "10" {
		t.Fatalf("amounts got %#v", got)
	}
	if got.Topic() != "fee.routed" {
		t.Fatalf("topic got %q", got.Topic())
	}
}

func TestFeesRoutedEventImplementsBusEvent(t *testing.T) {
	var _ bus.Event = bus.FeesRoutedEvent{}
}
