// Package feedregistry loads the curated Base Sepolia Chainlink feed list for operator APIs.
package feedregistry

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed registry.json
var registryJSON []byte

// File holds the embedded JSON document.
type File struct {
	Version   int     `json:"version"`
	ChainID   int64   `json:"chainId"`
	Network   string  `json:"network"`
	Feeds     []Entry `json:"feeds"`
	SourceNote string `json:"sourceNote,omitempty"`
}

// Entry is one feed proxy row for template upsert (oracleClass matches MarketTypes.OracleClass).
type Entry struct {
	ProxyAddress             string `json:"proxyAddress"`
	Label                    string `json:"label"`
	Category                 string `json:"category"`
	OracleClass              uint8  `json:"oracleClass"`
	SuggestedMaxDelaySeconds uint32 `json:"suggestedMaxDelaySeconds"`
	Decimals                 int    `json:"decimals,omitempty"`
	SourceURL                string `json:"sourceUrl,omitempty"`
}

// Load parses the embedded registry.
func Load() (File, error) {
	var f File
	if err := json.Unmarshal(registryJSON, &f); err != nil {
		return File{}, err
	}
	return f, nil
}

// Filter returns feeds matching network and optional oracle class (0-4), or an error.
func Filter(network string, oracleClass *int) (File, error) {
	f, err := Load()
	if err != nil {
		return File{}, err
	}
	if network != "" && !strings.EqualFold(network, f.Network) {
		return File{}, fmt.Errorf("unknown network: %q (supported: %s)", network, f.Network)
	}
	if oracleClass == nil {
		return f, nil
	}
	oc := *oracleClass
	if oc < 0 || oc > 4 {
		return File{}, fmt.Errorf("oracleClass out of range: %d", oc)
	}
	out := f
	out.Feeds = nil
	for _, e := range f.Feeds {
		if e.OracleClass == uint8(oc) {
			out.Feeds = append(out.Feeds, e)
		}
	}
	return out, nil
}
