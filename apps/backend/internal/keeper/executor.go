package keeper

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"retropick/apps/backend/internal/abis"
	"retropick/apps/backend/internal/ethops"
)

const (
	epochStatusOpen   = 1
	epochStatusLocked = 2

	rollingPhaseGenesisOpen = 1
	rollingPhaseLive        = 2
)

type HotWalletExecutor struct {
	client interface {
		Close()
		CallContract(context.Context, ethereum.CallMsg, *big.Int) ([]byte, error)
		EstimateGas(context.Context, ethereum.CallMsg) (uint64, error)
		PendingNonceAt(context.Context, common.Address) (uint64, error)
		SuggestGasPrice(context.Context) (*big.Int, error)
		SendTransaction(context.Context, *types.Transaction) error
		TransactionReceipt(context.Context, common.Hash) (*types.Receipt, error)
	}
	caller         *ethops.Caller
	key            *ecdsa.PrivateKey
	from           common.Address
	chainID        *big.Int
	proxy          common.Address
	marketABI      abi.ABI
	receiptTimeout time.Duration
	pollInterval   time.Duration
}

func NewHotWalletExecutor(rpcURL, privateKeyHex, proxyHex string, chainID int64, receiptTimeout, pollInterval time.Duration, fallbackURLs ...string) (*HotWalletExecutor, error) {
	keyHex := strings.TrimPrefix(strings.TrimSpace(privateKeyHex), "0x")
	if len(keyHex) != 64 {
		return nil, fmt.Errorf("keeper private key must be 32-byte hex")
	}
	key, err := crypto.HexToECDSA(keyHex)
	if err != nil {
		return nil, fmt.Errorf("keeper private key: %w", err)
	}
	client := ethops.NewFailoverRPCClient(rpcURL, fallbackURLs)
	caller, err := ethops.NewCaller(rpcURL, fallbackURLs...)
	if err != nil {
		return nil, err
	}
	marketABI, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		client.Close()
		caller.Close()
		return nil, err
	}
	if receiptTimeout <= 0 {
		receiptTimeout = 90 * time.Second
	}
	if pollInterval <= 0 {
		pollInterval = 3 * time.Second
	}
	return &HotWalletExecutor{
		client:         client,
		caller:         caller,
		key:            key,
		from:           crypto.PubkeyToAddress(key.PublicKey),
		chainID:        big.NewInt(chainID),
		proxy:          common.HexToAddress(proxyHex),
		marketABI:      marketABI,
		receiptTimeout: receiptTimeout,
		pollInterval:   pollInterval,
	}, nil
}

func (e *HotWalletExecutor) Close() {
	if e.client != nil {
		e.client.Close()
	}
	if e.caller != nil {
		e.caller.Close()
	}
}

func (e *HotWalletExecutor) Preflight(ctx context.Context, action Action, templateID []byte, epochID *int64) (map[string]any, error) {
	tid := common.BytesToHash(templateID)
	switch action {
	case ActionLockEpoch, ActionResolveEpoch:
		if epochID == nil {
			return nil, fmt.Errorf("%s requires epoch id", action)
		}
		view, _, err := e.caller.GetEpochView(ctx, e.proxy, tid, uint64(*epochID))
		if err != nil {
			return nil, err
		}
		status, _ := view["status"].(uint8)
		now := uint64(time.Now().Unix())
		switch action {
		case ActionLockEpoch:
			lockAt, _ := view["lockAt"].(uint64)
			if status != epochStatusOpen || now < lockAt {
				return view, fmt.Errorf("epoch not lockable")
			}
		case ActionResolveEpoch:
			resolveAt, _ := view["resolveAt"].(uint64)
			if status != epochStatusLocked || now < resolveAt {
				return view, fmt.Errorf("epoch not resolvable")
			}
		}
		return view, nil
	case ActionGenesisLockRolling, ActionExecuteRollingRound:
		view, _, err := e.caller.GetOperatorTemplateView(ctx, e.proxy, tid)
		if err != nil {
			return nil, err
		}
		phase, _ := view["rollingPhase"].(uint8)
		switch action {
		case ActionGenesisLockRolling:
			if phase != rollingPhaseGenesisOpen {
				return view, fmt.Errorf("rolling market not in genesis-open phase")
			}
		case ActionExecuteRollingRound:
			if phase != rollingPhaseLive {
				return view, fmt.Errorf("rolling market not live")
			}
		}
		return view, nil
	default:
		return nil, fmt.Errorf("unsupported keeper action %q", action)
	}
}

func (e *HotWalletExecutor) Execute(ctx context.Context, action Action, templateID []byte, epochID *int64) (TxResult, error) {
	args, err := argsForAction(action, templateID, epochID)
	if err != nil {
		return TxResult{}, err
	}
	data, err := e.marketABI.Pack(string(action), args...)
	if err != nil {
		return TxResult{}, err
	}
	msg := ethereum.CallMsg{From: e.from, To: &e.proxy, Data: data, Value: big.NewInt(0)}
	gasLimit, err := e.client.EstimateGas(ctx, msg)
	if err != nil {
		return TxResult{}, fmt.Errorf("estimate gas: %w", err)
	}
	nonce, err := e.client.PendingNonceAt(ctx, e.from)
	if err != nil {
		return TxResult{}, err
	}
	gasPrice, err := e.client.SuggestGasPrice(ctx)
	if err != nil {
		return TxResult{}, err
	}
	tx := types.NewTx(&types.LegacyTx{
		Nonce:    nonce,
		To:       &e.proxy,
		Gas:      gasLimit * 12 / 10,
		GasPrice: gasPrice,
		Value:    big.NewInt(0),
		Data:     data,
	})
	signed, err := types.SignTx(tx, types.NewEIP155Signer(e.chainID), e.key)
	if err != nil {
		return TxResult{}, err
	}
	submittedAt := time.Now().UTC()
	if err := e.client.SendTransaction(ctx, signed); err != nil {
		return TxResult{}, fmt.Errorf("send tx: %w", err)
	}
	receipt, err := e.waitReceipt(ctx, signed.Hash())
	if err != nil {
		return TxResult{}, err
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return TxResult{}, fmt.Errorf("receipt reverted: %s", signed.Hash().Hex())
	}
	return TxResult{
		Hash:        signed.Hash().Hex(),
		SubmittedAt: submittedAt,
		MinedAt:     time.Now().UTC(),
		GasUsed:     receipt.GasUsed,
		Receipt: map[string]any{
			"transactionHash": signed.Hash().Hex(),
			"status":          receipt.Status,
			"gasUsed":         receipt.GasUsed,
			"blockNumber":     receipt.BlockNumber.String(),
		},
		ChainID: e.chainID.Int64(),
		Nonce:   nonce,
	}, nil
}

func (e *HotWalletExecutor) waitReceipt(ctx context.Context, hash common.Hash) (*types.Receipt, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, e.receiptTimeout)
	defer cancel()
	ticker := time.NewTicker(e.pollInterval)
	defer ticker.Stop()
	for {
		receipt, err := e.client.TransactionReceipt(timeoutCtx, hash)
		if err == nil {
			return receipt, nil
		}
		if !strings.Contains(strings.ToLower(err.Error()), "not found") {
			return nil, err
		}
		select {
		case <-timeoutCtx.Done():
			return nil, fmt.Errorf("receipt timeout for %s", hash.Hex())
		case <-ticker.C:
		}
	}
}

func argsForAction(action Action, templateID []byte, epochID *int64) ([]any, error) {
	tid := common.BytesToHash(templateID)
	switch action {
	case ActionLockEpoch, ActionResolveEpoch:
		if epochID == nil {
			return nil, fmt.Errorf("%s requires epoch id", action)
		}
		return []any{tid, uint64(*epochID)}, nil
	case ActionGenesisLockRolling, ActionExecuteRollingRound:
		return []any{tid}, nil
	default:
		return nil, fmt.Errorf("unsupported keeper action %q", action)
	}
}
