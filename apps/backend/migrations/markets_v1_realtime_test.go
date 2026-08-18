package migrations

import (
	"strings"
	"testing"
)

func TestMarketsV1Phase13RealtimeMigration(t *testing.T) {
	t.Parallel()

	up, err := Files.ReadFile("000002_markets_v1_realtime.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := Files.ReadFile("000002_markets_v1_realtime.down.sql")
	if err != nil {
		t.Fatal(err)
	}

	required := []string{
		"markets_price_observations",
		"markets_liquidity_observations",
		"markets_realtime_recovery",
	}
	for _, table := range required {
		if !strings.Contains(string(up), "CREATE TABLE IF NOT EXISTS "+table) {
			t.Errorf("up migration does not create %s", table)
		}
		if !strings.Contains(string(down), "DROP TABLE IF EXISTS "+table) {
			t.Errorf("down migration does not drop %s", table)
		}
	}
}
