package launchboard

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultCatalog_IndexesMarkets(t *testing.T) {
	c, err := Default()
	if err != nil {
		t.Fatal(err)
	}
	if c.ChainID != 84532 {
		t.Fatalf("chainId = %d", c.ChainID)
	}
	if got := len(c.Markets); got != 9 {
		t.Fatalf("markets = %d", got)
	}
	meta, ok := c.LookupSlug("btc-5d-above-82000-manual")
	if !ok {
		t.Fatal("expected slug lookup")
	}
	if meta.TemplateID != "0x5322cdb36f8838abf050c794798243d201c28d3631ed23eb344095694237506b" {
		t.Fatalf("unexpected template id %s", meta.TemplateID)
	}
	if meta.LabelForOutcomeIndex(0) != "Yes" || meta.LabelForOutcomeIndex(1) != "No" {
		t.Fatalf("unexpected labels: %#v", meta.OutcomeLabels)
	}
}

func TestMetadataCatalog_IncludesChainlinkTypeBoard(t *testing.T) {
	c, err := Metadata()
	if err != nil {
		t.Fatal(err)
	}
	if got := len(c.Markets); got != 16 {
		t.Fatalf("markets = %d", got)
	}
	meta, ok := c.LookupSlug("btc-eth-link-4d-composite")
	if !ok {
		t.Fatal("expected chainlink type board slug lookup")
	}
	if got := len(meta.OutcomeLabels); got != 2 {
		t.Fatalf("outcome labels = %d", got)
	}
}

func TestLoadFile_LoadsSelectedCatalog(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "catalog.json")
	if err := os.WriteFile(path, chainlinkTypesCatalogJSON, 0o600); err != nil {
		t.Fatal(err)
	}
	c, err := LoadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if c.BoardID != "base-sepolia-7-chainlink-types-v1" {
		t.Fatalf("board id = %q", c.BoardID)
	}
	if got := len(c.Markets); got != 7 {
		t.Fatalf("markets = %d", got)
	}
}

func TestDecorateOutcomeRows_AddsLabels(t *testing.T) {
	c, err := Default()
	if err != nil {
		t.Fatal(err)
	}
	meta, ok := c.LookupSlug("eth-5d-range-2250-2300-manual")
	if !ok {
		t.Fatal("expected slug lookup")
	}
	rows := []map[string]any{
		{"outcomeIndex": 0},
		{"outcomeIndex": 2},
	}
	DecorateOutcomeRows(meta, rows)
	if rows[0]["label"] != "< $2,250" {
		t.Fatalf("row 0 label = %#v", rows[0]["label"])
	}
	if rows[1]["label"] != ">= $2,300" {
		t.Fatalf("row 1 label = %#v", rows[1]["label"])
	}
}
