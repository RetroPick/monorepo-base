package main

import (
	"log/slog"
	"os"
	"strings"

	"retropick/apps/backend/internal/db"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		log.Error("DATABASE_URL is required")
		os.Exit(1)
	}
	if err := db.RunMigrations(databaseURL); err != nil {
		log.Error("migrate", "err", err)
		os.Exit(1)
	}
	log.Info("migrations complete")
}
