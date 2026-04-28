package indexer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/big"
	"os"
	"strconv"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/abiembed"
	"retropick/apps/backend/internal/dbqueries"
)

const notifyChannel = "market_update"

type Service struct {
	pool   *pgxpool.Pool
	client *ethclient.Client
	proxy  common.Address
	abi    abi.ABI
	log    *slog.Logger
}

func NewService(pool *pgxpool.Pool, client *ethclient.Client, proxyHex string, log *slog.Logger) (*Service, error) {
	if !common.IsHexAddress(proxyHex) {
		return nil, fmt.Errorf("invalid proxy address %q", proxyHex)
	}
	parsed, err := abi.JSON(bytes.NewReader(abiembed.MarketEngineDispatcherJSON))
	if err != nil {
		return nil, fmt.Errorf("dispatcher abi: %w", err)
	}
	return &Service{
		pool:   pool,
		client: client,
		proxy:  common.HexToAddress(proxyHex),
		abi:    parsed,
		log:    log,
	}, nil
}

// SyncOnce advances the indexer by up to maxBlocks from the last stored block.
func (s *Service) SyncOnce(ctx context.Context, maxBlocks uint64) error {
	st := dbqueries.New(s.pool)
	state, err := st.GetIndexerState(ctx)
	if err != nil {
		return fmt.Errorf("indexer state: %w", err)
	}
	head, err := s.client.BlockNumber(ctx)
	if err != nil {
		return fmt.Errorf("block number: %w", err)
	}
	from := uint64(state.LastBlock) + 1
	if state.LastBlock == 0 {
		lookback := uint64(50_000)
		if v := os.Getenv("INDEXER_LOOKBACK_BLOCKS"); v != "" {
			if n, err := strconv.ParseUint(v, 10, 64); err == nil && n > 0 {
				lookback = n
			}
		}
		if head > lookback {
			from = head - lookback
		} else {
			from = 1
		}
	}
	if from > head {
		return nil
	}
	to := from + maxBlocks - 1
	if to > head {
		to = head
	}

	query := ethereum.FilterQuery{
		FromBlock: new(big.Int).SetUint64(from),
		ToBlock:   new(big.Int).SetUint64(to),
		Addresses: []common.Address{s.proxy},
	}
	logs, err := s.client.FilterLogs(ctx, query)
	if err != nil {
		return fmt.Errorf("filter logs: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	q := dbqueries.New(tx)

	for _, lg := range logs {
		if err := s.handleLog(ctx, q, lg); err != nil {
			return fmt.Errorf("log %s:%d: %w", lg.TxHash.Hex(), lg.Index, err)
		}
	}

	hdr, err := s.client.HeaderByNumber(ctx, new(big.Int).SetUint64(to))
	if err != nil {
		return fmt.Errorf("header %d: %w", to, err)
	}
	hash := hdr.Hash().Hex()
	if err := q.UpdateIndexerState(ctx, dbqueries.UpdateIndexerStateParams{
		LastBlock:     int64(to),
		LastBlockHash: pgtype.Text{String: hash, Valid: true},
		ReorgDepth:    0,
	}); err != nil {
		return err
	}

	summary, _ := json.Marshal(map[string]any{
		"type":        "indexer_tick",
		"fromBlock":   from,
		"toBlock":     to,
		"logsIndexed": len(logs),
	})
	if _, err := tx.Exec(ctx, `SELECT pg_notify($1, $2)`, notifyChannel, string(summary)); err != nil {
		return fmt.Errorf("notify: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if s.log != nil {
		s.log.Info("indexer tick", "from", from, "to", to, "logs", len(logs))
	}
	return nil
}

func (s *Service) handleLog(ctx context.Context, q *dbqueries.Queries, lg types.Log) error {
	ev, err := s.abi.EventByID(lg.Topics[0])
	if err != nil {
		return s.recordChainEvent(ctx, q, lg, "Unknown", nil, nil, nil, map[string]any{"raw": lg.Topics[0].Hex()})
	}

	payload := map[string]any{"event": ev.Name}
	if err := mergeUserEventPayload(ev, lg, payload); err != nil {
		return err
	}
	tpl, epoch := templateEpochFromTopics(lg)
	userAddr := indexedUserAddress(ev.Name, lg)

	if err := s.recordChainEvent(ctx, q, lg, ev.Name, tpl, epoch, userAddr, payload); err != nil {
		return err
	}

	switch ev.Name {
	case "TemplateUpserted":
		return s.onTemplateUpserted(ctx, q, lg, ev)
	case "MarketInitialized":
		return s.onMarketInitialized(ctx, q, lg)
	case "EpochOpened":
		return s.onEpochOpened(ctx, q, lg, ev)
	case "EpochLocked", "EpochLockedV2":
		return s.onEpochLocked(ctx, q, lg)
	case "EpochResolved":
		return s.onEpochResolved(ctx, q, lg, ev)
	case "EpochResolvedV2":
		return s.onEpochResolvedV2(ctx, q, lg)
	case "RollingHalted":
		return s.onRollingHalted(ctx, q, lg, ev)
	default:
		return nil
	}
}

func templateEpochFromTopics(lg types.Log) (tpl *[]byte, epoch *int64) {
	if len(lg.Topics) < 2 {
		return nil, nil
	}
	t := lg.Topics[1].Bytes()
	tpl = &t
	if len(lg.Topics) >= 3 {
		e := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
		epoch = &e
	}
	return tpl, epoch
}

// mergeUserEventPayload decodes non-indexed log data into the chain_events JSON payload
// for user-facing market events (amounts, outcomes, switch paths).
func mergeUserEventPayload(ev *abi.Event, lg types.Log, payload map[string]any) error {
	if ev == nil || len(lg.Data) == 0 {
		return nil
	}
	switch ev.Name {
	case "PositionDeposited", "SideSwitched", "Claimed":
		// ok
	default:
		return nil
	}
	vars, err := ev.Inputs.Unpack(lg.Data)
	if err != nil {
		return fmt.Errorf("unpack %s data: %w", ev.Name, err)
	}
	switch ev.Name {
	case "PositionDeposited":
		if len(vars) >= 2 {
			// non-indexed: outcome (uint8), amount (uint256)
			oi, ok0 := toUint8ish(vars[0])
			amt, ok1 := vars[1].(*big.Int)
			if ok0 && ok1 {
				payload["outcomeIndex"] = oi
				payload["amount"] = amt.String()
			}
		}
	case "Claimed":
		if len(vars) >= 1 {
			if amt, ok := vars[0].(*big.Int); ok {
				payload["amount"] = amt.String()
			}
		}
	case "SideSwitched":
		// fromOutcome, toOutcome, grossAmount, feeAmount, netAmount
		if len(vars) >= 5 {
			fromO, ok0 := toUint8ish(vars[0])
			toO, ok1 := toUint8ish(vars[1])
			gross, ok2 := vars[2].(*big.Int)
			fee, ok3 := vars[3].(*big.Int)
			net, ok4 := vars[4].(*big.Int)
			if ok0 && ok1 && ok2 && ok3 && ok4 {
				payload["fromOutcome"] = fromO
				payload["toOutcome"] = toO
				payload["grossAmount"] = gross.String()
				payload["feeAmount"] = fee.String()
				payload["netAmount"] = net.String()
			}
		}
	}
	return nil
}

func toUint8ish(v any) (uint8, bool) {
	switch x := v.(type) {
	case uint8: // byte is an alias of uint8; a separate case would be a duplicate
		return x, true
	case *big.Int:
		if x == nil {
			return 0, false
		}
		return uint8(x.Uint64()), true
	default:
		return 0, false
	}
}

// indexedUserAddress extracts the user topic for events that index `user` as topics[3].
func indexedUserAddress(evName string, lg types.Log) *string {
	switch evName {
	case "PositionDeposited", "Claimed", "SideSwitched":
		if len(lg.Topics) < 4 {
			return nil
		}
		addr := common.BytesToAddress(lg.Topics[3][12:])
		h := addr.Hex()
		return &h
	default:
		return nil
	}
}

func (s *Service) recordChainEvent(ctx context.Context, q *dbqueries.Queries, lg types.Log, name string, templateID *[]byte, epochID *int64, user *string, payload map[string]any) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var tid []byte
	if templateID != nil {
		tid = *templateID
	}
	var eid pgtype.Int8
	if epochID != nil {
		eid = pgtype.Int8{Int64: *epochID, Valid: true}
	}
	var ua pgtype.Text
	if user != nil {
		ua = pgtype.Text{String: *user, Valid: true}
	}
	return q.InsertChainEvent(ctx, dbqueries.InsertChainEventParams{
		BlockNumber:  int64(lg.BlockNumber),
		TxHash:       lg.TxHash.Hex(),
		LogIndex:     int32(lg.Index),
		ContractAddr: lg.Address.Hex(),
		EventName:    name,
		TemplateID:   tid,
		EpochID:      eid,
		UserAddress:  ua,
		Payload:      b,
	})
}

func (s *Service) onTemplateUpserted(ctx context.Context, q *dbqueries.Queries, lg types.Log, ev *abi.Event) error {
	vars, err := ev.Inputs.Unpack(lg.Data)
	if err != nil {
		return err
	}
	slug := vars[0].(string)
	marketType := int16(vars[1].(uint8))
	outcomeCount := int16(vars[2].(uint8))
	maxDelay := vars[3].(uint64)
	maxConf := int32(vars[4].(uint16))
	tid := lg.Topics[1].Bytes()
	return q.UpsertTemplateFromUpsert(ctx, dbqueries.UpsertTemplateFromUpsertParams{
		TemplateID:             tid,
		Slug:                   slug,
		MarketType:             marketType,
		OutcomeCount:           outcomeCount,
		OracleMaxDelaySeconds:  int64(maxDelay),
		OracleMaxConfidenceBps: maxConf,
	})
}

func (s *Service) onMarketInitialized(ctx context.Context, q *dbqueries.Queries, lg types.Log) error {
	tid := lg.Topics[1].Bytes()
	if err := q.UpsertLedgerRow(ctx, tid); err != nil {
		return err
	}
	return q.SetTemplateInitialized(ctx, tid)
}

func (s *Service) onEpochOpened(ctx context.Context, q *dbqueries.Queries, lg types.Log, ev *abi.Event) error {
	vars, err := ev.Inputs.Unpack(lg.Data)
	if err != nil {
		return err
	}
	openAt := vars[0].(uint64)
	lockAt := vars[1].(uint64)
	resolveAt := vars[2].(uint64)
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	if err := q.UpsertEpochOpened(ctx, dbqueries.UpsertEpochOpenedParams{
		TemplateID: tid,
		EpochID:    eid,
		OpenAt:     pgtype.Timestamptz{Time: time.Unix(int64(openAt), 0).UTC(), Valid: true},
		LockAt:     pgtype.Timestamptz{Time: time.Unix(int64(lockAt), 0).UTC(), Valid: true},
		ResolveAt:  pgtype.Timestamptz{Time: time.Unix(int64(resolveAt), 0).UTC(), Valid: true},
		OpenTxHash: pgtype.Text{String: lg.TxHash.Hex(), Valid: true},
	}); err != nil {
		return err
	}
	return q.UpdateLedgerActiveEpoch(ctx, dbqueries.UpdateLedgerActiveEpochParams{
		TemplateID:    tid,
		ActiveEpochID: eid,
	})
}

func (s *Service) onEpochLocked(ctx context.Context, q *dbqueries.Queries, lg types.Log) error {
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	return q.UpdateEpochLocked(ctx, dbqueries.UpdateEpochLockedParams{
		TemplateID: tid,
		EpochID:    eid,
		LockTxHash: pgtype.Text{String: lg.TxHash.Hex(), Valid: true},
	})
}

func (s *Service) onEpochResolved(ctx context.Context, q *dbqueries.Queries, lg types.Log, ev *abi.Event) error {
	vars, err := ev.Inputs.Unpack(lg.Data)
	if err != nil {
		return err
	}
	winning := vars[0].(*big.Int)
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	refund := vars[3].(bool)
	mask := int32(winning.Int64())
	if err := q.UpdateEpochResolved(ctx, dbqueries.UpdateEpochResolvedParams{
		TemplateID:         tid,
		EpochID:            eid,
		ResolveTxHash:      pgtype.Text{String: lg.TxHash.Hex(), Valid: true},
		WinningOutcomeMask: pgtype.Int4{Int32: mask, Valid: true},
		RefMode:            refund,
	}); err != nil {
		return err
	}
	return q.UpdateLedgerAfterResolve(ctx, dbqueries.UpdateLedgerAfterResolveParams{
		TemplateID:          tid,
		LastResolvedEpochID: eid,
	})
}

func (s *Service) onEpochResolvedV2(ctx context.Context, q *dbqueries.Queries, lg types.Log) error {
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	if err := q.UpdateEpochResolvedCheckpointOnly(ctx, dbqueries.UpdateEpochResolvedCheckpointOnlyParams{
		TemplateID:    tid,
		EpochID:       eid,
		ResolveTxHash: pgtype.Text{String: lg.TxHash.Hex(), Valid: true},
	}); err != nil {
		return err
	}
	return q.UpdateLedgerAfterResolve(ctx, dbqueries.UpdateLedgerAfterResolveParams{
		TemplateID:          tid,
		LastResolvedEpochID: eid,
	})
}

func (s *Service) onRollingHalted(ctx context.Context, q *dbqueries.Queries, lg types.Log, ev *abi.Event) error {
	vars, err := ev.Inputs.Unpack(lg.Data)
	if err != nil {
		return err
	}
	reason := int16(vars[0].(uint8))
	haltedAt := vars[1].(uint64)
	tid := lg.Topics[1].Bytes()
	if err := q.UpdateRollingHalted(ctx, dbqueries.UpdateRollingHaltedParams{
		TemplateID:        tid,
		RollingHaltReason: reason,
	}); err != nil {
		return err
	}
	return q.UpdateLedgerHaltedAt(ctx, dbqueries.UpdateLedgerHaltedAtParams{
		TemplateID:      tid,
		HaltedAtEpochID: pgtype.Int8{Int64: int64(haltedAt), Valid: true},
	})
}
