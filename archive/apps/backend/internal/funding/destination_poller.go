package funding

import (
	"context"
	"log/slog"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/ethops"
)

type DestinationPoller struct {
	pool   *pgxpool.Pool
	client interface {
		Close()
		BlockNumber(context.Context) (uint64, error)
		FilterLogs(context.Context, ethereum.FilterQuery) ([]types.Log, error)
	}
	logger            *slog.Logger
	settlementChainID int64
	usdcToken         common.Address
	receiver          common.Address
	interval          time.Duration
}

func NewDestinationPoller(pool *pgxpool.Pool, rpcURL string, fallbackURLs []string, settlementChainID int64, usdcTokenAddr, receiverAddr string, interval time.Duration, logger *slog.Logger) (*DestinationPoller, error) {
	if interval <= 0 {
		interval = 4 * time.Second
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &DestinationPoller{
		pool:              pool,
		client:            ethops.NewFailoverRPCClient(rpcURL, fallbackURLs),
		logger:            logger,
		settlementChainID: settlementChainID,
		usdcToken:         common.HexToAddress(usdcTokenAddr),
		receiver:          common.HexToAddress(receiverAddr),
		interval:          interval,
	}, nil
}

func (p *DestinationPoller) Close() {
	if p.client != nil {
		p.client.Close()
	}
}

func (p *DestinationPoller) Run(ctx context.Context) error {
	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := p.pollOnce(ctx); err != nil && p.logger != nil {
				p.logger.Warn("destination poller tick", "err", err)
			}
		}
	}
}

func (p *DestinationPoller) pollOnce(ctx context.Context) error {
	var lastBlock int64
	if err := p.pool.QueryRow(ctx, `SELECT last_block FROM destination_transfer_indexer_state WHERE id = 1`).Scan(&lastBlock); err != nil {
		return err
	}
	head, err := p.client.BlockNumber(ctx)
	if err != nil {
		return err
	}
	if head < 4 {
		return nil
	}
	to := int64(head - 3)
	from := lastBlock + 1
	if from <= 0 {
		from = to - 1500
		if from < 1 {
			from = 1
		}
	}
	if from > to {
		return nil
	}
	transferSig := crypto.Keccak256Hash([]byte("Transfer(address,address,uint256)"))
	query := ethereum.FilterQuery{
		FromBlock: big.NewInt(from),
		ToBlock:   big.NewInt(to),
		Addresses: []common.Address{p.usdcToken},
		Topics:    [][]common.Hash{{transferSig}},
	}
	logs, err := p.client.FilterLogs(ctx, query)
	if err != nil {
		return err
	}
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, lg := range logs {
		if len(lg.Topics) < 3 || len(lg.Data) == 0 {
			continue
		}
		fromAddr := common.HexToAddress(lg.Topics[1].Hex()).Hex()
		toAddr := common.HexToAddress(lg.Topics[2].Hex()).Hex()
		if !strings.EqualFold(toAddr, p.receiver.Hex()) {
			continue
		}
		amount := new(big.Int).SetBytes(lg.Data).String()
		_, err = tx.Exec(ctx, `
INSERT INTO destination_usdc_transfers (
    chain_id, token_address, tx_hash, log_index, from_address, to_address, amount, block_number, block_timestamp,
    credit_status, provenance, match_metadata
) VALUES ($1, LOWER($2), LOWER($3), $4, LOWER($5), LOWER($6), $7::numeric, $8, NOW(), 'UNMATCHED', 'POLLER', '{}'::jsonb)
ON CONFLICT (chain_id, tx_hash, log_index) DO UPDATE
SET provenance = CASE WHEN destination_usdc_transfers.provenance = 'WEBHOOK' THEN 'MERGED' ELSE destination_usdc_transfers.provenance END
`, p.settlementChainID, p.usdcToken.Hex(), lg.TxHash.Hex(), int64(lg.Index), fromAddr, toAddr, amount, lg.BlockNumber)
		if err != nil {
			return err
		}
	}
	_, err = tx.Exec(ctx, `
UPDATE destination_transfer_indexer_state
SET last_block = $2, updated_at = NOW()
WHERE id = $1
`, 1, to)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
