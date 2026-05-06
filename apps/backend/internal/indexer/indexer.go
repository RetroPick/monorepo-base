package indexer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math/big"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/abiembed"
	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/realtime"
)

type Service struct {
	pool   *pgxpool.Pool
	client *ethclient.Client
	proxy  common.Address
	abi    abi.ABI
	log    *slog.Logger
}

type projectionEventMeta struct {
	Seq         int64
	BlockNumber int64
	TxHash      string
	LogIndex    int32
	IndexedAt   time.Time
}

type projectionOutcomeState struct {
	Index          int16
	PoolAmount     *big.Int
	ProbabilityBps int32
	MultiplierBps  int32
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
	finalityDepth := uint64(3)
	if raw := strings.TrimSpace(os.Getenv("INDEXER_FINALITY_DEPTH")); raw != "" {
		if n, parseErr := strconv.ParseUint(raw, 10, 64); parseErr == nil {
			finalityDepth = n
		}
	}
	if head <= finalityDepth {
		return nil
	}
	stableHead := head - finalityDepth
	if state.LastBlock > 0 && state.LastBlockHash.Valid {
		prevHdr, err := s.client.HeaderByNumber(ctx, big.NewInt(state.LastBlock))
		if err != nil {
			return fmt.Errorf("header continuity check: %w", err)
		}
		if !strings.EqualFold(prevHdr.Hash().Hex(), state.LastBlockHash.String) {
			rewindDepth := int64(64)
			rewindTo := state.LastBlock - rewindDepth
			if rewindTo < 0 {
				rewindTo = 0
			}
			tx, err := s.pool.Begin(ctx)
			if err != nil {
				return err
			}
			defer tx.Rollback(ctx)
			if _, err := tx.Exec(ctx, `DELETE FROM chain_events WHERE block_number > $1`, rewindTo); err != nil {
				return fmt.Errorf("reorg delete chain_events: %w", err)
			}
			if _, err := tx.Exec(ctx, `TRUNCATE market_epoch_outcomes, market_snapshots, market_read_models, probability_points, user_position_outcomes`); err != nil {
				return fmt.Errorf("reorg truncate projections: %w", err)
			}
			if _, err := tx.Exec(ctx, `
UPDATE indexer_state
SET last_block = $1, last_block_hash = NULL, reorg_depth = $2, last_indexed_at = NOW()
WHERE id = 1
`, rewindTo, state.LastBlock-rewindTo); err != nil {
				return fmt.Errorf("reorg rewind indexer_state: %w", err)
			}
			if err := tx.Commit(ctx); err != nil {
				return err
			}
			return fmt.Errorf("reorg detected; rewound to block %d", rewindTo)
		}
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
	if from > stableHead {
		return nil
	}
	to := from + maxBlocks - 1
	if to > stableHead {
		to = stableHead
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
	realtimeSeqs := make([]int64, 0, len(logs)+1)

	for _, lg := range logs {
		if err := s.handleLog(ctx, tx, q, &realtimeSeqs, lg); err != nil {
			return fmt.Errorf("log %s:%d: %w", lg.TxHash.Hex(), lg.Index, err)
		}
	}

	templateSet := make(map[string]struct{})
	for _, lg := range logs {
		tpl, _ := templateEpochFromTopics(lg)
		if tpl != nil && len(*tpl) == 32 {
			id := strings.ToLower(common.BytesToHash(*tpl).Hex())
			templateSet[id] = struct{}{}
		}
	}
	templateIDs := make([]string, 0, len(templateSet))
	for id := range templateSet {
		templateIDs = append(templateIDs, id)
	}
	sort.Strings(templateIDs)

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

	if len(logs) > 0 {
		summaryObj := map[string]any{
			"type":        "indexer_tick",
			"fromBlock":   from,
			"toBlock":     to,
			"logsIndexed": len(logs),
		}
		if len(templateIDs) == 1 {
			summaryObj["templateId"] = templateIDs[0]
		}
		if len(templateIDs) > 0 {
			summaryObj["templateIds"] = templateIDs
		}
		if err := s.insertRealtimeEvent(ctx, tx, &realtimeSeqs, realtime.InsertEvent{
			Channel:   "global:markets",
			Type:      "indexer_tick",
			Scope:     "public",
			Payload:   summaryObj,
			DedupeKey: fmt.Sprintf("tick:%d:%d", from, to),
		}); err != nil {
			return err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	if s.log != nil {
		s.log.Info("indexer tick", "from", from, "to", to, "logs", len(logs))
	}
	for _, seq := range realtimeSeqs {
		if err := realtime.Notify(ctx, s.pool, seq); err != nil && s.log != nil {
			s.log.Warn("notify realtime event", "seq", seq, "err", err)
		}
	}
	return nil
}

func (s *Service) handleLog(ctx context.Context, tx pgx.Tx, q *dbqueries.Queries, realtimeSeqs *[]int64, lg types.Log) error {
	ev, err := s.abi.EventByID(lg.Topics[0])
	if err != nil {
		_, err := s.recordChainEvent(ctx, tx, lg, "Unknown", nil, nil, nil, map[string]any{"raw": lg.Topics[0].Hex()})
		return err
	}

	payload := map[string]any{"event": ev.Name}
	if err := mergeUserEventPayload(ev, lg, payload); err != nil {
		return err
	}
	tpl, epoch := templateEpochFromTopics(lg)
	userAddr := indexedUserAddress(ev.Name, lg)

	inserted, err := s.recordChainEvent(ctx, tx, lg, ev.Name, tpl, epoch, userAddr, payload)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	switch ev.Name {
	case "TemplateUpserted":
		return s.onTemplateUpserted(ctx, q, lg, ev)
	case "MarketInitialized":
		return s.onMarketInitialized(ctx, q, lg)
	case "EpochOpened":
		return s.onEpochOpened(ctx, tx, q, realtimeSeqs, lg, ev)
	case "EpochLocked", "EpochLockedV2":
		return s.onEpochLocked(ctx, tx, q, realtimeSeqs, lg)
	case "EpochResolved":
		return s.onEpochResolved(ctx, tx, q, realtimeSeqs, lg, ev)
	case "EpochResolvedV2":
		return s.onEpochResolvedV2(ctx, tx, q, realtimeSeqs, lg)
	case "PositionDeposited":
		return s.onPositionDeposited(ctx, tx, realtimeSeqs, lg, payload)
	case "SideSwitched":
		return s.onSideSwitched(ctx, tx, realtimeSeqs, lg, payload)
	case "Claimed":
		return s.onClaimed(ctx, tx, realtimeSeqs, lg, payload)
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

func (s *Service) recordChainEvent(ctx context.Context, tx pgx.Tx, lg types.Log, name string, templateID *[]byte, epochID *int64, user *string, payload map[string]any) (bool, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return false, err
	}
	var tid []byte
	if templateID != nil {
		tid = *templateID
	}
	var eid any
	if epochID != nil {
		eid = *epochID
	}
	var ua any
	if user != nil {
		ua = *user
	}
	tag, err := tx.Exec(ctx, `
INSERT INTO chain_events (
    block_number, tx_hash, log_index, contract_addr, event_name,
    template_id, epoch_id, user_address, payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (tx_hash, log_index) DO NOTHING
`, int64(lg.BlockNumber), lg.TxHash.Hex(), int32(lg.Index), lg.Address.Hex(), name, tid, eid, ua, string(b))
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
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

func (s *Service) onEpochOpened(ctx context.Context, tx pgx.Tx, q *dbqueries.Queries, realtimeSeqs *[]int64, lg types.Log, ev *abi.Event) error {
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
	if err := q.UpdateLedgerActiveEpoch(ctx, dbqueries.UpdateLedgerActiveEpochParams{
		TemplateID:    tid,
		ActiveEpochID: eid,
	}); err != nil {
		return err
	}
	if err := s.initializeProjection(ctx, tx, tid, eid, int64(lg.BlockNumber), "open"); err != nil {
		return err
	}
	return s.emitProjectionEvent(ctx, tx, realtimeSeqs, "epoch_opened", tid, eid, lg)
}

func (s *Service) onEpochLocked(ctx context.Context, tx pgx.Tx, q *dbqueries.Queries, realtimeSeqs *[]int64, lg types.Log) error {
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	if err := q.UpdateEpochLocked(ctx, dbqueries.UpdateEpochLockedParams{
		TemplateID: tid,
		EpochID:    eid,
		LockTxHash: pgtype.Text{String: lg.TxHash.Hex(), Valid: true},
	}); err != nil {
		return err
	}
	if err := s.updateSnapshotStatus(ctx, tx, tid, eid, "locked", int64(lg.BlockNumber)); err != nil {
		return err
	}
	return s.emitProjectionEvent(ctx, tx, realtimeSeqs, "epoch_locked", tid, eid, lg)
}

func (s *Service) onEpochResolved(ctx context.Context, tx pgx.Tx, q *dbqueries.Queries, realtimeSeqs *[]int64, lg types.Log, ev *abi.Event) error {
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
	if err := q.UpdateLedgerAfterResolve(ctx, dbqueries.UpdateLedgerAfterResolveParams{
		TemplateID:          tid,
		LastResolvedEpochID: eid,
	}); err != nil {
		return err
	}
	if err := s.updateSnapshotStatus(ctx, tx, tid, eid, "resolved", int64(lg.BlockNumber)); err != nil {
		return err
	}
	return s.emitProjectionEvent(ctx, tx, realtimeSeqs, "epoch_resolved", tid, eid, lg)
}

func (s *Service) onEpochResolvedV2(ctx context.Context, tx pgx.Tx, q *dbqueries.Queries, realtimeSeqs *[]int64, lg types.Log) error {
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	if err := q.UpdateEpochResolvedCheckpointOnly(ctx, dbqueries.UpdateEpochResolvedCheckpointOnlyParams{
		TemplateID:    tid,
		EpochID:       eid,
		ResolveTxHash: pgtype.Text{String: lg.TxHash.Hex(), Valid: true},
	}); err != nil {
		return err
	}
	if err := q.UpdateLedgerAfterResolve(ctx, dbqueries.UpdateLedgerAfterResolveParams{
		TemplateID:          tid,
		LastResolvedEpochID: eid,
	}); err != nil {
		return err
	}
	if err := s.updateSnapshotStatus(ctx, tx, tid, eid, "resolved", int64(lg.BlockNumber)); err != nil {
		return err
	}
	return s.emitProjectionEvent(ctx, tx, realtimeSeqs, "epoch_resolved", tid, eid, lg)
}

func (s *Service) onPositionDeposited(ctx context.Context, tx pgx.Tx, realtimeSeqs *[]int64, lg types.Log, payload map[string]any) error {
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	user := indexedUserAddress("PositionDeposited", lg)
	outcome, ok0 := payloadUint(payload["outcomeIndex"])
	amount, ok1 := payloadBig(payload["amount"])
	if !ok0 || !ok1 {
		return nil
	}
	if err := s.addOutcomePool(ctx, tx, tid, eid, int16(outcome), amount, int64(lg.BlockNumber)); err != nil {
		return err
	}
	if err := s.addTradedVolume(ctx, tx, tid, amount, int64(lg.BlockNumber)); err != nil {
		return err
	}
	if err := s.recomputeProjection(ctx, tx, tid, eid, projectionEventMetaFromLog(lg)); err != nil {
		return err
	}
	if user != nil {
		if err := s.addUserPosition(ctx, tx, strings.ToLower(*user), tid, eid, int16(outcome), amount, int64(lg.BlockNumber)); err != nil {
			return err
		}
		if err := s.emitUserPositionEvent(ctx, tx, realtimeSeqs, "position_update", strings.ToLower(*user), tid, eid, lg); err != nil {
			return err
		}
	}
	return s.emitProjectionEvent(ctx, tx, realtimeSeqs, "pool_update", tid, eid, lg)
}

func (s *Service) onSideSwitched(ctx context.Context, tx pgx.Tx, realtimeSeqs *[]int64, lg types.Log, payload map[string]any) error {
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	user := indexedUserAddress("SideSwitched", lg)
	from, ok0 := payloadUint(payload["fromOutcome"])
	to, ok1 := payloadUint(payload["toOutcome"])
	gross, ok2 := payloadBig(payload["grossAmount"])
	net, ok3 := payloadBig(payload["netAmount"])
	if !ok0 || !ok1 || !ok2 || !ok3 {
		return nil
	}
	if err := s.addOutcomePool(ctx, tx, tid, eid, int16(from), new(big.Int).Neg(gross), int64(lg.BlockNumber)); err != nil {
		return err
	}
	if err := s.addOutcomePool(ctx, tx, tid, eid, int16(to), net, int64(lg.BlockNumber)); err != nil {
		return err
	}
	if err := s.addTradedVolume(ctx, tx, tid, gross, int64(lg.BlockNumber)); err != nil {
		return err
	}
	if err := s.recomputeProjection(ctx, tx, tid, eid, projectionEventMetaFromLog(lg)); err != nil {
		return err
	}
	if user != nil {
		u := strings.ToLower(*user)
		if err := s.addUserPosition(ctx, tx, u, tid, eid, int16(from), new(big.Int).Neg(gross), int64(lg.BlockNumber)); err != nil {
			return err
		}
		if err := s.addUserPosition(ctx, tx, u, tid, eid, int16(to), net, int64(lg.BlockNumber)); err != nil {
			return err
		}
		if err := s.emitUserPositionEvent(ctx, tx, realtimeSeqs, "position_update", u, tid, eid, lg); err != nil {
			return err
		}
	}
	return s.emitProjectionEvent(ctx, tx, realtimeSeqs, "pool_update", tid, eid, lg)
}

func (s *Service) onClaimed(ctx context.Context, tx pgx.Tx, realtimeSeqs *[]int64, lg types.Log, payload map[string]any) error {
	tid := lg.Topics[1].Bytes()
	eid := new(big.Int).SetBytes(lg.Topics[2].Bytes()).Int64()
	user := indexedUserAddress("Claimed", lg)
	if user != nil {
		amount, _ := payloadBig(payload["amount"])
		if err := s.markUserClaimed(ctx, tx, strings.ToLower(*user), tid, eid, amount, int64(lg.BlockNumber)); err != nil {
			return err
		}
		if err := s.emitUserPositionEvent(ctx, tx, realtimeSeqs, "claim_confirmed", strings.ToLower(*user), tid, eid, lg); err != nil {
			return err
		}
	}
	return s.emitProjectionEvent(ctx, tx, realtimeSeqs, "claim_update", tid, eid, lg)
}

func (s *Service) initializeProjection(ctx context.Context, tx pgx.Tx, tid []byte, eid int64, block int64, status string) error {
	var outcomeCount int16
	if err := tx.QueryRow(ctx, `SELECT outcome_count FROM templates WHERE template_id = $1`, tid).Scan(&outcomeCount); err != nil {
		return err
	}
	if outcomeCount < 2 {
		outcomeCount = 2
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO market_snapshots (template_id, active_epoch_id, status, outcome_count, last_indexed_block)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (template_id) DO UPDATE SET
    active_epoch_id = EXCLUDED.active_epoch_id,
    status = EXCLUDED.status,
    outcome_count = EXCLUDED.outcome_count,
    total_pool = 0,
    volume = 0,
    last_indexed_block = EXCLUDED.last_indexed_block,
    updated_at = NOW()
`, tid, eid, status, outcomeCount, block); err != nil {
		return err
	}
	for i := int16(0); i < outcomeCount; i++ {
		if _, err := tx.Exec(ctx, `
INSERT INTO market_epoch_outcomes (template_id, epoch_id, outcome_index, pool_amount, updated_block)
VALUES ($1, $2, $3, 0, $4)
ON CONFLICT (template_id, epoch_id, outcome_index) DO UPDATE SET
    pool_amount = 0,
    probability_bps = 0,
    multiplier_bps = 0,
    updated_block = EXCLUDED.updated_block,
    updated_at = NOW()
`, tid, eid, i, block); err != nil {
			return err
		}
	}
	return s.recomputeProjection(ctx, tx, tid, eid, projectionEventMeta{BlockNumber: block})
}

func (s *Service) updateSnapshotStatus(ctx context.Context, tx pgx.Tx, tid []byte, eid int64, status string, block int64) error {
	_, err := tx.Exec(ctx, `
UPDATE market_snapshots
SET status = $3, last_indexed_block = $4, updated_at = NOW()
WHERE template_id = $1 AND active_epoch_id = $2
`, tid, eid, status, block)
	return err
}

func (s *Service) addOutcomePool(ctx context.Context, tx pgx.Tx, tid []byte, eid int64, outcome int16, delta *big.Int, block int64) error {
	if delta == nil {
		return nil
	}
	if _, err := tx.Exec(ctx, `
INSERT INTO market_epoch_outcomes (template_id, epoch_id, outcome_index, pool_amount, updated_block)
VALUES ($1, $2, $3, GREATEST(0::numeric, $4::numeric), $5)
ON CONFLICT (template_id, epoch_id, outcome_index) DO UPDATE SET
    pool_amount = GREATEST(0::numeric, market_epoch_outcomes.pool_amount + $4::numeric),
    updated_block = EXCLUDED.updated_block,
    updated_at = NOW()
`, tid, eid, outcome, delta.String(), block); err != nil {
		return err
	}
	return nil
}

func (s *Service) addTradedVolume(ctx context.Context, tx pgx.Tx, tid []byte, delta *big.Int, block int64) error {
	if delta == nil || delta.Sign() <= 0 {
		return nil
	}
	_, err := tx.Exec(ctx, `
UPDATE market_snapshots
SET volume = market_snapshots.volume + $2::numeric,
    last_indexed_block = GREATEST(market_snapshots.last_indexed_block, $3),
    updated_at = NOW()
WHERE template_id = $1
`, tid, delta.String(), block)
	return err
}

func (s *Service) addUserPosition(ctx context.Context, tx pgx.Tx, user string, tid []byte, eid int64, outcome int16, delta *big.Int, block int64) error {
	if delta == nil || user == "" {
		return nil
	}
	_, err := tx.Exec(ctx, `
INSERT INTO user_position_outcomes (user_address, template_id, epoch_id, outcome_index, stake_amount, updated_block)
VALUES ($1, $2, $3, $4, GREATEST(0::numeric, $5::numeric), $6)
ON CONFLICT (user_address, template_id, epoch_id, outcome_index) DO UPDATE SET
    stake_amount = GREATEST(0::numeric, user_position_outcomes.stake_amount + $5::numeric),
    updated_block = EXCLUDED.updated_block,
    updated_at = NOW()
`, user, tid, eid, outcome, delta.String(), block)
	return err
}

func (s *Service) markUserClaimed(ctx context.Context, tx pgx.Tx, user string, tid []byte, eid int64, amount *big.Int, block int64) error {
	if user == "" {
		return nil
	}
	claimed := "0"
	if amount != nil {
		claimed = amount.String()
	}
	_, err := tx.Exec(ctx, `
UPDATE user_position_outcomes
SET claimed = TRUE,
    claimed_amount = CASE WHEN $4::numeric > 0 THEN $4::numeric ELSE claimed_amount END,
    updated_block = $5,
    updated_at = NOW()
WHERE user_address = $1 AND template_id = $2 AND epoch_id = $3
`, user, tid, eid, claimed, block)
	return err
}

func (s *Service) recomputeProjection(ctx context.Context, tx pgx.Tx, tid []byte, eid int64, meta projectionEventMeta) error {
	rows, err := tx.Query(ctx, `
SELECT outcome_index, pool_amount::text
FROM market_epoch_outcomes
WHERE template_id = $1 AND epoch_id = $2
ORDER BY outcome_index
`, tid, eid)
	if err != nil {
		return err
	}
	defer rows.Close()

	var outcomes []projectionOutcomeState
	total := new(big.Int)
	for rows.Next() {
		var idx int16
		var amountText string
		if err := rows.Scan(&idx, &amountText); err != nil {
			return err
		}
		amount, ok := new(big.Int).SetString(amountText, 10)
		if !ok {
			amount = new(big.Int)
		}
		outcomes = append(outcomes, projectionOutcomeState{Index: idx, PoolAmount: amount})
		total.Add(total, amount)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	count := int64(len(outcomes))
	if count == 0 {
		return nil
	}
	prev, err := s.loadProjectionOutcomeStates(ctx, tx, tid, eid)
	if err != nil {
		return err
	}
	next := computeProjectionOutcomes(outcomes)
	for _, outcome := range next {
		if _, err := tx.Exec(ctx, `
UPDATE market_epoch_outcomes
SET probability_bps = $4, multiplier_bps = $5, updated_block = $6, updated_at = NOW()
WHERE template_id = $1 AND epoch_id = $2 AND outcome_index = $3
`, tid, eid, outcome.Index, outcome.ProbabilityBps, outcome.MultiplierBps, meta.BlockNumber); err != nil {
			return err
		}
	}
	if probabilityPointNeeded(prev, next) {
		if err := s.appendProbabilityPoint(ctx, tx, tid, eid, total, next, meta); err != nil {
			return err
		}
	}
	var status string
	var volumeText string
	if err := tx.QueryRow(ctx, `
SELECT status, volume::text
FROM market_snapshots
WHERE template_id = $1
`, tid).Scan(&status, &volumeText); err != nil {
		return err
	}
	outcomesJSON, err := marshalProjectionOutcomes(next)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
INSERT INTO market_snapshots (template_id, active_epoch_id, status, total_pool, volume, outcome_count, last_indexed_block)
VALUES ($1, $2, $3, $4::numeric, $5::numeric, $6, $7)
ON CONFLICT (template_id) DO UPDATE SET
    active_epoch_id = EXCLUDED.active_epoch_id,
    status = EXCLUDED.status,
    total_pool = EXCLUDED.total_pool,
    volume = EXCLUDED.volume,
    outcome_count = EXCLUDED.outcome_count,
    last_indexed_block = EXCLUDED.last_indexed_block,
    updated_at = NOW()
`, tid, eid, status, total.String(), volumeText, int16(count), meta.BlockNumber)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
INSERT INTO market_read_models (
    template_id, slug, market_type, initialized, execution_mode, rolling_phase, rolling_halt_reason,
    active_epoch_id, last_resolved_epoch_id, rolling_next_epoch_id, halted_at_epoch_id,
    status, total_pool, volume, outcome_count, outcomes_json, last_indexed_block, updated_at
)
SELECT
    t.template_id, t.slug, t.market_type, t.initialized, t.execution_mode, t.rolling_phase, t.rolling_halt_reason,
    COALESCE(l.active_epoch_id, $2), l.last_resolved_epoch_id, l.rolling_next_epoch_id, l.halted_at_epoch_id,
    $3, $4::numeric, $5::numeric, $6, $7::jsonb, $8, NOW()
FROM templates t
LEFT JOIN ledgers l ON l.template_id = t.template_id
WHERE t.template_id = $1
ON CONFLICT (template_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    market_type = EXCLUDED.market_type,
    initialized = EXCLUDED.initialized,
    execution_mode = EXCLUDED.execution_mode,
    rolling_phase = EXCLUDED.rolling_phase,
    rolling_halt_reason = EXCLUDED.rolling_halt_reason,
    active_epoch_id = EXCLUDED.active_epoch_id,
    last_resolved_epoch_id = EXCLUDED.last_resolved_epoch_id,
    rolling_next_epoch_id = EXCLUDED.rolling_next_epoch_id,
    halted_at_epoch_id = EXCLUDED.halted_at_epoch_id,
    status = EXCLUDED.status,
    total_pool = EXCLUDED.total_pool,
    volume = EXCLUDED.volume,
    outcome_count = EXCLUDED.outcome_count,
    outcomes_json = EXCLUDED.outcomes_json,
    last_indexed_block = EXCLUDED.last_indexed_block,
    updated_at = NOW()
	`, tid, eid, status, total.String(), volumeText, int16(count), string(outcomesJSON), meta.BlockNumber)
	return err
}

func projectionEventMetaFromLog(lg types.Log) projectionEventMeta {
	return projectionEventMeta{
		BlockNumber: int64(lg.BlockNumber),
		TxHash:      lg.TxHash.Hex(),
		LogIndex:    int32(lg.Index),
		IndexedAt:   time.Now().UTC(),
	}
}

func computeProjectionOutcomes(outcomes []projectionOutcomeState) []projectionOutcomeState {
	next := make([]projectionOutcomeState, 0, len(outcomes))
	total := new(big.Int)
	for _, outcome := range outcomes {
		amount := outcome.PoolAmount
		if amount == nil {
			amount = new(big.Int)
		}
		total.Add(total, amount)
		next = append(next, projectionOutcomeState{
			Index:      outcome.Index,
			PoolAmount: new(big.Int).Set(amount),
		})
	}
	count := int64(len(next))
	for i := range next {
		if total.Sign() > 0 {
			prob := new(big.Int).Div(new(big.Int).Mul(next[i].PoolAmount, big.NewInt(10_000)), total).Int64()
			next[i].ProbabilityBps = int32(prob)
			if next[i].PoolAmount.Sign() > 0 {
				mult := new(big.Int).Div(new(big.Int).Mul(total, big.NewInt(10_000)), next[i].PoolAmount).Int64()
				next[i].MultiplierBps = int32(mult)
			}
			continue
		}
		if count > 0 {
			next[i].ProbabilityBps = int32(10_000 / count)
		}
	}
	return next
}

func probabilityPointNeeded(prev, next []projectionOutcomeState) bool {
	if len(prev) != len(next) {
		return true
	}
	for i := range next {
		if prev[i].Index != next[i].Index || prev[i].ProbabilityBps != next[i].ProbabilityBps {
			return true
		}
	}
	return false
}

func marshalProjectionOutcomes(outcomes []projectionOutcomeState) ([]byte, error) {
	payload := make([]map[string]any, 0, len(outcomes))
	for _, outcome := range outcomes {
		payload = append(payload, map[string]any{
			"outcomeIndex":         outcome.Index,
			"poolSize":             outcome.PoolAmount.String(),
			"impliedProbabilityE6": fmt.Sprintf("%d", outcome.ProbabilityBps*100),
			"displayPercentE4":     fmt.Sprintf("%d", outcome.ProbabilityBps),
			"multiplierBps":        fmt.Sprintf("%d", outcome.MultiplierBps),
			"grossPayoutXe6":       fmt.Sprintf("%d", outcome.MultiplierBps*100),
			"updatedBlock":         nil,
		})
	}
	return json.Marshal(payload)
}

func (s *Service) loadProjectionOutcomeStates(ctx context.Context, tx pgx.Tx, tid []byte, eid int64) ([]projectionOutcomeState, error) {
	rows, err := tx.Query(ctx, `
SELECT outcome_index, pool_amount::text, probability_bps, multiplier_bps
FROM market_epoch_outcomes
WHERE template_id = $1 AND epoch_id = $2
ORDER BY outcome_index
`, tid, eid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []projectionOutcomeState
	for rows.Next() {
		var row projectionOutcomeState
		var amountText string
		if err := rows.Scan(&row.Index, &amountText, &row.ProbabilityBps, &row.MultiplierBps); err != nil {
			return nil, err
		}
		row.PoolAmount, _ = new(big.Int).SetString(amountText, 10)
		if row.PoolAmount == nil {
			row.PoolAmount = new(big.Int)
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *Service) appendProbabilityPoint(ctx context.Context, tx pgx.Tx, tid []byte, eid int64, total *big.Int, outcomes []projectionOutcomeState, meta projectionEventMeta) error {
	if meta.Seq <= 0 {
		var err error
		meta.Seq, err = s.nextProbabilityPointSeq(ctx, tx)
		if err != nil {
			return err
		}
	}
	totalText := "0"
	if total != nil {
		totalText = total.String()
	}
	indexedAt := meta.IndexedAt
	if indexedAt.IsZero() {
		indexedAt = time.Now().UTC()
	}
	for _, outcome := range outcomes {
		if _, err := tx.Exec(ctx, `
INSERT INTO probability_points (
    template_id, epoch_id, seq, outcome_index, block_number, tx_hash, log_index,
    probability_bps, pool_amount, total_pool, indexed_at
)
VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, 0), $8, $9::numeric, $10::numeric, $11)
`, tid, eid, meta.Seq, outcome.Index, meta.BlockNumber, meta.TxHash, meta.LogIndex, outcome.ProbabilityBps, outcome.PoolAmount.String(), totalText, indexedAt); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) nextProbabilityPointSeq(ctx context.Context, tx pgx.Tx) (int64, error) {
	var seq int64
	err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(seq), 0) + 1 FROM probability_points`).Scan(&seq)
	return seq, err
}

func (s *Service) emitProjectionEvent(ctx context.Context, tx pgx.Tx, realtimeSeqs *[]int64, eventType string, tid []byte, eid int64, lg types.Log) error {
	snap, err := s.projectionPayload(ctx, tx, tid, eid)
	if err != nil {
		return err
	}
	snap["blockNumber"] = lg.BlockNumber
	snap["txHash"] = lg.TxHash.Hex()
	snap["logIndex"] = lg.Index
	block := int64(lg.BlockNumber)
	logIndex := int32(lg.Index)
	channels := []string{
		"global:markets",
		"market:" + strings.ToLower(common.BytesToHash(tid).Hex()),
		fmt.Sprintf("epoch:%s:%d", strings.ToLower(common.BytesToHash(tid).Hex()), eid),
	}
	for _, channel := range channels {
		seq, inserted, err := realtime.Insert(ctx, tx, realtime.InsertEvent{
			Channel:     channel,
			Type:        eventType,
			Scope:       "public",
			TemplateID:  tid,
			EpochID:     &eid,
			BlockNumber: &block,
			TxHash:      lg.TxHash.Hex(),
			LogIndex:    &logIndex,
			Payload:     snap,
			DedupeKey:   fmt.Sprintf("%s:%s:%d:%s", eventType, lg.TxHash.Hex(), lg.Index, channel),
		})
		if err != nil {
			return err
		}
		if inserted {
			if realtimeSeqs != nil {
				*realtimeSeqs = append(*realtimeSeqs, seq)
			}
			if channel == "global:markets" {
				if err := s.updateReadModelEventSeq(ctx, tx, tid, seq); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func (s *Service) emitUserPositionEvent(ctx context.Context, tx pgx.Tx, realtimeSeqs *[]int64, eventType string, user string, tid []byte, eid int64, lg types.Log) error {
	payload, err := s.userPositionPayload(ctx, tx, user, tid, eid)
	if err != nil {
		return err
	}
	block := int64(lg.BlockNumber)
	logIndex := int32(lg.Index)
	return s.insertRealtimeEvent(ctx, tx, realtimeSeqs, realtime.InsertEvent{
		Channel:     "user:" + strings.ToLower(user),
		Type:        eventType,
		Scope:       "user",
		UserAddress: strings.ToLower(user),
		TemplateID:  tid,
		EpochID:     &eid,
		BlockNumber: &block,
		TxHash:      lg.TxHash.Hex(),
		LogIndex:    &logIndex,
		Payload:     payload,
		DedupeKey:   fmt.Sprintf("%s:%s:%d", eventType, lg.TxHash.Hex(), lg.Index),
	})
}

func (s *Service) projectionPayload(ctx context.Context, tx pgx.Tx, tid []byte, eid int64) (map[string]any, error) {
	var status, totalPool, volume string
	var outcomeCount int16
	var block int64
	err := tx.QueryRow(ctx, `
SELECT status, total_pool::text, volume::text, outcome_count, last_indexed_block
FROM market_snapshots
WHERE template_id = $1
`, tid).Scan(&status, &totalPool, &volume, &outcomeCount, &block)
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, `
SELECT outcome_index, pool_amount::text, probability_bps, multiplier_bps, updated_block
FROM market_epoch_outcomes
WHERE template_id = $1 AND epoch_id = $2
ORDER BY outcome_index
`, tid, eid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	outcomes := []map[string]any{}
	for rows.Next() {
		var idx int16
		var amount string
		var prob, mult int32
		var updatedBlock int64
		if err := rows.Scan(&idx, &amount, &prob, &mult, &updatedBlock); err != nil {
			return nil, err
		}
		outcomes = append(outcomes, map[string]any{
			"outcomeIndex":         idx,
			"poolSize":             amount,
			"impliedProbabilityE6": fmt.Sprintf("%d", prob*100),
			"displayPercentE4":     fmt.Sprintf("%d", prob),
			"multiplierBps":        fmt.Sprintf("%d", mult),
			"grossPayoutXe6":       fmt.Sprintf("%d", mult*100),
			"updatedBlock":         updatedBlock,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	tidHex := strings.ToLower(common.BytesToHash(tid).Hex())
	return map[string]any{
		"templateId":       tidHex,
		"epochId":          eid,
		"activeEpochId":    eid,
		"status":           status,
		"totalPool":        totalPool,
		"volume":           volume,
		"outcomeCount":     outcomeCount,
		"lastIndexedBlock": block,
		"outcomes":         outcomes,
	}, nil
}

func (s *Service) userPositionPayload(ctx context.Context, tx pgx.Tx, user string, tid []byte, eid int64) (map[string]any, error) {
	rows, err := tx.Query(ctx, `
SELECT outcome_index, stake_amount::text, claimed_amount::text, claimed, updated_block
FROM user_position_outcomes
WHERE user_address = $1 AND template_id = $2 AND epoch_id = $3
ORDER BY outcome_index
`, strings.ToLower(user), tid, eid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	stakes := []string{}
	total := new(big.Int)
	claimed := false
	claimedAmount := new(big.Int)
	var maxBlock int64
	for rows.Next() {
		var idx int16
		var stakeText, claimedText string
		var rowClaimed bool
		var updatedBlock int64
		if err := rows.Scan(&idx, &stakeText, &claimedText, &rowClaimed, &updatedBlock); err != nil {
			return nil, err
		}
		for len(stakes) <= int(idx) {
			stakes = append(stakes, "0")
		}
		stakes[idx] = stakeText
		if n, ok := new(big.Int).SetString(stakeText, 10); ok {
			total.Add(total, n)
		}
		if n, ok := new(big.Int).SetString(claimedText, 10); ok {
			claimedAmount.Add(claimedAmount, n)
		}
		claimed = claimed || rowClaimed
		if updatedBlock > maxBlock {
			maxBlock = updatedBlock
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return map[string]any{
		"wallet":            strings.ToLower(user),
		"templateId":        strings.ToLower(common.BytesToHash(tid).Hex()),
		"epochId":           eid,
		"stakes":            stakes,
		"totalStake":        total.String(),
		"claimed":           claimed,
		"claimedAmount":     claimedAmount.String(),
		"positionViewBlock": maxBlock,
		"source":            "indexed_projection",
	}, nil
}

func (s *Service) insertRealtimeEvent(ctx context.Context, tx pgx.Tx, realtimeSeqs *[]int64, event realtime.InsertEvent) error {
	seq, inserted, err := realtime.Insert(ctx, tx, event)
	if err != nil {
		return err
	}
	if inserted && realtimeSeqs != nil {
		*realtimeSeqs = append(*realtimeSeqs, seq)
	}
	return nil
}

func (s *Service) updateReadModelEventSeq(ctx context.Context, tx pgx.Tx, tid []byte, seq int64) error {
	_, err := tx.Exec(ctx, `
UPDATE market_read_models
SET last_event_seq = $2
WHERE template_id = $1
`, tid, seq)
	return err
}

func payloadUint(v any) (uint64, bool) {
	switch x := v.(type) {
	case uint8:
		return uint64(x), true
	case uint64:
		return x, true
	case int:
		return uint64(x), x >= 0
	case float64:
		return uint64(x), x >= 0
	default:
		return 0, false
	}
}

func payloadBig(v any) (*big.Int, bool) {
	switch x := v.(type) {
	case string:
		n, ok := new(big.Int).SetString(x, 10)
		return n, ok
	case *big.Int:
		if x == nil {
			return nil, false
		}
		return new(big.Int).Set(x), true
	default:
		return nil, false
	}
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
