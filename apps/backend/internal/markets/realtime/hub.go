package realtime

import (
	"context"
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
	ID         string
	Send       chan []byte
	hub        *Hub
	mu         sync.RWMutex
	subs       map[string]subscription
	sendMu     sync.RWMutex
	sendClosed bool
	closeOnce  sync.Once
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
	mu              sync.RWMutex
	clients         map[*Client]struct{}
	tokenClients    map[string]map[*Client]struct{}
	ipClients       map[string]int
	register        chan *Client
	unregister      chan *Client
	maxQueue        int
	maxConnections  int
	maxPerIP        int
	overflowCount   atomic.Uint64
	slowCount       atomic.Uint64
	running         atomic.Bool
	stopCh          chan struct{}
	onClientRemoved func(*Client)
}

// HubConfig configures hub limits.
type HubConfig struct {
	MaxQueue       int
	MaxConnections int
	MaxPerIP       int
}

// NewHub creates a public realtime hub.
func NewHub(cfg HubConfig) *Hub {
	maxQueue := cfg.MaxQueue
	if maxQueue <= 0 {
		maxQueue = DefaultQueueSize
	}
	maxConn := cfg.MaxConnections
	if maxConn <= 0 {
		maxConn = 1000
	}
	maxPerIP := cfg.MaxPerIP
	if maxPerIP <= 0 {
		maxPerIP = 50
	}
	return &Hub{
		clients:        make(map[*Client]struct{}),
		tokenClients:   make(map[string]map[*Client]struct{}),
		ipClients:      make(map[string]int),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		maxQueue:       maxQueue,
		maxConnections: maxConn,
		maxPerIP:       maxPerIP,
		stopCh:         make(chan struct{}),
	}
}

// Start runs the hub event loop until Stop is called.
func (h *Hub) Start(ctx context.Context) {
	if h.running.Swap(true) {
		return
	}
	go h.run(ctx)
}

func (h *Hub) run(ctx context.Context) {
	defer h.running.Store(false)
	for {
		select {
		case <-ctx.Done():
			h.shutdown()
			return
		case <-h.stopCh:
			h.shutdown()
			return
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = struct{}{}
			h.mu.Unlock()
		case client := <-h.unregister:
			h.removeClient(client)
		}
	}
}

// Stop signals graceful hub shutdown.
func (h *Hub) Stop() {
	if !h.running.Load() {
		return
	}
	close(h.stopCh)
}

func (h *Hub) shutdown() {
	h.mu.Lock()
	clients := make([]*Client, 0, len(h.clients))
	for client := range h.clients {
		clients = append(clients, client)
	}
	h.mu.Unlock()
	for _, client := range clients {
		h.removeClient(client)
	}
}

// SetOnClientRemoved registers a callback when a client is removed.
func (h *Hub) SetOnClientRemoved(fn func(*Client)) {
	h.onClientRemoved = fn
}

// CanAccept reports whether a new connection is allowed.
func (h *Hub) CanAccept(clientIP string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	if len(h.clients) >= h.maxConnections {
		return false
	}
	if clientIP != "" && h.ipClients[clientIP] >= h.maxPerIP {
		return false
	}
	return true
}

func (h *Hub) trackIP(clientIP string, delta int) {
	if clientIP == "" {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.ipClients[clientIP] += delta
	if h.ipClients[clientIP] <= 0 {
		delete(h.ipClients, clientIP)
	}
}

func (h *Hub) Register(client *Client, clientIP string) bool {
	if !h.CanAccept(clientIP) {
		return false
	}
	h.trackIP(clientIP, 1)
	h.mu.Lock()
	h.clients[client] = struct{}{}
	h.mu.Unlock()
	return true
}

func (h *Hub) Unregister(client *Client, clientIP string) {
	h.unregister <- client
	h.trackIP(clientIP, -1)
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
	client.sendMu.RLock()
	if client.sendClosed {
		client.sendMu.RUnlock()
		return
	}
	select {
	case client.Send <- payload:
		client.sendMu.RUnlock()
	default:
		client.sendMu.RUnlock()
		h.overflowCount.Add(1)
		h.slowCount.Add(1)
		h.dropSlowClient(client)
	}
}

func (c *Client) closeSend() {
	c.closeOnce.Do(func() {
		c.sendMu.Lock()
		defer c.sendMu.Unlock()
		c.sendClosed = true
		close(c.Send)
	})
}

func (h *Hub) dropSlowClient(client *Client) {
	h.mu.Lock()
	if _, ok := h.clients[client]; !ok {
		h.mu.Unlock()
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
	h.mu.Unlock()
	client.closeSend()
	if h.onClientRemoved != nil {
		h.onClientRemoved(client)
	}
}

func (h *Hub) removeClient(client *Client) {
	h.mu.Lock()
	if _, ok := h.clients[client]; !ok {
		h.mu.Unlock()
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
	h.mu.Unlock()
	client.closeSend()
	if h.onClientRemoved != nil {
		h.onClientRemoved(client)
	}
}

func tokenKey(marketID, tokenID string) string {
	return marketID + "\x00" + tokenID
}

// MarshalEnvelope serializes an envelope for WebSocket delivery.
func MarshalEnvelope(envelope markets.RealtimeEnvelope) ([]byte, error) {
	return json.Marshal(DataFromRealtime(envelope))
}

// CoalesceKey returns a key for event coalescing (latest wins per token+type).
func CoalesceKey(envelope markets.RealtimeEnvelope) string {
	return envelope.TokenID + ":" + envelope.Type
}
