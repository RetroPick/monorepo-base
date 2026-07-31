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

	"retropick/apps/backend/internal/markets"
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
	Logger            *slog.Logger
	Validator         TokenValidator
	OnSubscribe       func(marketID, tokenID string)
	OnUnsubscribe     func(marketID, tokenID string)
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
		cfg.IdleTimeout = 60 * time.Second
	}
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	allowed := make(map[string]struct{})
	for _, origin := range cfg.AllowedOrigins {
		allowed[origin] = struct{}{}
	}
	return &Handler{
		cfg:    cfg,
		logger: logger,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  4096,
			WriteBufferSize: 4096,
			CheckOrigin: func(r *http.Request) bool {
				if len(allowed) == 0 {
					return true
				}
				origin := r.Header.Get("Origin")
				_, ok := allowed[origin]
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
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	conn.SetReadLimit(h.cfg.MaxFrameSize)
	client := NewClient(h.cfg.Hub, uuid.NewString())
	h.cfg.Hub.Register(client)
	defer h.cfg.Hub.Unregister(client)

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		h.writePump(ctx, conn, client)
	}()
	go func() {
		defer wg.Done()
		h.readPump(ctx, r, conn, client)
	}()
	wg.Wait()
}

func (h *Handler) readPump(ctx context.Context, r *http.Request, conn *websocket.Conn, client *Client) {
	defer conn.Close()
	lastCommand := time.Now()
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		_ = conn.SetReadDeadline(time.Now().Add(h.cfg.IdleTimeout))
		_, data, err := conn.ReadMessage()
		if err != nil {
			return
		}
		if time.Since(lastCommand) < time.Second/time.Duration(h.cfg.MaxCommandRate) {
			continue
		}
		lastCommand = time.Now()
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
	hello, _ := json.Marshal(map[string]any{
		"eventType":     TypeHello,
		"schemaVersion": markets.SchemaVersion,
		"payload":       map[string]string{"status": "connected"},
	})
	h.cfg.Hub.PublishToClient(client, hello)

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-client.Send:
			if !ok {
				return
			}
			_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
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
	ack, _ := json.Marshal(map[string]any{
		"eventType":     TypeSubscribed,
		"schemaVersion": markets.SchemaVersion,
		"marketId":      cmd.MarketID,
		"tokenId":       cmd.TokenID,
	})
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
	ack, _ := json.Marshal(map[string]any{
		"eventType":     TypeUnsubscribed,
		"schemaVersion": markets.SchemaVersion,
		"marketId":      cmd.MarketID,
		"tokenId":       cmd.TokenID,
	})
	h.cfg.Hub.PublishToClient(client, ack)
}

func (h *Handler) sendError(client *Client, code, message string) {
	payload, _ := json.Marshal(map[string]any{
		"eventType":     TypeError,
		"schemaVersion": markets.SchemaVersion,
		"payload": map[string]string{
			"code":    code,
			"message": message,
		},
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
