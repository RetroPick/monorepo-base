package api

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"retropick/apps/backend/internal/dbqueries"
	"retropick/apps/backend/internal/registry"
)

type routeRecorder map[string]http.HandlerFunc

func (r routeRecorder) Get(pattern string, handler http.HandlerFunc) {
	r[pattern] = handler
}

type metricsStub string

func (m metricsStub) Prometheus() string {
	return string(m)
}

func TestHealthOKPayloadBackwardCompatibleTopLevel(t *testing.T) {
	reg := &registry.Registry{
		Environment: "base-sepolia",
		ChainID:     84532,
		Contracts: registry.Contracts{
			MarketEngineProxy: "0xmarket",
		},
	}
	ts := time.Date(2024, 6, 15, 12, 30, 0, 0, time.UTC)
	st := dbqueries.IndexerState{
		LastBlock:     9_001_002,
		LastBlockHash: pgtype.Text{String: "0xdeadbeef", Valid: true},
		LastIndexedAt: pgtype.Timestamptz{Time: ts, Valid: true},
		ReorgDepth:    2,
	}
	build := BuildInfo{Version: "test", Commit: "abc", Time: "t", ABIHash: "0x0"}

	m := healthOKPayload(reg, st, build)
	if m["ok"] != true {
		t.Fatalf("ok = %#v", m["ok"])
	}
	if m["schemaVersion"] != healthSchemaVersion {
		t.Fatalf("schemaVersion = %#v", m["schemaVersion"])
	}
	if m["environment"] != "base-sepolia" || m["chainId"] != int64(84532) {
		t.Fatalf("environment/chainId = %#v / %#v", m["environment"], m["chainId"])
	}
	if m["lastIndexedBlock"] != int64(9_001_002) || m["indexedBlock"] != int64(9_001_002) {
		t.Fatalf("lastIndexedBlock/indexedBlock = %#v / %#v", m["lastIndexedBlock"], m["indexedBlock"])
	}
	if m["lastBlockHash"] != "0xdeadbeef" {
		t.Fatalf("lastBlockHash = %#v", m["lastBlockHash"])
	}
	if m["lastSyncAt"] != ts.UTC().Format(time.RFC3339) {
		t.Fatalf("lastSyncAt = %#v", m["lastSyncAt"])
	}
	contracts, ok := m["contracts"].(map[string]any)
	if !ok || contracts["marketEngineProxy"] != "0xmarket" {
		t.Fatalf("contracts = %#v", m["contracts"])
	}
}

func TestHealthOKPayloadIndexerMatchesGlobalStateLayout(t *testing.T) {
	reg := &registry.Registry{Environment: "dev", ChainID: 1, Contracts: registry.Contracts{}}
	st := dbqueries.IndexerState{
		LastBlock:     42,
		LastBlockHash: pgtype.Text{Valid: false},
		LastIndexedAt: pgtype.Timestamptz{Valid: false},
		ReorgDepth:    0,
	}
	m := healthOKPayload(reg, st, BuildInfo{})
	raw, err := json.Marshal(m["indexer"])
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]any
	if err := json.Unmarshal(raw, &got); err != nil {
		t.Fatal(err)
	}
	if got["lastIndexedBlock"] != float64(42) { // json numbers decode as float64
		t.Fatalf("indexer.lastIndexedBlock = %#v", got["lastIndexedBlock"])
	}
	if got["lastBlockHash"] != nil || got["lastSyncAt"] != nil {
		t.Fatalf("expected null optional fields, got %#v / %#v", got["lastBlockHash"], got["lastSyncAt"])
	}
	if got["reorgDepth"] != float64(0) {
		t.Fatalf("reorgDepth = %#v", got["reorgDepth"])
	}
}

func TestHealthOKPayloadJSONStableKeys(t *testing.T) {
	reg := &registry.Registry{Environment: "e", ChainID: 1, Contracts: registry.Contracts{}}
	st := dbqueries.IndexerState{LastBlock: 1, ReorgDepth: 0}
	b, err := json.Marshal(healthOKPayload(reg, st, BuildInfo{Version: "v"}))
	if err != nil {
		t.Fatal(err)
	}
	var keys struct {
		OK               bool   `json:"ok"`
		Schema           string `json:"schemaVersion"`
		Env              string `json:"environment"`
		Chain            int64  `json:"chainId"`
		LastIndexedBlock int64  `json:"lastIndexedBlock"`
		IndexedBlock     int64  `json:"indexedBlock"`
		Indexer          struct {
			LastIndexedBlock int64 `json:"lastIndexedBlock"`
			ReorgDepth       int   `json:"reorgDepth"`
		} `json:"indexer"`
	}
	if err := json.Unmarshal(b, &keys); err != nil {
		t.Fatalf("unmarshal: %v\n%s", err, string(b))
	}
	if !keys.OK || keys.Schema != healthSchemaVersion {
		t.Fatalf("%+v", keys)
	}
	if keys.LastIndexedBlock != keys.IndexedBlock || keys.LastIndexedBlock != keys.Indexer.LastIndexedBlock {
		t.Fatalf("block mismatch %+v", keys)
	}
}

func TestRegisterHealthRoutesIncludesCanonicalAliases(t *testing.T) {
	t.Parallel()

	routes := routeRecorder{}
	RegisterHealthRoutes(
		routes,
		nil,
		nil,
		&registry.Registry{},
		BuildInfo{},
		false,
		metricsStub("retropick_markets_test_metric 1\n"),
	)
	for _, path := range []string{
		"/api/v1/livez",
		"/api/v1/readyz",
		"/api/v1/health/live",
		"/api/v1/health/ready",
		"/metrics",
	} {
		if routes[path] == nil {
			t.Errorf("missing route %s", path)
		}
	}
}
