package ethops

import (
	"context"
	"errors"
	"math/big"
	"net"
	"testing"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

func TestFailoverClientBlockNumberFallsBackOnTransientError(t *testing.T) {
	t.Parallel()

	primary := &fakeRPCClient{
		blockNumberFn: func(context.Context) (uint64, error) {
			return 0, &net.OpError{Op: "dial", Err: errors.New("connection reset")}
		},
	}
	fallback := &fakeRPCClient{
		blockNumberFn: func(context.Context) (uint64, error) {
			return 42, nil
		},
	}
	client := newFailoverClientWithDial([]string{"primary", "fallback"}, func(_ context.Context, url string) (rpcClient, error) {
		switch url {
		case "primary":
			return primary, nil
		case "fallback":
			return fallback, nil
		default:
			return nil, errors.New("unexpected url")
		}
	})

	got, err := client.BlockNumber(context.Background())
	if err != nil {
		t.Fatalf("BlockNumber() error = %v", err)
	}
	if got != 42 {
		t.Fatalf("BlockNumber() = %d, want 42", got)
	}
	if primary.blockNumberCalls != 1 {
		t.Fatalf("primary blockNumberCalls = %d, want 1", primary.blockNumberCalls)
	}
	if fallback.blockNumberCalls != 1 {
		t.Fatalf("fallback blockNumberCalls = %d, want 1", fallback.blockNumberCalls)
	}
}

func TestFailoverClientPromotesHealthyEndpointAfterFailure(t *testing.T) {
	t.Parallel()

	primary := &fakeRPCClient{
		blockNumberFn: func(context.Context) (uint64, error) {
			return 0, &net.OpError{Op: "dial", Err: errors.New("timeout")}
		},
	}
	fallback := &fakeRPCClient{
		blockNumberFn: func(context.Context) (uint64, error) {
			return 77, nil
		},
	}
	client := newFailoverClientWithDial([]string{"primary", "fallback"}, func(_ context.Context, url string) (rpcClient, error) {
		switch url {
		case "primary":
			return primary, nil
		case "fallback":
			return fallback, nil
		default:
			return nil, errors.New("unexpected url")
		}
	})

	if _, err := client.BlockNumber(context.Background()); err != nil {
		t.Fatalf("first BlockNumber() error = %v", err)
	}
	if _, err := client.BlockNumber(context.Background()); err != nil {
		t.Fatalf("second BlockNumber() error = %v", err)
	}
	if primary.blockNumberCalls != 1 {
		t.Fatalf("primary blockNumberCalls = %d, want 1 after promotion", primary.blockNumberCalls)
	}
	if fallback.blockNumberCalls != 2 {
		t.Fatalf("fallback blockNumberCalls = %d, want 2", fallback.blockNumberCalls)
	}
}

type fakeRPCClient struct {
	blockNumberCalls int
	blockNumberFn    func(context.Context) (uint64, error)
}

func (f *fakeRPCClient) Close() {}
func (f *fakeRPCClient) BlockNumber(ctx context.Context) (uint64, error) {
	f.blockNumberCalls++
	return f.blockNumberFn(ctx)
}
func (f *fakeRPCClient) HeaderByNumber(context.Context, *big.Int) (*types.Header, error) {
	panic("unexpected call")
}
func (f *fakeRPCClient) FilterLogs(context.Context, ethereum.FilterQuery) ([]types.Log, error) {
	panic("unexpected call")
}
func (f *fakeRPCClient) CallContract(context.Context, ethereum.CallMsg, *big.Int) ([]byte, error) {
	panic("unexpected call")
}
func (f *fakeRPCClient) EstimateGas(context.Context, ethereum.CallMsg) (uint64, error) {
	panic("unexpected call")
}
func (f *fakeRPCClient) PendingNonceAt(context.Context, common.Address) (uint64, error) {
	panic("unexpected call")
}
func (f *fakeRPCClient) SuggestGasPrice(context.Context) (*big.Int, error) {
	panic("unexpected call")
}
func (f *fakeRPCClient) SendTransaction(context.Context, *types.Transaction) error {
	panic("unexpected call")
}
func (f *fakeRPCClient) TransactionReceipt(context.Context, common.Hash) (*types.Receipt, error) {
	panic("unexpected call")
}
