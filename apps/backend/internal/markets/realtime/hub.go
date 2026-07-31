package realtime

import (
	"encoding/json"
	"sync"
	"sync/atomic"

	"retropick/apps/backend/internal/markets"
)

const (
	DefaultQueueSize    = 64
	DefaultMaxFrameSize = 64 << 10
)

// Client represents a connected public WebSocket client.
type Client struct {
	ID    string
	Send  chan []byte
	hub   *Hub
	mu    sync.RWMutex
	subs  map[string]subscription
}

// NewClient creates a hub client with the send buffer wired.
func NewClient(h *Hub, id string) *Client {
	return &Client{
		ID:   id,
		Send: make(chan []byte, h.maxQueue),
		hub:  h,
		subs: make(map[string]subscription),
	}
}

// Hub returns the client's hub (for tests).
func (c *Client) Hub() *Hub {
	return c.hub
}

type subscription struct {
	MarketID string
	TokenID  string
}

// Hub fans out realtime envelopes to subscribed clients.
type Hub struct {
	mu            sync.RWMutex
	clients       map[*Client]struct{}
	tokenClients  map[string]map[*Client]struct{}
	register      chan *Client
	unregister    chan *Client
	maxQueue      int
	overflowCount atomic.Uint64
	slowCount     atomic.Uint64
}

// NewHub creates a public realtime hub.
func NewHub(maxQueue int) *Hub {
	if maxQueue <= 0 {
		maxQueue = DefaultQueueSize
	}
	return &Hub{
		clients:      make(map[*Client]struct{}),
		tokenClients: make(map[string]map[*Client]struct{}),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		maxQueue:     maxQueue,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = struct{}{}
			h.mu.Unlock()
		case client := <-h.unregister:
			h.removeClient(client)
		}
	}
}

func (h *Hub) Register(client *Client) {
	h.register <- client
}

func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

func (h *Hub) Subscribe(client *Client, marketID, tokenID string) {
	key := tokenKey(marketID, tokenID)
	client.mu.Lock()
	client.subs[key] = subscription{MarketID: marketID, TokenID: tokenID}
	client.mu.Unlock()
	h.mu.Lock()
	if h.tokenClients[key] == nil {
		h.tokenClients[key] = make(map[*Client]struct{})
	}
	h.tokenClients[key][client] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) Unsubscribe(client *Client, marketID, tokenID string) {
	key := tokenKey(marketID, tokenID)
	client.mu.Lock()
	delete(client.subs, key)
	client.mu.Unlock()
	h.mu.Lock()
	if members, ok := h.tokenClients[key]; ok {
		delete(members, client)
		if len(members) == 0 {
			delete(h.tokenClients, key)
		}
	}
	h.mu.Unlock()
}

func (h *Hub) PublishToToken(marketID, tokenID string, payload []byte) {
	key := tokenKey(marketID, tokenID)
	h.mu.RLock()
	recipients := h.tokenClients[key]
	clients := make([]*Client, 0, len(recipients))
	for c := range recipients {
		clients = append(clients, c)
	}
	h.mu.RUnlock()
	for _, client := range clients {
		h.enqueue(client, payload)
	}
}

func (h *Hub) PublishToClient(client *Client, payload []byte) {
	h.enqueue(client, payload)
}

func (h *Hub) ConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) OverflowCount() uint64 {
	return h.overflowCount.Load()
}

func (h *Hub) SlowConsumerCount() uint64 {
	return h.slowCount.Load()
}

func (h *Hub) enqueue(client *Client, payload []byte) {
	if len(payload) > DefaultMaxFrameSize {
		h.overflowCount.Add(1)
		return
	}
	select {
	case client.Send <- payload:
	default:
		h.overflowCount.Add(1)
		h.slowCount.Add(1)
		h.Unregister(client)
	}
}

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[client]; !ok {
		return
	}
	delete(h.clients, client)
	client.mu.RLock()
	for key := range client.subs {
		if members, ok := h.tokenClients[key]; ok {
			delete(members, client)
			if len(members) == 0 {
				delete(h.tokenClients, key)
			}
		}
	}
	client.mu.RUnlock()
	close(client.Send)
}

func tokenKey(marketID, tokenID string) string {
	return marketID + "\x00" + tokenID
}

// MarshalEnvelope serializes an envelope for WebSocket delivery.
func MarshalEnvelope(envelope markets.RealtimeEnvelope) ([]byte, error) {
	return json.Marshal(envelope)
}

// CoalesceKey returns a key for event coalescing (latest wins per token+type).
func CoalesceKey(envelope markets.RealtimeEnvelope) string {
	return envelope.TokenID + ":" + envelope.Type
}
