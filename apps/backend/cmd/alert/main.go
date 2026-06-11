package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
)

type incident struct {
	ID       int64
	Title    string
	Severity string
	Status   string
	Payload  []byte
	OpenedAt time.Time
}

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	if cfg.AlertWebhookURL == "" {
		log.Info("alert worker disabled; ALERT_WEBHOOK_URL not set")
		return
	}
	if err := db.WaitForSchema(ctx, cfg.DatabaseURL, log); err != nil {
		log.Error("wait for schema", "err", err)
		os.Exit(1)
	}
	pool, err := db.NewPoolWithConfig(ctx, cfg.DatabaseURL, db.PoolConfig{
		MaxConns:            cfg.DBMaxConns,
		MinConns:            cfg.DBMinConns,
		MaxConnLifetime:     cfg.DBMaxConnLifetime,
		HealthCheckInterval: cfg.DBHealthCheckInterval,
	})
	if err != nil {
		log.Error("db", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	client := &http.Client{Timeout: 10 * time.Second}
	tick := time.NewTicker(cfg.AlertPollInterval)
	defer tick.Stop()

	for {
		if err := sendOne(ctx, pool, client, cfg.AlertWebhookURL); err != nil && !errors.Is(err, errNoIncidents) {
			log.Error("alert send", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

var errNoIncidents = errors.New("no incidents")

func sendOne(ctx context.Context, pool *pgxpool.Pool, client *http.Client, webhookURL string) error {
	row := pool.QueryRow(ctx, `
SELECT id, title, severity, status, payload, opened_at
FROM incidents
WHERE status = 'open' AND notified_at IS NULL
ORDER BY opened_at ASC
LIMIT 1
`)
	var item incident
	if err := row.Scan(&item.ID, &item.Title, &item.Severity, &item.Status, &item.Payload, &item.OpenedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errNoIncidents
		}
		return err
	}

	body, err := json.Marshal(map[string]any{
		"text": item.Title,
		"incident": map[string]any{
			"id":       item.ID,
			"title":    item.Title,
			"severity": item.Severity,
			"status":   item.Status,
			"openedAt": item.OpenedAt.UTC().Format(time.RFC3339),
			"payload":  json.RawMessage(item.Payload),
		},
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		_, _ = pool.Exec(ctx, `
UPDATE incidents
SET notification_attempts = notification_attempts + 1,
    last_error = $2
WHERE id = $1
`, item.ID, err.Error())
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		_, _ = pool.Exec(ctx, `
UPDATE incidents
SET notification_attempts = notification_attempts + 1,
    last_error = $2
WHERE id = $1
`, item.ID, resp.Status)
		return errors.New(resp.Status)
	}
	_, err = pool.Exec(ctx, `
UPDATE incidents
SET notified_at = NOW(),
    notification_attempts = notification_attempts + 1,
    last_error = NULL
WHERE id = $1
`, item.ID)
	return err
}
