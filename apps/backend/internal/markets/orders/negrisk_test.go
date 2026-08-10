package orders

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"gopkg.in/yaml.v3"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/wallet"
)

type negriskRoutingVectorFile struct {
	Vectors []negriskRoutingVector `yaml:"vectors"`
}

type negriskRoutingVector struct {
	ID       string                    `yaml:"id"`
	Input    negriskRoutingVectorInput `yaml:"input"`
	Expected negriskRoutingExpected    `yaml:"expected"`
}

type negriskRoutingVectorInput struct {
	ClobNegRisk     *bool  `yaml:"clobNegRisk"`
	CatalogNegRisk  bool   `yaml:"catalogNegRisk"`
	NoiseQuestion   string `yaml:"noiseQuestion"`
}

type negriskRoutingExpected struct {
	ExchangeDomain    string   `yaml:"exchangeDomain"`
	VerifyingContract string   `yaml:"verifyingContract"`
	Warnings          []string `yaml:"warnings"`
	Error             string   `yaml:"error"`
}

func TestSelectExchangeDomain_GoldenVectors(t *testing.T) {
	t.Parallel()

	path := filepath.Join("testdata", "negrisk_routing_vectors.yaml")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var file negriskRoutingVectorFile
	if err := yaml.Unmarshal(raw, &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Vectors) == 0 {
		t.Fatal("no vectors")
	}

	for _, vec := range file.Vectors {
		vec := vec
		t.Run(vec.ID, func(t *testing.T) {
			t.Parallel()
			_ = vec.Input.NoiseQuestion

			got, err := SelectExchangeDomain(ExchangeRoutingInput{
				ClobNegRisk:    vec.Input.ClobNegRisk,
				CatalogNegRisk: vec.Input.CatalogNegRisk,
			})

			if vec.Expected.Error != "" {
				if err == nil {
					t.Fatalf("expected error %q, got nil", vec.Expected.Error)
				}
				if vec.Expected.Error == "exchange_routing_conflict" && err != ErrExchangeRoutingConflict {
					t.Fatalf("err = %v want ErrExchangeRoutingConflict", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got.Domain != vec.Expected.ExchangeDomain {
				t.Fatalf("domain = %q want %q", got.Domain, vec.Expected.ExchangeDomain)
			}
			if got.VerifyingContract != vec.Expected.VerifyingContract {
				t.Fatalf("verifyingContract = %q want %q", got.VerifyingContract, vec.Expected.VerifyingContract)
			}
			if len(got.Warnings) != len(vec.Expected.Warnings) {
				t.Fatalf("warnings = %v want %v", got.Warnings, vec.Expected.Warnings)
			}
			for i, w := range vec.Expected.Warnings {
				if got.Warnings[i] != w {
					t.Fatalf("warnings[%d] = %q want %q", i, got.Warnings[i], w)
				}
			}
		})
	}
}

func TestVerifyingContractForDomain(t *testing.T) {
	t.Parallel()

	std, err := VerifyingContractForDomain(ExchangeDomainStandard)
	if err != nil {
		t.Fatal(err)
	}
	if std != ctfExchangeV2Address {
		t.Fatalf("standard contract = %q", std)
	}

	nr, err := VerifyingContractForDomain(ExchangeDomainNegRisk)
	if err != nil {
		t.Fatal(err)
	}
	if nr != negRiskCTFExchangeV2Address {
		t.Fatalf("neg_risk contract = %q", nr)
	}

	if _, err := VerifyingContractForDomain("unknown"); err == nil {
		t.Fatal("expected error for unknown domain")
	}
}

func TestPreview_ExchangeDomainNegRisk(t *testing.T) {
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
		Markets:    stubNegRiskMarketCatalog{negRisk: true},
		Books:      stubBookConstraints{tick: "0.01", min: "1", negRisk: true},
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "1", nil },
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
	if resp.ExchangeDomain != ExchangeDomainNegRisk {
		t.Fatalf("exchangeDomain = %q want %q", resp.ExchangeDomain, ExchangeDomainNegRisk)
	}
}

func TestPreview_ExchangeDomainCatalogFallback(t *testing.T) {
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
		Markets:    stubNegRiskMarketCatalog{negRisk: true},
		Books:      nil,
		Now:        func() time.Time { return fixed },
		SaltFn:     func() (string, error) { return "1", nil },
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
	if resp.ExchangeDomain != ExchangeDomainNegRisk {
		t.Fatalf("exchangeDomain = %q want %q", resp.ExchangeDomain, ExchangeDomainNegRisk)
	}
	if !containsString(resp.Warnings, warningExchangeRoutingCatalogFallback) {
		t.Fatalf("warnings = %v want %q", resp.Warnings, warningExchangeRoutingCatalogFallback)
	}
	if !containsString(resp.Warnings, "clob_constraints_unavailable") {
		t.Fatalf("warnings = %v want clob_constraints_unavailable", resp.Warnings)
	}
}

func TestPreview_ExchangeRoutingConflict(t *testing.T) {
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
		Markets:    stubNegRiskMarketCatalog{negRisk: true},
		Books:      stubBookConstraints{tick: "0.01", min: "1", negRisk: false},
		Now:        func() time.Time { return fixed },
	})

	_, err := svc.Preview(context.Background(), wallet.SessionContext{
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
	if err != ErrExchangeRoutingConflict {
		t.Fatalf("err = %v want ErrExchangeRoutingConflict", err)
	}
}

func TestPreview_MisleadingTitleIgnored(t *testing.T) {
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
		Markets: stubNegRiskMarketCatalog{
			negRisk:  false,
			question: "Negative risk election market",
		},
		Books:  stubBookConstraints{tick: "0.01", min: "1", negRisk: false},
		Now:    func() time.Time { return fixed },
		SaltFn: func() (string, error) { return "1", nil },
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
	if resp.ExchangeDomain != ExchangeDomainStandard {
		t.Fatalf("exchangeDomain = %q want standard despite misleading title", resp.ExchangeDomain)
	}
}

type stubNegRiskMarketCatalog struct {
	negRisk  bool
	question string
}

func (s stubNegRiskMarketCatalog) GetMarket(_ context.Context, _ string) (markets.MarketDetail, error) {
	q := s.question
	if q == "" {
		q = "Will test pass?"
	}
	return markets.MarketDetail{
		Question: q,
		Outcomes: []markets.Outcome{{UpstreamID: "999001", Name: "Yes"}},
		Capabilities: markets.MarketCapability{
			NegRisk: s.negRisk,
		},
	}, nil
}

func containsString(values []string, target string) bool {
	for _, v := range values {
		if v == target {
			return true
		}
	}
	return false
}
