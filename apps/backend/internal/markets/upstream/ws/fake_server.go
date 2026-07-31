package ws

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// FakeServer is a deterministic upstream WebSocket for tests.
type FakeServer struct {
	server   *httptest.Server
	mu       sync.Mutex
	clients  map[*websocket.Conn]*clientConn
	subs     map[string]int
	upgrader websocket.Upgrader
}

type clientConn struct {
	conn    *websocket.Conn
	writeMu sync.Mutex
}

func NewFakeServer() *FakeServer {
	f := &FakeServer{
		clients: make(map[*websocket.Conn]*clientConn),
		subs:    make(map[string]int),
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
	f.clients[conn] = &clientConn{conn: conn}
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
			f.mu.Lock()
			f.subs[token]++
			f.mu.Unlock()
			f.sendBook(conn, token, "upstream-ws-hash-"+token)
		}
	}
}

// SubscribedTokens returns tokens observed in subscribe messages.
func (f *FakeServer) SubscribedTokens() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]string, 0, len(f.subs))
	for token := range f.subs {
		out = append(out, token)
	}
	return out
}

// PushBook broadcasts a book event with an explicit hash to all clients.
func (f *FakeServer) PushBook(tokenID, hash string) {
	f.mu.Lock()
	clients := make([]*clientConn, 0, len(f.clients))
	for _, client := range f.clients {
		clients = append(clients, client)
	}
	f.mu.Unlock()
	payload := bookWirePayload(tokenID, hash)
	for _, client := range clients {
		client.writeMu.Lock()
		_ = client.conn.WriteMessage(websocket.TextMessage, payload)
		client.writeMu.Unlock()
	}
}

func (f *FakeServer) sendBook(conn *websocket.Conn, tokenID, hash string) {
	f.mu.Lock()
	client := f.clients[conn]
	f.mu.Unlock()
	if client == nil {
		return
	}
	payload := bookWirePayload(tokenID, hash)
	client.writeMu.Lock()
	_ = client.conn.WriteMessage(websocket.TextMessage, payload)
	client.writeMu.Unlock()
}

// bookWirePayload returns a Polymarket snake_case book frame with fields required by BuildSnapshot.
func bookWirePayload(tokenID, hash string) []byte {
	if hash == "" {
		hash = "fake-hash-" + tokenID
	}
	book := map[string]any{
		"event_type":     "book",
		"asset_id":       tokenID,
		"market":         "0xcondition",
		"bids":           []map[string]string{{"price": "0.4", "size": "100"}},
		"asks":           []map[string]string{{"price": "0.6", "size": "200"}},
		"timestamp":      strconv.FormatInt(time.Now().UnixMilli(), 10),
		"hash":           hash,
		"min_order_size": "5",
		"tick_size":      "0.01",
	}
	payload, _ := json.Marshal(book)
	return payload
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
	for _, client := range f.clients {
		client.writeMu.Lock()
		_ = client.conn.WriteMessage(websocket.TextMessage, payload)
		client.writeMu.Unlock()
	}
}

func (f *FakeServer) DisconnectAll() {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, client := range f.clients {
		client.writeMu.Lock()
		_ = client.conn.Close()
		client.writeMu.Unlock()
	}
	f.clients = make(map[*websocket.Conn]*clientConn)
}

// FixtureBook returns a sanitized book event JSON fixture.
func FixtureBook(tokenID string) []byte {
	return bookWirePayload(tokenID, "0xabc123")
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
