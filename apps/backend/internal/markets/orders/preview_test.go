package orders

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"gopkg.in/yaml.v3"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
	"retropick/apps/backend/internal/markets/wallet"
)

type previewVectorFile struct {
	Vectors []previewVector `yaml:"vectors"`
}

type previewVector struct {
	Name        string               `yaml:"name"`
	Payload     UnsignedOrderPayload `yaml:"payload"`
	Metadata    hashMetadata         `yaml:"metadata"`
	ContentHash string               `yaml:"contentHash"`
}

func TestComputeContentHash_GoldenVectors(t *testing.T) {
	t.Parallel()

	path := filepath.Join("testdata", "preview_vectors.yaml")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var file previewVectorFile
	if err := yaml.Unmarshal(raw, &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Vectors) == 0 {
		t.Fatal("no vectors")
	}
	for _, vec := range file.Vectors {
		vec := vec
		t.Run(vec.Name, func(t *testing.T) {
			t.Parallel()
			got, err := ComputeContentHash(vec.Payload, vec.Metadata)
			if err != nil {
				t.Fatal(err)
			}
			if strings.HasPrefix(vec.ContentHash, "0xPLACEHOLDER") {
				t.Fatalf("update testdata contentHash for %q: got %q", vec.Name, got)
			}
			if got != vec.ContentHash {
				t.Fatalf("contentHash mismatch: got %q want %q", got, vec.ContentHash)
			}
			if !VerifyContentHash(vec.Payload, vec.Metadata, vec.ContentHash) {
				t.Fatal("VerifyContentHash failed")
			}
			metrics := markets.NewMetrics()
			metrics.RecordPreviewSignMatch(true)
			output := metrics.Prometheus()
			if !strings.Contains(output, `retropick_markets_preview_sign_match_total{result="match"} 1`) {
				t.Fatalf("golden vector did not record preview_sign_match:\n%s", output)
			}
		})
	}
}

func TestPreview_MakerNotLinked(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	svc := NewService(ServiceConfig{
		Discoverer: wallet.NewDiscoverer(wallet.UnwiredStore{}, nil),
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "1", nil },
	})
	_, err := svc.Preview(context.Background(), wallet.SessionContext{
		UserID:        "user-1",
		SignerAddress: "0x2222222222222222222222222222222222222222",
	}, PreviewRequest{
		MarketID:     "polymarket:market:456",
		TokenID:      "999001",
		Side:         SideBuy,
		Price:        "0.42",
		Size:         "100",
		OrderType:    OrderTypeLimit,
		MakerAddress: "0x1111111111111111111111111111111111111111",
	})
	if err != ErrMakerNotLinked {
		t.Fatalf("err = %v", err)
	}
}

func TestPreview_BuilderAttachedServerSide(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	maker := "0x1111111111111111111111111111111111111111"
	signer := "0x2222222222222222222222222222222222222222"
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		"user-1|" + signer: {{
			AccountWallet: maker,
			WalletType:    wallet.WalletTypeEOA,
			LinkStatus:    wallet.LinkStatusLinked,
			ChainID:       137,
		}},
	}}, nil)
	svc := NewService(ServiceConfig{
		Discoverer:  disc,
		Markets:     stubMarketCatalog{},
		Books:       stubBookConstraints{tick: "0.01", min: "1"},
		BuilderCode: "0x00000000000000000000000000000000000000000000000000000000000000ab",
		Now:         func() time.Time { return fixed },
		SaltFn:      func() (string, error) { return "99", nil },
	})
	resp, err := svc.Preview(context.Background(), wallet.SessionContext{
		UserID:        "user-1",
		SignerAddress: signer,
	}, PreviewRequest{
		MarketID:     "polymarket:market:456",
		TokenID:      "999001",
		Side:         SideBuy,
		Price:        "0.42",
		Size:         "100",
		OrderType:    OrderTypeLimit,
		MakerAddress: maker,
	})
	if err != nil {
		t.Fatal(err)
	}
	wantBuilder := strings.Repeat("0", 62) + "ab"
	if resp.UnsignedPayload.Builder != wantBuilder {
		t.Fatalf("builder = %q want %q", resp.UnsignedPayload.Builder, wantBuilder)
	}
	if resp.ContentHash == "" || !strings.HasPrefix(resp.ContentHash, "0x") {
		t.Fatalf("contentHash = %q", resp.ContentHash)
	}
	if !VerifyContentHash(resp.UnsignedPayload, hashMetadata{
		ChainID:  137,
		MarketID: "polymarket:market:456",
		TokenID:  "999001",
	}, resp.ContentHash) {
		t.Fatal("response hash does not verify")
	}
}

func TestPreview_TickSizeViolation(t *testing.T) {
	t.Parallel()

	fixed := time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC)
	maker := "0x1111111111111111111111111111111111111111"
	signer := "0x2222222222222222222222222222222222222222"
	disc := wallet.NewDiscoverer(wallet.MemoryStore{Rows: map[string][]wallet.LinkedAccount{
		"user-1|" + signer: {{
			AccountWallet: maker,
			LinkStatus:    wallet.LinkStatusLinked,
		}},
	}}, nil)
	svc := NewService(ServiceConfig{
		Discoverer: disc,
		Markets:    stubMarketCatalog{},
		Books:      stubBookConstraints{tick: "0.01", min: "1"},
		Now:        func() time.Time { return fixed },
	})
	_, err := svc.Preview(context.Background(), wallet.SessionContext{
		UserID:        "user-1",
		SignerAddress: signer,
	}, PreviewRequest{
		MarketID:     "polymarket:market:456",
		TokenID:      "999001",
		Side:         SideBuy,
		Price:        "0.421",
		Size:         "100",
		OrderType:    OrderTypeLimit,
		MakerAddress: maker,
	})
	if err != ErrTickSizeViolation {
		t.Fatalf("err = %v", err)
	}
}

type stubMarketCatalog struct{}

func (stubMarketCatalog) GetMarket(_ context.Context, _ string) (markets.MarketDetail, error) {
	return markets.MarketDetail{
		Question: "Will test pass?",
		Outcomes: []markets.Outcome{{UpstreamID: "999001", Name: "Yes"}},
	}, nil
}

type stubBookConstraints struct {
	tick    string
	min     string
	negRisk bool
}

func (s stubBookConstraints) GetOrderBook(_ context.Context, _ string) (clob.OrderBook, error) {
	return clob.OrderBook{TickSize: s.tick, MinOrderSize: s.min, NegRisk: s.negRisk}, nil
}
