package priceworker

import (
	"context"
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum"
)

type sequenceCaller struct {
	responses [][]byte
}

func (f *sequenceCaller) CallContract(context.Context, ethereum.CallMsg, *big.Int) ([]byte, error) {
	response := f.responses[0]
	f.responses = f.responses[1:]
	return response, nil
}

func TestChainlinkReaderPreservesPhaseEncodedRoundID(t *testing.T) {
	reader, err := NewChainlinkReader(nil)
	if err != nil {
		t.Fatal(err)
	}
	roundID, ok := new(big.Int).SetString("18446744073709828049", 10)
	if !ok {
		t.Fatal("invalid test round ID")
	}
	decimals, err := reader.abi.Methods["decimals"].Outputs.Pack(uint8(8))
	if err != nil {
		t.Fatal(err)
	}
	latest, err := reader.abi.Methods["latestRoundData"].Outputs.Pack(
		roundID,
		big.NewInt(6_737_128_983_519),
		big.NewInt(1_780_414_408),
		big.NewInt(1_780_414_408),
		roundID,
	)
	if err != nil {
		t.Fatal(err)
	}
	reader.caller = &sequenceCaller{responses: [][]byte{decimals, latest}}

	got, err := reader.Latest(context.Background(), "0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298")
	if err != nil {
		t.Fatal(err)
	}
	if got.RoundID != roundID.String() || got.AnsweredInRound != roundID.String() {
		t.Fatalf("rounds = %q,%q want %q", got.RoundID, got.AnsweredInRound, roundID)
	}
}
