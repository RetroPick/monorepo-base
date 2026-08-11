package whale_test

import (
	"testing"
	"time"

	"retropick/apps/backend/internal/markets/intelligence/model"
	"retropick/apps/backend/internal/markets/intelligence/params"
	"retropick/apps/backend/internal/markets/intelligence/whale"
)

func TestClassifierWhaleFeedVectors(t *testing.T) {
	file, err := params.Load()
	if err != nil {
		t.Fatal(err)
	}
	c := whale.NewClassifier(file.WhaleScoreLaunch)

	cases := []struct {
		name      string
		notional  int64
		volume    int64
		impact    int64
		wantWhale bool
		wantCodes []string
	}{
		{
			name:      "whale_feed_001 notional and volume share",
			notional:  42_500_000_000,
			volume:    675_000_000_000,
			wantWhale: true,
			wantCodes: []string{whale.ReasonNotionalThreshold, whale.ReasonVolumeShare},
		},
		{
			name:      "whale_feed_002 below threshold",
			notional:  2_500_000_000,
			volume:    675_000_000_000,
			wantWhale: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			trade := model.NormalizedTrade{
				Source:          model.SourceDataTrades,
				UpstreamTradeID: "tr_test",
				WalletAddress:   "0x1111111111111111111111111111111111111111",
				MarketID:        "market_demo_1",
				Side:            model.SideBuy,
				Outcome:         "YES",
				NotionalMinor:   tc.notional,
				TradedAt:        time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC),
			}
			ctx := model.MarketContext{
				Vol24hMinor:       tc.volume,
				ImpactBps:         tc.impact,
				ImpactUnavailable: tc.impact <= 0,
			}
			got := c.Classify(whale.ClassifyInput{Trade: trade, Context: ctx})
			if got.IsWhale != tc.wantWhale {
				t.Fatalf("isWhale = %v want %v score=%.2f", got.IsWhale, tc.wantWhale, got.WhaleScore)
			}
			if tc.wantWhale && len(got.ReasonCodes) == 0 {
				t.Fatal("expected reason codes")
			}
			for _, want := range tc.wantCodes {
				found := false
				for _, code := range got.ReasonCodes {
					if code == want {
						found = true
						break
					}
				}
				if !found {
					t.Fatalf("missing reason code %q got %v", want, got.ReasonCodes)
				}
			}
			if tc.wantWhale && tc.volume > 0 && tc.notional == 42_500_000_000 {
				if got.PctRecentVolumeBps != 630 {
					t.Fatalf("pct bps = %d want 630", got.PctRecentVolumeBps)
				}
			}
		})
	}
}

func TestFingerprintStable(t *testing.T) {
	trade := model.NormalizedTrade{
		MarketID:      "market_demo_1",
		WalletAddress: "0xAbC",
		Side:          model.SideBuy,
		NotionalMinor: 42_500_000_000,
		TradedAt:      time.Date(2026, 8, 9, 10, 0, 30, 0, time.UTC),
	}
	a := whale.Fingerprint(trade)
	b := whale.Fingerprint(trade)
	if a != b {
		t.Fatalf("fingerprint not stable: %q vs %q", a, b)
	}
}

func TestClassifyWithDedupPriorEvent(t *testing.T) {
	file, err := params.Load()
	if err != nil {
		t.Fatal(err)
	}
	c := whale.NewClassifier(file.WhaleScoreLaunch)
	trade := model.NormalizedTrade{
		Source:          model.SourceDataTrades,
		UpstreamTradeID: "tr_1001",
		WalletAddress:   "0x1111111111111111111111111111111111111111",
		MarketID:        "market_demo_1",
		Side:            model.SideBuy,
		Outcome:         "YES",
		NotionalMinor:   42_500_000_000,
		TradedAt:        time.Date(2026, 8, 9, 10, 0, 0, 0, time.UTC),
	}
	ctx := model.MarketContext{Vol24hMinor: 675_000_000_000, ImpactUnavailable: true}
	now := time.Date(2026, 8, 9, 10, 1, 0, 0, time.UTC)
	got := c.ClassifyWithDedup(whale.ClassifyInput{Trade: trade, Context: ctx}, "we_tr_1001_large_trade_v1", time.Time{}, now)
	if !got.IsWhale {
		t.Fatal("expected whale")
	}
	if !got.Duplicate || got.PublishNew {
		t.Fatalf("duplicate=%v publishNew=%v", got.Duplicate, got.PublishNew)
	}
}
