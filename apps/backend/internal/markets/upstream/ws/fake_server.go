package ws

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// FakeServer is a deterministic upstream WebSocket for tests.
type FakeServer struct {
	server   *httptest.Server
	mu       sync.Mutex
	clients  map[*websocket.Conn]struct{}
	upgrader websocket.Upgrader
}

func NewFakeServer() *FakeServer {
	f := &FakeServer{
		clients: make(map[*websocket.Conn]struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
	f.server = httptest.NewServer(http.HandlerFunc(f.handle))
	return f
}

func (f *FakeServer) URL() string {
	return "ws" + strings.TrimPrefix(f.server.URL, "http")
}

func (f *FakeServer) Close() {
	f.server.Close()
}

func (f *FakeServer) handle(w http.ResponseWriter, r *http.Request) {
	conn, err := f.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	f.mu.Lock()
	f.clients[conn] = struct{}{}
	f.mu.Unlock()
	defer func() {
		f.mu.Lock()
		delete(f.clients, conn)
		f.mu.Unlock()
		conn.Close()
	}()
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			return
		}
		text := string(data)
		if text == "PING" {
			_ = conn.WriteMessage(websocket.TextMessage, []byte("PONG"))
			continue
		}
		var sub struct {
			AssetsIDs []string `json:"assets_ids"`
			Type      string   `json:"type"`
			Operation string   `json:"operation"`
		}
		if err := json.Unmarshal(data, &sub); err != nil {
			continue
		}
		tokens := sub.AssetsIDs
		if sub.Operation == "unsubscribe" {
			continue
		}
		for _, token := range tokens {
			f.sendBook(conn, token)
		}
	}
}

func (f *FakeServer) sendBook(conn *websocket.Conn, tokenID string) {
	book := map[string]any{
		"event_type": "book",
		"asset_id":   tokenID,
		"market":     "0xcondition",
		"bids":       []map[string]string{{"price": "0.4", "size": "100"}},
		"asks":       []map[string]string{{"price": "0.6", "size": "200"}},
		"timestamp":  time.Now().UnixMilli(),
		"hash":       "fake-hash-" + tokenID,
	}
	payload, _ := json.Marshal(book)
	_ = conn.WriteMessage(websocket.TextMessage, payload)
}

func (f *FakeServer) BroadcastPriceChange(tokenID, price, size, side string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	msg := map[string]any{
		"event_type": "price_change",
		"market":     "0xcondition",
		"timestamp":  time.Now().UnixMilli(),
		"price_changes": []map[string]string{
			{"asset_id": tokenID, "price": price, "size": size, "side": side, "hash": "pc-hash"},
		},
	}
	payload, _ := json.Marshal(msg)
	for conn := range f.clients {
		_ = conn.WriteMessage(websocket.TextMessage, payload)
	}
}

func (f *FakeServer) DisconnectAll() {
	f.mu.Lock()
	defer f.mu.Unlock()
	for conn := range f.clients {
		conn.Close()
	}
	f.clients = make(map[*websocket.Conn]struct{})
}

// FixtureBook returns a sanitized book event JSON fixture.
func FixtureBook(tokenID string) []byte {
	book := map[string]any{
		"event_type": "book",
		"asset_id":   tokenID,
		"market":     "0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75",
		"bids":       []map[string]string{{"price": "0.08", "size": "33343.4"}},
		"asks":       []map[string]string{{"price": "0.09", "size": "163939.58"}},
		"timestamp":  "1782753357257",
		"hash":       "0xabc123",
	}
	data, _ := json.Marshal(book)
	return data
}

// FixturePriceChange returns a sanitized price_change fixture.
func FixturePriceChange(tokenID string) []byte {
	msg := map[string]any{
		"event_type": "price_change",
		"market":     "0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75",
		"timestamp":  "1782753357257",
		"price_changes": []map[string]string{
			{"asset_id": tokenID, "price": "0.08", "size": "40000", "side": "BUY", "hash": "56621a12"},
		},
	}
	data, _ := json.Marshal(msg)
	return data
}

// FixtureLastTrade returns a sanitized last_trade_price fixture.
func FixtureLastTrade(tokenID string) []byte {
	msg := map[string]any{
		"event_type": "last_trade_price",
		"asset_id":   tokenID,
		"market":     "0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75",
		"price":      "0.08",
		"size":       "219.21",
		"side":       "SELL",
		"timestamp":  "1782753357257",
	}
	data, _ := json.Marshal(msg)
	return data
}

// FixtureTickSizeChange returns a sanitized tick_size_change fixture.
func FixtureTickSizeChange(tokenID string) []byte {
	msg := map[string]any{
		"event_type":    "tick_size_change",
		"asset_id":      tokenID,
		"market":        "0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75",
		"old_tick_size": "0.01",
		"new_tick_size": "0.001",
		"timestamp":     "1782753357257",
	}
	data, _ := json.Marshal(msg)
	return data
}
