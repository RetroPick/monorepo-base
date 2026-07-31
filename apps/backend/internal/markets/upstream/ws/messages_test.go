package ws_test

import (
	"testing"

	upstreamws "retropick/apps/backend/internal/markets/upstream/ws"
)

func TestParseBookFixture(t *testing.T) {
	t.Parallel()
	events, err := upstreamws.ParseFrame(upstreamws.FixtureBook("token-1"))
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].Type != upstreamws.EventBook {
		t.Fatalf("events %+v", events)
	}
	if events[0].Book == nil || events[0].Book.TokenID != "token-1" {
		t.Fatalf("book %+v", events[0].Book)
	}
}

func TestParsePriceChangeFixture(t *testing.T) {
	t.Parallel()
	events, err := upstreamws.ParseFrame(upstreamws.FixturePriceChange("token-1"))
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].Type != upstreamws.EventPriceChange {
		t.Fatalf("events %+v", events)
	}
	if len(events[0].Changes) != 1 {
		t.Fatalf("changes %+v", events[0].Changes)
	}
}

func TestParseLastTradeFixture(t *testing.T) {
	t.Parallel()
	events, err := upstreamws.ParseFrame(upstreamws.FixtureLastTrade("token-1"))
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].Trade == nil {
		t.Fatalf("events %+v", events)
	}
}

func TestParseTickSizeFixture(t *testing.T) {
	t.Parallel()
	events, err := upstreamws.ParseFrame(upstreamws.FixtureTickSizeChange("token-1"))
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].TickSize == nil {
		t.Fatalf("events %+v", events)
	}
}

func TestParsePONGIgnored(t *testing.T) {
	t.Parallel()
	events, err := upstreamws.ParseFrame([]byte("PONG"))
	if err != nil {
		t.Fatal(err)
	}
	if events != nil {
		t.Fatalf("expected nil events, got %+v", events)
	}
}

func TestParseMalformedJSON(t *testing.T) {
	t.Parallel()
	_, err := upstreamws.ParseFrame([]byte("{not json"))
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestSubscriptionMessage(t *testing.T) {
	t.Parallel()
	msg, err := upstreamws.SubscriptionMessage([]string{"a", "b"})
	if err != nil {
		t.Fatal(err)
	}
	if len(msg) == 0 {
		t.Fatal("empty message")
	}
}

func TestUpdateSubscriptionMessage(t *testing.T) {
	t.Parallel()
	msg, err := upstreamws.UpdateSubscriptionMessage("subscribe", []string{"a"})
	if err != nil {
		t.Fatal(err)
	}
	if len(msg) == 0 {
		t.Fatal("empty message")
	}
}

func TestParseArrayBatch(t *testing.T) {
	t.Parallel()
	batch := []byte(`[{"event_type":"book","asset_id":"t1","market":"0xm","bids":[],"asks":[],"timestamp":"1782753357257","hash":"h1"}]`)
	events, err := upstreamws.ParseFrame(batch)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 {
		t.Fatalf("len %d", len(events))
	}
}

func TestPlannerPriorityAndLimits(t *testing.T) {
	t.Parallel()
	planner := upstreamws.NewPlanner(upstreamws.PlannerConfig{MaxSubscribedAssets: 2})
	planner.Subscribe("low", "market-1", upstreamws.PriorityLiquidActive)
	planner.Subscribe("high", "market-2", upstreamws.PriorityClientView)
	planner.Subscribe("mid", "market-3", upstreamws.PriorityWatchlist)
	tokens := planner.DesiredTokens()
	if len(tokens) != 2 {
		t.Fatalf("tokens %v", tokens)
	}
	if tokens[0] != "high" {
		t.Fatalf("expected high priority first, got %v", tokens)
	}
}
