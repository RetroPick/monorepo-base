package bus

import (
	"context"
	"errors"
	"testing"
)

type testEvent struct {
	topic string
}

func (e testEvent) Topic() string { return e.topic }

func TestBusPublishSubscribe(t *testing.T) {
	b := New()
	var got []string
	b.Subscribe("market.template", func(_ context.Context, e Event) error {
		got = append(got, e.Topic())
		return nil
	})
	if err := b.Publish(context.Background(), testEvent{topic: "market.template"}); err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0] != "market.template" {
		t.Fatalf("got %v", got)
	}
}

func TestBusHandlerError(t *testing.T) {
	b := New()
	b.Subscribe("epoch.opened", func(_ context.Context, _ Event) error {
		return errors.New("boom")
	})
	err := b.Publish(context.Background(), testEvent{topic: "epoch.opened"})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestBusNilEvent(t *testing.T) {
	b := New()
	if err := b.Publish(context.Background(), nil); err == nil {
		t.Fatal("expected nil event error")
	}
}
