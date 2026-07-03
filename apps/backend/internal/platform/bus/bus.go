package bus

import (
	"context"
	"fmt"
	"sync"
)

// Event is a domain event published after chain log decode or internal actions.
type Event interface {
	Topic() string
}

// Handler processes a single event. Errors propagate to the publisher.
type Handler func(ctx context.Context, e Event) error

// Bus is an in-process event bus. Durability lives in Postgres, not here.
type Bus interface {
	Publish(ctx context.Context, e Event) error
	Subscribe(topic string, h Handler)
}

type inProcessBus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

// New returns a thread-safe in-process bus.
func New() Bus {
	return &inProcessBus{handlers: make(map[string][]Handler)}
}

func (b *inProcessBus) Subscribe(topic string, h Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[topic] = append(b.handlers[topic], h)
}

func (b *inProcessBus) Publish(ctx context.Context, e Event) error {
	if e == nil {
		return fmt.Errorf("bus: nil event")
	}
	topic := e.Topic()
	b.mu.RLock()
	handlers := append([]Handler(nil), b.handlers[topic]...)
	b.mu.RUnlock()
	for _, h := range handlers {
		if err := h(ctx, e); err != nil {
			return fmt.Errorf("bus: handler %q: %w", topic, err)
		}
	}
	return nil
}
