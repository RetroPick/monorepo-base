package pglisten

import (
	"context"
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
			msg := []byte(n.Payload)
			if seq, err := strconv.ParseInt(n.Payload, 10, 64); err == nil && pool != nil {
				if event, err := realtime.Load(ctx, pool, seq); err == nil {
					msg = event
				} else if log != nil {
					log.Warn("load realtime event", "seq", seq, "err", err)
				}
			}
			hub.Broadcast(msg)
		}
	}
}
