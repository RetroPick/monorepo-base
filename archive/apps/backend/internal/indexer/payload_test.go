package indexer

import (
	"bytes"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

func TestMergeUserEventPayloadPositionDeposited(t *testing.T) {
	// Minimal ABI slice with the three user events
	const abiJSON = `[
		{"type":"event","name":"PositionDeposited","inputs":[
			{"name":"templateId","type":"bytes32","indexed":true},
			{"name":"epochId","type":"uint64","indexed":true},
			{"name":"user","type":"address","indexed":true},
			{"name":"outcome","type":"uint8","indexed":false},
			{"name":"amount","type":"uint256","indexed":false}
		]}
	]`
	contractABI, err := abi.JSON(bytes.NewReader([]byte(abiJSON)))
	if err != nil {
		t.Fatal(err)
	}
	e := contractABI.Events["PositionDeposited"]
	ev := &e
	outcome := uint8(1)
	amount := big.NewInt(42)
	data, err := ev.Inputs.NonIndexed().Pack(outcome, amount)
	if err != nil {
		t.Fatal(err)
	}
	lg := types.Log{Data: data}
	payload := map[string]any{"event": ev.Name}
	if err := mergeUserEventPayload(ev, lg, payload); err != nil {
		t.Fatal(err)
	}
	if payload["outcomeIndex"] != uint8(1) {
		t.Fatalf("outcomeIndex got %#v", payload["outcomeIndex"])
	}
	if payload["amount"] != "42" {
		t.Fatalf("amount got %#v", payload["amount"])
	}
}

func TestIndexedUserAddressClaimed(t *testing.T) {
	tpl := common.Hash{1}
	epoch := uint64(2)
	user := common.HexToAddress("0x1111111111111111111111111111111111111111")
	lg := types.Log{
		Topics: []common.Hash{
			common.Hash{},
			tpl,
			common.BigToHash(big.NewInt(int64(epoch))),
			common.BytesToHash(common.LeftPadBytes(user.Bytes(), 32)),
		},
	}
	got := indexedUserAddress("Claimed", lg)
	if got == nil || *got != user.Hex() {
		t.Fatalf("user got %#v", got)
	}
}
