package priceworker

import (
	"context"
	"errors"
	"testing"
	"time"

	"retropick/apps/backend/internal/feedregistry"
	"retropick/apps/backend/internal/marketdata"
)

type fakeReader struct {
	reading Reading
	err     error
}

func (f fakeReader) Latest(context.Context, string) (Reading, error) {
	return f.reading, f.err
}

type fakeSink struct {
	ticks  []marketdata.Tick
	health []marketdata.FeedHealth
}

func (f *fakeSink) IngestTick(_ context.Context, tick marketdata.Tick) error {
	f.ticks = append(f.ticks, tick)
	return nil
}

func (f *fakeSink) UpsertFeedHealth(_ context.Context, health marketdata.FeedHealth) error {
	f.health = append(f.health, health)
	return nil
}

func testFeed() feedregistry.Entry {
	return feedregistry.Entry{
		ProxyAddress:             "0x0000000000000000000000000000000000000001",
		Label:                    "BTC / USD",
		Decimals:                 8,
		SuggestedMaxDelaySeconds: 3600,
	}
}

func TestPollerWritesChangedRoundAndHealth(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	sink := &fakeSink{}
	p := NewPoller([]feedregistry.Entry{testFeed()}, fakeReader{reading: Reading{
		RoundID:         "12",
		Answer:          123_456_789,
		UpdatedAt:       now.Add(-time.Minute),
		AnsweredInRound: "12",
		Decimals:        8,
	}}, sink, time.Hour, nil)
	p.now = func() time.Time { return now }

	if err := p.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(sink.ticks) != 1 || sink.ticks[0].PriceE8 != 123_456_789 {
		t.Fatalf("ticks = %#v", sink.ticks)
	}
	if len(sink.health) != 1 || sink.health[0].Stale || sink.health[0].Error != "" {
		t.Fatalf("health = %#v", sink.health)
	}
}

func TestPollerSkipsUnchangedRoundBeforeHeartbeat(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	sink := &fakeSink{}
	p := NewPoller([]feedregistry.Entry{testFeed()}, fakeReader{reading: Reading{
		RoundID:         "12",
		Answer:          123_456_789,
		UpdatedAt:       now.Add(-time.Minute),
		AnsweredInRound: "12",
		Decimals:        8,
	}}, sink, time.Hour, nil)
	p.now = func() time.Time { return now }

	if err := p.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	p.now = func() time.Time { return now.Add(time.Minute) }
	if err := p.RunOnce(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(sink.ticks) != 1 {
		t.Fatalf("ticks = %d, want 1", len(sink.ticks))
	}
	if len(sink.health) != 2 {
		t.Fatalf("health = %d, want 2", len(sink.health))
	}
}

func TestPollerRejectsIncompleteRound(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	sink := &fakeSink{}
	p := NewPoller([]feedregistry.Entry{testFeed()}, fakeReader{reading: Reading{
		RoundID:         "12",
		Answer:          123_456_789,
		UpdatedAt:       now.Add(-time.Minute),
		AnsweredInRound: "11",
		Decimals:        8,
	}}, sink, time.Hour, nil)
	p.now = func() time.Time { return now }

	if err := p.RunOnce(context.Background()); err == nil {
		t.Fatal("expected incomplete round error")
	}
	if len(sink.ticks) != 0 || len(sink.health) != 1 || sink.health[0].Error == "" {
		t.Fatalf("ticks=%#v health=%#v", sink.ticks, sink.health)
	}
}

func TestPollerRecordsReadFailure(t *testing.T) {
	sink := &fakeSink{}
	p := NewPoller([]feedregistry.Entry{testFeed()}, fakeReader{err: errors.New("rpc down")}, sink, time.Hour, nil)
	if err := p.RunOnce(context.Background()); err == nil {
		t.Fatal("expected read error")
	}
	if len(sink.health) != 1 || sink.health[0].Error != "rpc down" {
		t.Fatalf("health=%#v", sink.health)
	}
}

func TestNormalizeToE8(t *testing.T) {
	tests := []struct {
		answer   int64
		decimals uint8
		want     int64
	}{
		{answer: 123, decimals: 8, want: 123},
		{answer: 123, decimals: 6, want: 12_300},
		{answer: 12_300, decimals: 10, want: 123},
	}
	for _, tc := range tests {
		got, err := normalizeToE8(tc.answer, tc.decimals)
		if err != nil || got != tc.want {
			t.Fatalf("normalizeToE8(%d,%d) = %d,%v want %d,nil", tc.answer, tc.decimals, got, err, tc.want)
		}
	}
}

func TestValidateReadingAcceptsPhaseEncodedRoundID(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	roundID := "18446744073709828049"
	price, stale, err := validateReading(testFeed(), Reading{
		RoundID:         roundID,
		Answer:          123_456_789,
		UpdatedAt:       now.Add(-time.Minute),
		AnsweredInRound: roundID,
		Decimals:        8,
	}, now)
	if err != nil || stale || price != 123_456_789 {
		t.Fatalf("validateReading() = %d,%v,%v", price, stale, err)
	}
}

func TestValidateRegistryChainRejectsMismatch(t *testing.T) {
	if err := ValidateRegistryChain(8453, 84532); err == nil {
		t.Fatal("expected feed registry chain mismatch error")
	}
	if err := ValidateRegistryChain(84532, 84532); err != nil {
		t.Fatalf("matching chain ids: %v", err)
	}
}
