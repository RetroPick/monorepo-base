package priceworker

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

const aggregatorV3ABI = `[
  {"inputs":[],"name":"decimals","outputs":[{"type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"latestRoundData","outputs":[{"type":"uint80"},{"type":"int256"},{"type":"uint256"},{"type":"uint256"},{"type":"uint80"}],"stateMutability":"view","type":"function"}
]`

type contractCaller interface {
	CallContract(context.Context, ethereum.CallMsg, *big.Int) ([]byte, error)
}

type ChainlinkReader struct {
	caller contractCaller
	abi    abi.ABI
}

func NewChainlinkReader(caller contractCaller) (*ChainlinkReader, error) {
	parsed, err := abi.JSON(strings.NewReader(aggregatorV3ABI))
	if err != nil {
		return nil, err
	}
	return &ChainlinkReader{caller: caller, abi: parsed}, nil
}

func (r *ChainlinkReader) Latest(ctx context.Context, proxyAddress string) (Reading, error) {
	if !common.IsHexAddress(proxyAddress) {
		return Reading{}, fmt.Errorf("invalid feed proxy address %q", proxyAddress)
	}
	to := common.HexToAddress(proxyAddress)
	decimalsData, err := r.abi.Pack("decimals")
	if err != nil {
		return Reading{}, err
	}
	rawDecimals, err := r.caller.CallContract(ctx, ethereum.CallMsg{To: &to, Data: decimalsData}, nil)
	if err != nil {
		return Reading{}, fmt.Errorf("decimals: %w", err)
	}
	decimalsOut, err := r.abi.Unpack("decimals", rawDecimals)
	if err != nil || len(decimalsOut) != 1 {
		return Reading{}, fmt.Errorf("decode decimals: %w", err)
	}
	decimals, ok := decimalsOut[0].(uint8)
	if !ok {
		return Reading{}, fmt.Errorf("decode decimals: unexpected type %T", decimalsOut[0])
	}
	latestData, err := r.abi.Pack("latestRoundData")
	if err != nil {
		return Reading{}, err
	}
	rawLatest, err := r.caller.CallContract(ctx, ethereum.CallMsg{To: &to, Data: latestData}, nil)
	if err != nil {
		return Reading{}, fmt.Errorf("latestRoundData: %w", err)
	}
	out, err := r.abi.Unpack("latestRoundData", rawLatest)
	if err != nil || len(out) != 5 {
		return Reading{}, fmt.Errorf("decode latestRoundData: %w", err)
	}
	roundID, okRound := out[0].(*big.Int)
	answer, okAnswer := out[1].(*big.Int)
	updatedAt, okUpdated := out[3].(*big.Int)
	answeredInRound, okAnswered := out[4].(*big.Int)
	if !okRound || !okAnswer || !okUpdated || !okAnswered || roundID.Sign() < 0 ||
		!answer.IsInt64() || !updatedAt.IsInt64() || answeredInRound.Sign() < 0 {
		return Reading{}, fmt.Errorf("decode latestRoundData: invalid numeric values")
	}
	return Reading{
		RoundID: roundID.String(), Answer: answer.Int64(),
		UpdatedAt:       time.Unix(updatedAt.Int64(), 0).UTC(),
		AnsweredInRound: answeredInRound.String(), Decimals: decimals,
	}, nil
}
