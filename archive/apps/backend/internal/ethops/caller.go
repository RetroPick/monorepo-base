package ethops

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"retropick/apps/backend/internal/abis"
)

// Caller performs read-only eth_calls against the MarketEngine proxy using embedded ABIs.
type Caller struct {
	client     *failoverClient
	marketABI  abi.ABI
	dispABI    abi.ABI
	adapterABI abi.ABI
	mu         sync.Mutex
	globalTTL  time.Duration
	global     cachedGlobalView
}

type cachedGlobalView struct {
	data      map[string]any
	blockNum  uint64
	expiresAt time.Time
}

// NewCaller parses embedded ABIs and prepares a lazy RPC failover client.
func NewCaller(rpcURL string, fallbackURLs ...string) (*Caller, error) {
	marketABI, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		return nil, fmt.Errorf("market abi: %w", err)
	}
	dispABI, err := abi.JSON(strings.NewReader(string(abis.MarketEngineDispatcherJSON)))
	if err != nil {
		return nil, fmt.Errorf("dispatcher abi: %w", err)
	}
	adapterABI, err := abi.JSON(strings.NewReader(string(abis.ChainlinkAdapterJSON)))
	if err != nil {
		return nil, fmt.Errorf("chainlink adapter abi: %w", err)
	}
	return &Caller{
		client:     newFailoverClient(rpcURL, fallbackURLs),
		marketABI:  marketABI,
		dispABI:    dispABI,
		adapterABI: adapterABI,
	}, nil
}

func (c *Caller) SetGlobalCacheTTL(ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.globalTTL = ttl
}

// Close releases the underlying client if dialed.
func (c *Caller) Close() {
	if c.client != nil {
		c.client.Close()
	}
}

// GetOperatorGlobalView calls getOperatorGlobalView at proxy.
func (c *Caller) GetOperatorGlobalView(ctx context.Context, proxy common.Address) (data map[string]any, blockNum uint64, err error) {
	if data, blockNum, ok := c.cachedGlobal(); ok {
		return data, blockNum, nil
	}
	input, err := c.marketABI.Pack("getOperatorGlobalView")
	if err != nil {
		return nil, 0, err
	}
	raw, bn, err := c.call(ctx, proxy, input)
	if err != nil {
		return nil, 0, err
	}
	out, err := unpackSingleTuple[OperatorGlobalView](c.marketABI, "getOperatorGlobalView", raw)
	if err != nil {
		return nil, 0, err
	}
	m, ok := ToJSONMap(out).(map[string]any)
	if !ok {
		return nil, 0, fmt.Errorf("unexpected json map type")
	}
	c.setCachedGlobal(m, bn)
	return m, bn, nil
}

func (c *Caller) cachedGlobal() (map[string]any, uint64, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.globalTTL <= 0 || time.Now().After(c.global.expiresAt) || c.global.data == nil {
		return nil, 0, false
	}
	out := make(map[string]any, len(c.global.data))
	for k, v := range c.global.data {
		out[k] = v
	}
	return out, c.global.blockNum, true
}

func (c *Caller) setCachedGlobal(data map[string]any, blockNum uint64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.globalTTL <= 0 {
		return
	}
	out := make(map[string]any, len(data))
	for k, v := range data {
		out[k] = v
	}
	c.global = cachedGlobalView{data: out, blockNum: blockNum, expiresAt: time.Now().Add(c.globalTTL)}
}

// GetOperatorTemplateView calls getOperatorTemplateView(templateId).
func (c *Caller) GetOperatorTemplateView(ctx context.Context, proxy common.Address, templateID common.Hash) (data map[string]any, blockNum uint64, err error) {
	input, err := c.marketABI.Pack("getOperatorTemplateView", templateID)
	if err != nil {
		return nil, 0, err
	}
	raw, bn, err := c.call(ctx, proxy, input)
	if err != nil {
		return nil, 0, err
	}
	out, err := unpackSingleTuple[OperatorTemplateView](c.marketABI, "getOperatorTemplateView", raw)
	if err != nil {
		return nil, 0, err
	}
	m, ok := ToJSONMap(out).(map[string]any)
	if !ok {
		return nil, 0, fmt.Errorf("unexpected json map type")
	}
	return m, bn, nil
}

// GetEpochView calls getEpochView(templateId, epochId).
func (c *Caller) GetEpochView(ctx context.Context, proxy common.Address, templateID common.Hash, epochID uint64) (data map[string]any, blockNum uint64, err error) {
	input, err := c.marketABI.Pack("getEpochView", templateID, epochID)
	if err != nil {
		return nil, 0, err
	}
	raw, bn, err := c.call(ctx, proxy, input)
	if err != nil {
		return nil, 0, err
	}
	out, err := unpackSingleTuple[EpochView](c.marketABI, "getEpochView", raw)
	if err != nil {
		return nil, 0, err
	}
	m, ok := ToJSONMap(out).(map[string]any)
	if !ok {
		return nil, 0, fmt.Errorf("unexpected json map type")
	}
	return m, bn, nil
}

// GetOutcomeViews calls getOutcomeViews(templateId, epochId).
func (c *Caller) GetOutcomeViews(ctx context.Context, proxy common.Address, templateID common.Hash, epochID uint64) (data []map[string]any, blockNum uint64, err error) {
	input, err := c.marketABI.Pack("getOutcomeViews", templateID, epochID)
	if err != nil {
		return nil, 0, err
	}
	raw, bn, err := c.call(ctx, proxy, input)
	if err != nil {
		return nil, 0, err
	}
	var out []OutcomeView
	if err := c.marketABI.UnpackIntoInterface(&out, "getOutcomeViews", raw); err != nil {
		return nil, 0, err
	}
	normalized, ok := ToJSONMap(out).([]any)
	if !ok {
		return nil, 0, fmt.Errorf("unexpected outcome views json type")
	}
	rows := make([]map[string]any, 0, len(normalized))
	for _, item := range normalized {
		row, ok := item.(map[string]any)
		if !ok {
			return nil, 0, fmt.Errorf("unexpected outcome view row type")
		}
		rows = append(rows, row)
	}
	return rows, bn, nil
}

// GetPositionView calls getPositionView(templateId, epochId, user) at the MarketEngine proxy.
func (c *Caller) GetPositionView(ctx context.Context, proxy common.Address, templateID common.Hash, epochID uint64, user common.Address) (out PositionView, blockNum uint64, err error) {
	input, err := c.marketABI.Pack("getPositionView", templateID, epochID, user)
	if err != nil {
		return PositionView{}, 0, err
	}
	raw, bn, err := c.call(ctx, proxy, input)
	if err != nil {
		return PositionView{}, 0, err
	}
	out, err = unpackSingleTuple[PositionView](c.marketABI, "getPositionView", raw)
	if err != nil {
		return PositionView{}, 0, err
	}
	return out, bn, nil
}

// GetSelectorModule calls getSelectorModule(bytes4) at proxy (delegate routing).
func (c *Caller) GetSelectorModule(ctx context.Context, proxy common.Address, selector [4]byte) (module common.Address, immutable bool, blockNum uint64, err error) {
	input, err := c.dispABI.Pack("getSelectorModule", selector)
	if err != nil {
		return common.Address{}, false, 0, err
	}
	raw, bn, err := c.call(ctx, proxy, input)
	if err != nil {
		return common.Address{}, false, 0, err
	}
	out, err := c.dispABI.Unpack("getSelectorModule", raw)
	if err != nil {
		return common.Address{}, false, 0, err
	}
	if len(out) != 2 {
		return common.Address{}, false, 0, fmt.Errorf("getSelectorModule: expected 2 outputs")
	}
	mod, ok := out[0].(common.Address)
	if !ok {
		return common.Address{}, false, 0, fmt.Errorf("module address type")
	}
	immut, ok := out[1].(bool)
	if !ok {
		return common.Address{}, false, 0, fmt.Errorf("immutable flag type")
	}
	return mod, immut, bn, nil
}

// callContract performs an eth_call to an arbitrary contract address.
func (c *Caller) callContract(ctx context.Context, to common.Address, input []byte) ([]byte, uint64, error) {
	msg := ethereum.CallMsg{To: &to, Data: input}
	raw, err := c.client.CallContract(ctx, msg, nil)
	if err != nil {
		return nil, 0, err
	}
	head, err := c.client.HeaderByNumber(ctx, nil)
	if err != nil {
		return raw, 0, nil
	}
	return raw, head.Number.Uint64(), nil
}

func (c *Caller) call(ctx context.Context, proxy common.Address, input []byte) ([]byte, uint64, error) {
	return c.callContract(ctx, proxy, input)
}

func (c *Caller) BlockNumber(ctx context.Context) (uint64, error) {
	return c.client.BlockNumber(ctx)
}

// PrepareTx builds calldata for a whitelisted write on the proxy.
func (c *Caller) PrepareTx(chainID int64, proxy common.Address, method string, args []any, value *big.Int) (calldata []byte, err error) {
	if value == nil {
		value = big.NewInt(0)
	}
	if value.Sign() != 0 {
		return nil, fmt.Errorf("non-zero value not supported for prepared ops txs")
	}
	packABI := c.marketABI
	if method == "setFeedDecimals" {
		packABI = c.adapterABI
	}
	calldata, err = packABI.Pack(method, args...)
	if err != nil {
		return nil, err
	}
	_ = chainID
	_ = proxy
	return calldata, nil
}
