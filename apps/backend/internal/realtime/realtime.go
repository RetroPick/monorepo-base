package realtime

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const NotifyChannel = "realtime_event"

type EventEnvelope struct {
	Seq         int64          `json:"seq"`
	Type        string         `json:"type"`
	Channel     string         `json:"channel"`
	Scope       string         `json:"scope"`
	TemplateID  string         `json:"templateId,omitempty"`
	EpochID     *int64         `json:"epochId,omitempty"`
	UserAddress string         `json:"userAddress,omitempty"`
	BlockNumber *int64         `json:"blockNumber,omitempty"`
	TxHash      string         `json:"txHash,omitempty"`
	LogIndex    *int32         `json:"logIndex,omitempty"`
	Payload     map[string]any `json:"payload"`
	CreatedAt   string         `json:"createdAt"`
}

type InsertEvent struct {
	Channel     string
	Type        string
	Scope       string
	UserAddress string
	TemplateID  []byte
	EpochID     *int64
	BlockNumber *int64
	TxHash      string
	LogIndex    *int32
	Payload     map[string]any
	DedupeKey   string
}

type Execer interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

func Insert(ctx context.Context, execer Execer, event InsertEvent) (int64, bool, error) {
	scope := strings.TrimSpace(event.Scope)
	if scope == "" {
		scope = "public"
	}
	payload := event.Payload
	if payload == nil {
		payload = map[string]any{}
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return 0, false, fmt.Errorf("marshal realtime payload: %w", err)
	}

	var epoch any
	if event.EpochID != nil {
		epoch = *event.EpochID
	}
	var block any
	if event.BlockNumber != nil {
		block = *event.BlockNumber
	}
	var logIndex any
	if event.LogIndex != nil {
		logIndex = *event.LogIndex
	}
	var user any
	if event.UserAddress != "" {
		user = strings.ToLower(event.UserAddress)
	}
	var template any
	if len(event.TemplateID) == 32 {
		template = event.TemplateID
	}
	var txHash any
	if event.TxHash != "" {
		txHash = event.TxHash
	}
	var dedupe any
	if event.DedupeKey != "" {
		dedupe = event.DedupeKey
	}

	var seq int64
	err = execer.QueryRow(ctx, `
INSERT INTO realtime_events (
    channel, type, scope, user_address, template_id, epoch_id,
    block_number, tx_hash, log_index, payload, dedupe_key
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (dedupe_key) DO NOTHING
RETURNING seq
`, event.Channel, event.Type, scope, user, template, epoch, block, txHash, logIndex, string(payloadBytes), dedupe).Scan(&seq)
	if err == nil {
		return seq, true, nil
	}
	if err == pgx.ErrNoRows {
		return 0, false, nil
	}
	return 0, false, err
}

func Notify(ctx context.Context, pool *pgxpool.Pool, seq int64) error {
	_, err := pool.Exec(ctx, `SELECT pg_notify($1, $2)`, NotifyChannel, fmt.Sprintf("%d", seq))
	return err
}

func Load(ctx context.Context, pool *pgxpool.Pool, seq int64) ([]byte, error) {
	env, err := LoadEnvelope(ctx, pool, seq)
	if err != nil {
		return nil, err
	}
	return json.Marshal(env)
}

func LoadEnvelopesAfter(ctx context.Context, pool *pgxpool.Pool, afterSeq int64, limit int32, channels []string) ([]EventEnvelope, error) {
	if limit <= 0 {
		limit = 100
	}
	args := []any{afterSeq, limit}
	query := `
SELECT seq, type, channel, scope, user_address, template_id, epoch_id,
       block_number, tx_hash, log_index, payload::text, created_at
FROM realtime_events
WHERE seq > $1
`
	if len(channels) > 0 {
		query += " AND channel = ANY($3)\n"
		args = append(args, channels)
	}
	query += "ORDER BY seq ASC LIMIT $2"

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []EventEnvelope
	for rows.Next() {
		env, err := scanEnvelope(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, env)
	}
	return out, rows.Err()
}

func LoadEnvelope(ctx context.Context, pool *pgxpool.Pool, seq int64) (EventEnvelope, error) {
	row := pool.QueryRow(ctx, `
SELECT seq, type, channel, scope, user_address, template_id, epoch_id,
       block_number, tx_hash, log_index, payload::text, created_at
FROM realtime_events
WHERE seq = $1
`, seq)
	env, err := scanEnvelope(row)
	if err != nil {
		return EventEnvelope{}, err
	}
	return env, nil
}

type scanRow interface {
	Scan(dest ...any) error
}

func scanEnvelope(row scanRow) (EventEnvelope, error) {
	var env EventEnvelope
	var seq int64
	var tid []byte
	var epochID pgtype.Int8
	var blockNumber pgtype.Int8
	var txHash pgtype.Text
	var logIndex pgtype.Int4
	var userAddress pgtype.Text
	var payloadText string
	var createdAt time.Time
	err := row.Scan(
		&seq,
		&env.Type,
		&env.Channel,
		&env.Scope,
		&userAddress,
		&tid,
		&epochID,
		&blockNumber,
		&txHash,
		&logIndex,
		&payloadText,
		&createdAt,
	)
	if err != nil {
		return EventEnvelope{}, err
	}
	env.Seq = seq
	env.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	if userAddress.Valid {
		env.UserAddress = strings.ToLower(userAddress.String)
	}
	if len(tid) == 32 {
		env.TemplateID = "0x" + hex.EncodeToString(tid)
	}
	if epochID.Valid {
		v := epochID.Int64
		env.EpochID = &v
	}
	if blockNumber.Valid {
		v := blockNumber.Int64
		env.BlockNumber = &v
	}
	if txHash.Valid {
		env.TxHash = txHash.String
	}
	if logIndex.Valid {
		v := logIndex.Int32
		env.LogIndex = &v
	}
	env.Payload = map[string]any{}
	_ = json.Unmarshal([]byte(payloadText), &env.Payload)
	return env, nil
}
