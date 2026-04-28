package pglisten

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5"

	"retropick/apps/backend/internal/wshub"
)

// MarketUpdateChannel is the Postgres NOTIFY channel used by the indexer.
const MarketUpdateChannel = "market_update"

func Run(ctx context.Context, databaseURL string, hub *wshub.Hub, log *slog.Logger) error {
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
			hub.Broadcast([]byte(n.Payload))
		}
	}
}
