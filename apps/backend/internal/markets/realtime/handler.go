package realtime

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"retropick/apps/backend/internal/markets/origin"
)

// TokenValidator checks catalog membership for token subscriptions.
type TokenValidator interface {
	ValidateToken(ctx context.Context, marketID, tokenID string) error
}

// HandlerConfig configures the public realtime WebSocket handler.
type HandlerConfig struct {
	Hub               *Hub
	Planner           SubscriptionPlanner
	AllowedOrigins    []string
	MaxSubscriptions  int
	MaxCommandRate    int
	MaxFrameSize      int64
	IdleTimeout       time.Duration
	WriteTimeout      time.Duration
	HeartbeatInterval time.Duration
	Logger            *slog.Logger
	Validator         TokenValidator
	OnSubscribe       func(marketID, tokenID string)
	OnUnsubscribe     func(marketID, tokenID string)
	Now               func() time.Time
}

// SubscriptionPlanner updates upstream subscription planner.
type SubscriptionPlanner interface {
	Subscribe(tokenID, marketID string)
	Unsubscribe(tokenID string)
}

type clientCommand struct {
	Command  string `json:"command"`
	MarketID string `json:"marketId"`
	TokenID  string `json:"tokenId"`
}

// Handler serves the public BFF WebSocket endpoint.
type Handler struct {
	cfg      HandlerConfig
	upgrader websocket.Upgrader
	logger   *slog.Logger
	now      func() time.Time
}

func NewHandler(cfg HandlerConfig) *Handler {
	if cfg.MaxSubscriptions <= 0 {
		cfg.MaxSubscriptions = 20
	}
	if cfg.MaxCommandRate <= 0 {
		cfg.MaxCommandRate = 10
	}
	if cfg.MaxFrameSize <= 0 {
		cfg.MaxFrameSize = DefaultMaxFrameSize
	}
	if cfg.IdleTimeout <= 0 {
		cfg.IdleTimeout = 120 * time.Second
	}
	if cfg.WriteTimeout <= 0 {
		cfg.WriteTimeout = 10 * time.Second
	}
	if cfg.HeartbeatInterval <= 0 {
		cfg.HeartbeatInterval = 30 * time.Second
	}
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	allowed := make(map[string]struct{})
	for _, rawOrigin := range cfg.AllowedOrigins {
		normalized, ok := origin.Normalize(rawOrigin)
		if ok {
			allowed[normalized] = struct{}{}
		}
	}
	return &Handler{
		cfg:    cfg,
		logger: logger,
		now:    now,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  4096,
			WriteBufferSize: 4096,
			CheckOrigin: func(r *http.Request) bool {
				values := r.Header.Values("Origin")
				if len(values) != 1 || strings.Contains(values[0], ",") {
					return false
				}
				normalized, ok := origin.Normalize(values[0])
				if !ok {
					return false
				}
				_, ok = allowed[normalized]
				return ok
			},
		},
	}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/api/v1/markets/realtime", h.ServeWS)
}

func (h *Handler) ServeWS(w http.ResponseWriter, r *http.Request) {
	if h.cfg.Hub == nil {
		http.Error(w, "realtime unavailable", http.StatusServiceUnavailable)
		return
	}
	clientIP := clientIPFromRequest(r)
	if !h.cfg.Hub.CanAccept(clientIP) {
		http.Error(w, "connection limit exceeded", http.StatusTooManyRequests)
		return
	}
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	conn.SetReadLimit(h.cfg.MaxFrameSize)
	client := NewClient(h.cfg.Hub, uuid.NewString())
	if !h.cfg.Hub.Register(client, clientIP) {
		_ = conn.Close()
		return
	}
	defer func() {
		h.unsubscribeAll(client)
		h.cfg.Hub.Unregister(client, clientIP)
	}()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		h.writePump(ctx, conn, client)
		cancel()
	}()
	go func() {
		defer wg.Done()
		h.readPump(ctx, conn, client)
		cancel()
	}()
	wg.Wait()
}

func clientIPFromRequest(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func (h *Handler) unsubscribeAll(client *Client) {
	client.mu.RLock()
	subs := make([]subscription, 0, len(client.subs))
	for _, sub := range client.subs {
		subs = append(subs, sub)
	}
	client.mu.RUnlock()
	for _, sub := range subs {
		if h.cfg.Planner != nil {
			h.cfg.Planner.Unsubscribe(sub.TokenID)
		}
		if h.cfg.OnUnsubscribe != nil {
			h.cfg.OnUnsubscribe(sub.MarketID, sub.TokenID)
		}
	}
}

func (h *Handler) readPump(ctx context.Context, conn *websocket.Conn, client *Client) {
	defer conn.Close()
	limiter := newCommandLimiter(h.cfg.MaxCommandRate, h.now)
	firstCommand := true
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		_ = conn.SetReadDeadline(h.now().Add(h.cfg.IdleTimeout))
		_, data, err := conn.ReadMessage()
		if err != nil {
			return
		}
		if !firstCommand && !limiter.Allow() {
			h.sendError(client, "rate_limited", "command rate exceeded")
			continue
		}
		firstCommand = false
		var cmd clientCommand
		if err := json.Unmarshal(data, &cmd); err != nil {
			h.sendError(client, "invalid_command", "malformed JSON")
			continue
		}
		switch strings.ToLower(cmd.Command) {
		case "subscribe":
			h.handleSubscribe(ctx, client, cmd)
		case "unsubscribe":
			h.handleUnsubscribe(client, cmd)
		default:
			h.sendError(client, "invalid_command", "unknown command")
		}
	}
}

func (h *Handler) writePump(ctx context.Context, conn *websocket.Conn, client *Client) {
	hello, _ := NewControlMessage(TypeHello, "", "", map[string]string{"status": "connected"})
	h.cfg.Hub.PublishToClient(client, hello)

	heartbeat := time.NewTicker(h.cfg.HeartbeatInterval)
	defer heartbeat.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-heartbeat.C:
			_ = conn.SetWriteDeadline(h.now().Add(h.cfg.WriteTimeout))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case msg, ok := <-client.Send:
			if !ok {
				return
			}
			_ = conn.SetWriteDeadline(h.now().Add(h.cfg.WriteTimeout))
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		}
	}
}

func (h *Handler) handleSubscribe(ctx context.Context, client *Client, cmd clientCommand) {
	if cmd.MarketID == "" || cmd.TokenID == "" {
		h.sendError(client, "invalid_argument", "marketId and tokenId required")
		return
	}
	client.mu.RLock()
	count := len(client.subs)
	client.mu.RUnlock()
	if count >= h.cfg.MaxSubscriptions {
		h.sendError(client, "subscription_limit", "max subscriptions exceeded")
		return
	}
	if h.cfg.Validator != nil {
		if err := h.cfg.Validator.ValidateToken(ctx, cmd.MarketID, cmd.TokenID); err != nil {
			h.sendError(client, "invalid_token", "token not in catalog")
			return
		}
	}
	h.cfg.Hub.Subscribe(client, cmd.MarketID, cmd.TokenID)
	if h.cfg.Planner != nil {
		h.cfg.Planner.Subscribe(cmd.TokenID, cmd.MarketID)
	}
	if h.cfg.OnSubscribe != nil {
		h.cfg.OnSubscribe(cmd.MarketID, cmd.TokenID)
	}
	ack, _ := NewControlMessage(TypeSubscribed, cmd.MarketID, cmd.TokenID, map[string]string{"status": "ok"})
	h.cfg.Hub.PublishToClient(client, ack)
}

func (h *Handler) handleUnsubscribe(client *Client, cmd clientCommand) {
	h.cfg.Hub.Unsubscribe(client, cmd.MarketID, cmd.TokenID)
	if h.cfg.Planner != nil {
		h.cfg.Planner.Unsubscribe(cmd.TokenID)
	}
	if h.cfg.OnUnsubscribe != nil {
		h.cfg.OnUnsubscribe(cmd.MarketID, cmd.TokenID)
	}
	ack, _ := NewControlMessage(TypeUnsubscribed, cmd.MarketID, cmd.TokenID, map[string]string{"status": "ok"})
	h.cfg.Hub.PublishToClient(client, ack)
}

func (h *Handler) sendError(client *Client, code, message string) {
	payload, _ := NewControlMessage(TypeError, "", "", map[string]string{
		"code":    code,
		"message": message,
	})
	h.cfg.Hub.PublishToClient(client, payload)
}

// CatalogTokenValidator validates tokens against catalog projection.
type CatalogTokenValidator struct {
	Lookup func(ctx context.Context, tokenID string) (marketID string, ok bool, err error)
}

func (v CatalogTokenValidator) ValidateToken(ctx context.Context, marketID, tokenID string) error {
	if v.Lookup == nil {
		return nil
	}
	foundMarket, ok, err := v.Lookup(ctx, tokenID)
	if err != nil {
		return err
	}
	if !ok || foundMarket != marketID {
		return fmt.Errorf("%w: token not in catalog", errors.New("invalid"))
	}
	return nil
}
