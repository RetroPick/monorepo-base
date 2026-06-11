package wshub

import (
	"encoding/json"
	"sync"
)

const SendBufferSize = 256

type Client struct {
	C chan []byte

	hub           *Hub
	mu            sync.RWMutex
	subscriptions map[string]struct{}
}

func (c *Client) Subscribe(channel string) {
	if channel == "" {
		return
	}
	c.mu.Lock()
	_, existed := c.subscriptions[channel]
	c.subscriptions[channel] = struct{}{}
	c.mu.Unlock()
	if !existed && c.hub != nil {
		c.hub.trackSubscription(c, channel)
	}
}

func (c *Client) Unsubscribe(channel string) {
	c.mu.Lock()
	_, existed := c.subscriptions[channel]
	delete(c.subscriptions, channel)
	remaining := len(c.subscriptions)
	c.mu.Unlock()
	if existed && c.hub != nil {
		c.hub.dropSubscription(c, channel, remaining == 0)
	}
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
	_, ok := c.subscriptions[channel]
	return ok
}

type Hub struct {
	mu            sync.RWMutex
	clients       map[*Client]struct{}
	channelClient map[string]map[*Client]struct{}
}

func NewHub() *Hub {
	return &Hub{
		clients:       make(map[*Client]struct{}),
		channelClient: make(map[string]map[*Client]struct{}),
	}
}

func (h *Hub) Subscribe() *Client {
	client := &Client{
		C:             make(chan []byte, SendBufferSize),
		hub:           h,
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
		for channel := range client.subscriptions {
			if members, ok := h.channelClient[channel]; ok {
				delete(members, client)
				if len(members) == 0 {
					delete(h.channelClient, channel)
				}
			}
		}
		close(client.C)
	}
	h.mu.Unlock()
}

func (h *Hub) Broadcast(msg []byte) {
	channel := messageChannel(msg)
	var slow []*Client
	recipients := map[*Client]struct{}{}

	h.mu.RLock()
	if channel != "" {
		for client := range h.channelClient[channel] {
			recipients[client] = struct{}{}
		}
	}
	for client := range recipients {
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

func (h *Hub) trackSubscription(client *Client, channel string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.channelClient[channel] == nil {
		h.channelClient[channel] = make(map[*Client]struct{})
	}
	h.channelClient[channel][client] = struct{}{}
}

func (h *Hub) dropSubscription(client *Client, channel string, _ bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if members, ok := h.channelClient[channel]; ok {
		delete(members, client)
		if len(members) == 0 {
			delete(h.channelClient, channel)
		}
	}
}

func messageChannel(msg []byte) string {
	var env struct {
		Channel string `json:"channel"`
	}
	_ = json.Unmarshal(msg, &env)
	return env.Channel
}
