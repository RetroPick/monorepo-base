package ethops

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"net"
	"strings"
	"sync"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type rpcClient interface {
	Close()
	BlockNumber(context.Context) (uint64, error)
	HeaderByNumber(context.Context, *big.Int) (*types.Header, error)
	FilterLogs(context.Context, ethereum.FilterQuery) ([]types.Log, error)
	CallContract(context.Context, ethereum.CallMsg, *big.Int) ([]byte, error)
	EstimateGas(context.Context, ethereum.CallMsg) (uint64, error)
	PendingNonceAt(context.Context, common.Address) (uint64, error)
	SuggestGasPrice(context.Context) (*big.Int, error)
	SendTransaction(context.Context, *types.Transaction) error
	TransactionReceipt(context.Context, common.Hash) (*types.Receipt, error)
}

type failoverClient struct {
	mu      sync.Mutex
	urls    []string
	dial    func(context.Context, string) (rpcClient, error)
	clients map[int]rpcClient
	active  int
}

func newFailoverClient(primary string, fallbacks []string) *failoverClient {
	urls := make([]string, 0, 1+len(fallbacks))
	if strings.TrimSpace(primary) != "" {
		urls = append(urls, strings.TrimSpace(primary))
	}
	for _, url := range fallbacks {
		if trimmed := strings.TrimSpace(url); trimmed != "" {
			urls = append(urls, trimmed)
		}
	}
	return newFailoverClientWithDial(urls, func(ctx context.Context, url string) (rpcClient, error) {
		return ethclient.DialContext(ctx, url)
	})
}

func NewFailoverRPCClient(primary string, fallbacks []string) *failoverClient {
	return newFailoverClient(primary, fallbacks)
}

func newFailoverClientWithDial(urls []string, dial func(context.Context, string) (rpcClient, error)) *failoverClient {
	return &failoverClient{
		urls:    urls,
		dial:    dial,
		clients: make(map[int]rpcClient),
	}
}

func (c *failoverClient) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	for idx, client := range c.clients {
		client.Close()
		delete(c.clients, idx)
	}
}

func (c *failoverClient) BlockNumber(ctx context.Context) (uint64, error) {
	var out uint64
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.BlockNumber(ctx)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) HeaderByNumber(ctx context.Context, number *big.Int) (*types.Header, error) {
	var out *types.Header
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.HeaderByNumber(ctx, number)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) FilterLogs(ctx context.Context, query ethereum.FilterQuery) ([]types.Log, error) {
	var out []types.Log
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.FilterLogs(ctx, query)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) CallContract(ctx context.Context, msg ethereum.CallMsg, blockNumber *big.Int) ([]byte, error) {
	var out []byte
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.CallContract(ctx, msg, blockNumber)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) EstimateGas(ctx context.Context, msg ethereum.CallMsg) (uint64, error) {
	var out uint64
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.EstimateGas(ctx, msg)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) PendingNonceAt(ctx context.Context, account common.Address) (uint64, error) {
	var out uint64
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.PendingNonceAt(ctx, account)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) SuggestGasPrice(ctx context.Context) (*big.Int, error) {
	var out *big.Int
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.SuggestGasPrice(ctx)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) SendTransaction(ctx context.Context, tx *types.Transaction) error {
	return c.withFailover(ctx, func(_ int, client rpcClient) error {
		return client.SendTransaction(ctx, tx)
	})
}

func (c *failoverClient) TransactionReceipt(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	var out *types.Receipt
	err := c.withFailover(ctx, func(_ int, client rpcClient) error {
		value, err := client.TransactionReceipt(ctx, txHash)
		if err == nil {
			out = value
		}
		return err
	})
	return out, err
}

func (c *failoverClient) withFailover(ctx context.Context, op func(idx int, client rpcClient) error) error {
	order := c.endpointOrder()
	if len(order) == 0 {
		return fmt.Errorf("RPC_URL not configured")
	}
	var lastErr error
	for _, idx := range order {
		client, err := c.clientFor(ctx, idx)
		if err != nil {
			lastErr = err
			c.invalidate(idx)
			continue
		}
		err = op(idx, client)
		if err == nil {
			c.promote(idx)
			return nil
		}
		if !isRetryableRPCErr(err) {
			return err
		}
		lastErr = err
		c.invalidate(idx)
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("all rpc endpoints failed")
	}
	return lastErr
}

func (c *failoverClient) endpointOrder() []int {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.urls) == 0 {
		return nil
	}
	order := []int{c.active}
	for i := range c.urls {
		if i != c.active {
			order = append(order, i)
		}
	}
	return order
}

func (c *failoverClient) clientFor(ctx context.Context, idx int) (rpcClient, error) {
	c.mu.Lock()
	client := c.clients[idx]
	url := c.urls[idx]
	c.mu.Unlock()
	if client != nil {
		return client, nil
	}
	client, err := c.dial(ctx, url)
	if err != nil {
		return nil, err
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if existing := c.clients[idx]; existing != nil {
		client.Close()
		return existing, nil
	}
	c.clients[idx] = client
	return client, nil
}

func (c *failoverClient) invalidate(idx int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if client := c.clients[idx]; client != nil {
		client.Close()
		delete(c.clients, idx)
	}
}

func (c *failoverClient) promote(idx int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.active = idx
}

func isRetryableRPCErr(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return false
	}
	var opErr *net.OpError
	if errors.As(err, &opErr) {
		return true
	}
	var dnsErr *net.DNSError
	if errors.As(err, &dnsErr) {
		return true
	}
	lower := strings.ToLower(err.Error())
	switch {
	case strings.Contains(lower, "connection reset"),
		strings.Contains(lower, "connection refused"),
		strings.Contains(lower, "broken pipe"),
		strings.Contains(lower, "timeout"),
		strings.Contains(lower, "temporarily unavailable"),
		strings.Contains(lower, "eof"),
		strings.Contains(lower, "no such host"),
		strings.Contains(lower, "server misbehaving"),
		strings.Contains(lower, "503 service unavailable"),
		strings.Contains(lower, "429 too many requests"):
		return true
	default:
		return false
	}
}
