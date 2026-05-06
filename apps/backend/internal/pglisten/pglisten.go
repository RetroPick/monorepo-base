package pglisten

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/realtime"
	"retropick/apps/backend/internal/wshub"
)

// MarketUpdateChannel is the Postgres NOTIFY channel used by the indexer.
const MarketUpdateChannel = realtime.NotifyChannel

func Run(ctx context.Context, databaseURL string, pool *pgxpool.Pool, hub *wshub.Hub, log *slog.Logger) error {
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, "LISTEN "+MarketUpdateChannel); err != nil {
		return err
	}
	if log != nil {
		log.Info("postgres listen", "channel", MarketUpdateChannel)
	}
	lastSeenSeq := int64(0)
	for {
		n, err := conn.WaitForNotification(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			if log != nil {
				log.Warn("listen notification error", "err", err)
			}
			continue
		}
		if n != nil && n.Payload != "" {
			seq, parseErr := strconv.ParseInt(n.Payload, 10, 64)
			if parseErr != nil || pool == nil {
				hub.Broadcast([]byte(n.Payload))
				continue
			}
			if seq > lastSeenSeq {
				lastSeenSeq = seq - 1
			}
			for {
				events, err := realtime.LoadEnvelopesAfter(ctx, pool, lastSeenSeq, 256, nil)
				if err != nil {
					if log != nil {
						log.Warn("load realtime batch", "afterSeq", lastSeenSeq, "err", err)
					}
					break
				}
				if len(events) == 0 {
					break
				}
				for _, event := range events {
					msg, err := json.Marshal(event)
					if err != nil {
						continue
					}
					hub.Broadcast(msg)
					lastSeenSeq = event.Seq
				}
				if len(events) < 256 {
					break
				}
			}
		}
	}
}
