// Command markets-seed seeds deterministic Polymarket projection fixtures
// for local fe-v1 ↔ Go BFF ↔ PostgreSQL integration testing.
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/db"
	"retropick/apps/backend/internal/markets/devseed"
)

func main() {
	scenario := flag.String("scenario", "populated", "populated | empty | degraded")
	flag.Parse()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	if err := db.RunMigrations(databaseURL); err != nil {
		log.Fatalf("RunMigrations: %v", err)
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("db pool: %v", err)
	}
	defer pool.Close()

	if err := devseed.Apply(ctx, pool, *scenario); err != nil {
		log.Fatalf("Apply: %v", err)
	}

	page := devseed.BuildPage(*scenario, time.Now().UTC())
	log.Printf("seeded scenario=%s events=%d markets=%d", *scenario, len(page.Events), len(page.Markets))
}
