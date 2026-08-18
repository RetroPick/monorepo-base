package pglisten

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/realtime"
	"retropick/apps/backend/internal/wshub"
)

// MarketUpdateChannel is the Postgres NOTIFY channel used by the indexer.
const MarketUpdateChannel = realtime.NotifyChannel

func Run(ctx context.Context, databaseURL string, pool *pgxpool.Pool, hub *wshub.Hub, log *slog.Logger) error {
	return RunWithCallback(ctx, databaseURL, pool, hub, nil, log)
}

func RunWithCallback(ctx context.Context, databaseURL string, pool *pgxpool.Pool, hub *wshub.Hub, onEvent func(realtime.EventEnvelope), log *slog.Logger) error {
	lastSeenSeq := int64(0)
	for {
		conn, err := pgx.Connect(ctx, databaseURL)
		if err != nil {
			if !waitToReconnect(ctx, log, err) {
				return ctx.Err()
			}
			continue
		}
		if _, err := conn.Exec(ctx, "LISTEN "+MarketUpdateChannel); err != nil {
			conn.Close(ctx)
			if !waitToReconnect(ctx, log, err) {
				return ctx.Err()
			}
			continue
		}
		if log != nil {
			log.Info("postgres listen", "channel", MarketUpdateChannel, "afterSeq", lastSeenSeq)
		}
		lastSeenSeq = broadcastAfter(ctx, pool, hub, onEvent, lastSeenSeq, log)
		for {
			n, err := conn.WaitForNotification(ctx)
			if err != nil {
				conn.Close(context.Background())
				if ctx.Err() != nil {
					return ctx.Err()
				}
				if !waitToReconnect(ctx, log, err) {
					return ctx.Err()
				}
				break
			}
			if n == nil || n.Payload == "" {
				continue
			}
			seq, parseErr := strconv.ParseInt(n.Payload, 10, 64)
			if parseErr != nil || pool == nil {
				hub.Broadcast([]byte(n.Payload))
				continue
			}
			if seq > lastSeenSeq {
				lastSeenSeq = broadcastAfter(ctx, pool, hub, onEvent, lastSeenSeq, log)
			}
		}
	}
}

func broadcastAfter(ctx context.Context, pool *pgxpool.Pool, hub *wshub.Hub, onEvent func(realtime.EventEnvelope), lastSeenSeq int64, log *slog.Logger) int64 {
	if pool == nil {
		return lastSeenSeq
	}
	for {
		events, err := realtime.LoadEnvelopesAfter(ctx, pool, lastSeenSeq, 256, nil)
		if err != nil {
			if log != nil {
				log.Warn("load realtime batch", "afterSeq", lastSeenSeq, "err", err)
			}
			return lastSeenSeq
		}
		if len(events) == 0 {
			return lastSeenSeq
		}
		for _, event := range events {
			if onEvent != nil {
				onEvent(event)
			}
			msg, err := json.Marshal(event)
			if err != nil {
				continue
			}
			hub.Broadcast(msg)
			lastSeenSeq = event.Seq
		}
		if len(events) < 256 {
			return lastSeenSeq
		}
	}
}

func waitToReconnect(ctx context.Context, log *slog.Logger, err error) bool {
	if log != nil {
		log.Warn("postgres listen reconnect", "err", err)
	}
	timer := time.NewTimer(time.Second)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
