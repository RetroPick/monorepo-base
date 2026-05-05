package wshub

import (
	"encoding/json"
	"sync"
)

const SendBufferSize = 256

type Client struct {
	C chan []byte

	mu            sync.RWMutex
	subscriptions map[string]struct{}
}

func (c *Client) Subscribe(channel string) {
	if channel == "" {
		return
	}
	c.mu.Lock()
	c.subscriptions[channel] = struct{}{}
	c.mu.Unlock()
}

func (c *Client) Unsubscribe(channel string) {
	c.mu.Lock()
	delete(c.subscriptions, channel)
	c.mu.Unlock()
}

func (c *Client) Subscriptions() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]string, 0, len(c.subscriptions))
	for channel := range c.subscriptions {
		out = append(out, channel)
	}
	return out
}

func (c *Client) wants(channel string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if len(c.subscriptions) == 0 {
		return true
	}
	_, ok := c.subscriptions[channel]
	return ok
}

type Hub struct {
	mu      sync.RWMutex
	clients map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*Client]struct{})}
}

func (h *Hub) Subscribe() *Client {
	client := &Client{
		C:             make(chan []byte, SendBufferSize),
		subscriptions: make(map[string]struct{}),
	}
	h.mu.Lock()
	h.clients[client] = struct{}{}
	h.mu.Unlock()
	return client
}

func (h *Hub) Unsubscribe(client *Client) {
	h.mu.Lock()
	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.C)
	}
	h.mu.Unlock()
}

func (h *Hub) Broadcast(msg []byte) {
	channel := messageChannel(msg)
	var slow []*Client

	h.mu.RLock()
	for client := range h.clients {
		if channel != "" && !client.wants(channel) {
			continue
		}
		select {
		case client.C <- msg:
		default:
			slow = append(slow, client)
		}
	}
	h.mu.RUnlock()

	for _, client := range slow {
		h.Unsubscribe(client)
	}
}

func messageChannel(msg []byte) string {
	var env struct {
		Channel string `json:"channel"`
	}
	_ = json.Unmarshal(msg, &env)
	return env.Channel
}
