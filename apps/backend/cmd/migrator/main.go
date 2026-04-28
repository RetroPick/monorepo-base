package main

import (
	"log/slog"
	"os"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/db"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	cfg, err := config.Load()
	if err != nil {
		log.Error("config", "err", err)
		os.Exit(1)
	}
	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Error("migrate", "err", err)
		os.Exit(1)
	}
	log.Info("migrations complete")
}
