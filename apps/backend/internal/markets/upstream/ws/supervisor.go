package ws

import (
	"context"
	"errors"
	"log/slog"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
)

const (
	defaultPingInterval  = 10 * time.Second
	defaultReadDeadline  = 30 * time.Second
	defaultWriteDeadline = 10 * time.Second
	defaultMaxFrameSize  = 64 << 10
	defaultReconnectMin  = 1 * time.Second
	defaultReconnectMax  = 60 * time.Second
	defaultMaxPongAge    = 30 * time.Second
)

// EventHandler receives parsed upstream events.
type EventHandler func(events []RawEvent)

// ShardDisconnectHandler is invoked when a shard connection drops.
type ShardDisconnectHandler func(shardID int, tokens []string)

// SupervisorConfig configures the upstream WebSocket supervisor.
type SupervisorConfig struct {
	URL              string
	MaxAssetsPerConn int
	PingInterval     time.Duration
	ReadDeadline     time.Duration
	WriteDeadline    time.Duration
	MaxFrameSize     int64
	MaxPongAge       time.Duration
	ReconnectMin     time.Duration
	ReconnectMax     time.Duration
	ReconcileInterval time.Duration
	Logger           *slog.Logger
	OnConnect        func()
	OnDisconnect     ShardDisconnectHandler
	Now              func() time.Time
}

// Supervisor manages upstream Polymarket WebSocket connections.
type Supervisor struct {
	cfg     SupervisorConfig
	handler EventHandler
	planner *Planner
	dialer  *websocket.Dialer
	logger  *slog.Logger
	now     func() time.Time

	mu          sync.Mutex
	conns       map[int]*shardConn
	running     bool
	cancel      context.CancelFunc
	reconnects  atomic.Uint64
	lastMsgAge  atomic.Int64
	lastPongAge atomic.Int64
	malformed   atomic.Uint64
	unknown     atomic.Uint64
}

type shardConn struct {
	id       int
	conn     *websocket.Conn
	tokens   map[string]struct{}
	tokensMu sync.Mutex
	writeMu  sync.Mutex
}

func (s *shardConn) tokenSnapshot() map[string]struct{} {
	s.tokensMu.Lock()
	defer s.tokensMu.Unlock()
	return tokenSet(s.tokens)
}

func (s *shardConn) replaceTokens(desired map[string]struct{}) {
	s.tokensMu.Lock()
	defer s.tokensMu.Unlock()
	s.tokens = desired
}

func (s *shardConn) addToken(token string) {
	s.tokensMu.Lock()
	defer s.tokensMu.Unlock()
	s.tokens[token] = struct{}{}
}

func (s *shardConn) removeToken(token string) {
	s.tokensMu.Lock()
	defer s.tokensMu.Unlock()
	delete(s.tokens, token)
}

func (s *shardConn) tokenCount() int {
	s.tokensMu.Lock()
	defer s.tokensMu.Unlock()
	return len(s.tokens)
}

// NewSupervisor creates an upstream supervisor.
func NewSupervisor(cfg SupervisorConfig, planner *Planner, handler EventHandler) (*Supervisor, error) {
	if cfg.URL == "" {
		return nil, errors.New("upstream url required")
	}
	if cfg.MaxAssetsPerConn <= 0 {
		cfg.MaxAssetsPerConn = 50
	}
	if cfg.PingInterval <= 0 {
		cfg.PingInterval = defaultPingInterval
	}
	if cfg.ReadDeadline <= 0 {
		cfg.ReadDeadline = defaultReadDeadline
	}
	if cfg.WriteDeadline <= 0 {
		cfg.WriteDeadline = defaultWriteDeadline
	}
	if cfg.MaxFrameSize <= 0 {
		cfg.MaxFrameSize = defaultMaxFrameSize
	}
	if cfg.MaxPongAge <= 0 {
		cfg.MaxPongAge = defaultMaxPongAge
	}
	if cfg.ReconnectMin <= 0 {
		cfg.ReconnectMin = defaultReconnectMin
	}
	if cfg.ReconnectMax <= 0 {
		cfg.ReconnectMax = defaultReconnectMax
	}
	if cfg.ReconcileInterval <= 0 && planner != nil {
		cfg.ReconcileInterval = planner.ReconcileInterval()
	}
	if cfg.ReconcileInterval <= 0 {
		cfg.ReconcileInterval = 5 * time.Second
	}
	logger := cfg.Logger
	if logger == nil {
		logger = slog.Default()
	}
	now := time.Now
	if cfg.Now != nil {
		now = cfg.Now
	}
	return &Supervisor{
		cfg:     cfg,
		handler: handler,
		planner: planner,
		dialer: &websocket.Dialer{
			HandshakeTimeout: 15 * time.Second,
			ReadBufferSize:   4096,
			WriteBufferSize:  4096,
		},
		logger: logger,
		now:    now,
		conns:  make(map[int]*shardConn),
	}, nil
}

// Start begins the supervisor loop.
func (s *Supervisor) Start(ctx context.Context) {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	runCtx, cancel := context.WithCancel(ctx)
	s.cancel = cancel
	s.running = true
	s.mu.Unlock()
	go s.run(runCtx)
}

// Stop shuts down all connections.
func (s *Supervisor) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cancel != nil {
		s.cancel()
		s.cancel = nil
	}
	for _, shard := range s.conns {
		_ = shard.conn.Close()
	}
	s.conns = make(map[int]*shardConn)
	s.running = false
}

// ReconnectCount returns total reconnect attempts.
func (s *Supervisor) ReconnectCount() uint64 {
	return s.reconnects.Load()
}

// ConnectedShardCount returns active upstream shard connections.
func (s *Supervisor) ConnectedShardCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.conns)
}

// LastMessageAge returns age of last upstream message.
func (s *Supervisor) LastMessageAge() time.Duration {
	age := s.lastMsgAge.Load()
	if age == 0 {
		return 0
	}
	return s.now().Sub(time.Unix(0, age))
}

// LastPongAge returns age of last upstream PONG.
func (s *Supervisor) LastPongAge() time.Duration {
	age := s.lastPongAge.Load()
	if age == 0 {
		return 0
	}
	return s.now().Sub(time.Unix(0, age))
}

// MalformedFrames returns malformed frame count.
func (s *Supervisor) MalformedFrames() uint64 {
	return s.malformed.Load()
}

func (s *Supervisor) run(ctx context.Context) {
	backoff := s.cfg.ReconnectMin
	ticker := time.NewTicker(s.cfg.ReconcileInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
		desired := s.planner.DesiredTokens()
		if len(desired) == 0 {
			backoff = s.cfg.ReconnectMin
			continue
		}
		s.closeStaleShards()
		err := s.reconcileShards(ctx, desired)
		if err != nil && !errors.Is(err, context.Canceled) {
			s.logger.Warn("upstream reconcile", "err", err)
			backoff = s.waitBackoff(ctx, backoff)
			continue
		}
		backoff = s.cfg.ReconnectMin
	}
}

func (s *Supervisor) closeStaleShards() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id, shard := range s.conns {
		pongAge := s.LastPongAge()
		msgAge := s.LastMessageAge()
		if pongAge > s.cfg.MaxPongAge && msgAge > s.cfg.MaxPongAge {
			tokens := shardTokenList(shard)
			_ = shard.conn.Close()
			delete(s.conns, id)
			if s.cfg.OnDisconnect != nil {
				s.cfg.OnDisconnect(id, tokens)
			}
		}
	}
}

func (s *Supervisor) reconcileShards(ctx context.Context, tokens []string) error {
	shards := partition(tokens, s.cfg.MaxAssetsPerConn)
	s.mu.Lock()
	active := make(map[int]struct{}, len(shards))
	for i := range shards {
		active[i] = struct{}{}
	}
	for id, shard := range s.conns {
		if _, ok := active[id]; !ok {
			tokensRemoved := shardTokenList(shard)
			_ = shard.conn.Close()
			delete(s.conns, id)
			if s.cfg.OnDisconnect != nil {
				s.cfg.OnDisconnect(id, tokensRemoved)
			}
		}
	}
	s.mu.Unlock()

	for id, batch := range shards {
		if err := s.ensureShard(ctx, id, batch); err != nil {
			return err
		}
	}
	return nil
}

func (s *Supervisor) ensureShard(ctx context.Context, id int, tokens []string) error {
	s.mu.Lock()
	shard, exists := s.conns[id]
	s.mu.Unlock()

	if !exists {
		conn, _, err := s.dialer.DialContext(ctx, s.cfg.URL, http.Header{})
		if err != nil {
			s.reconnects.Add(1)
			return err
		}
		conn.SetReadLimit(s.cfg.MaxFrameSize)
		shard = &shardConn{id: id, conn: conn, tokens: make(map[string]struct{})}
		s.mu.Lock()
		s.conns[id] = shard
		s.mu.Unlock()
		s.lastPongAge.Store(s.now().UnixNano())
		if s.cfg.OnConnect != nil {
			s.cfg.OnConnect()
		}
		go s.readLoop(ctx, shard)
		go s.pingLoop(ctx, shard)
	}

	current := shard.tokenSnapshot()
	desired := sliceToSet(tokens)
	toAdd, toRemove := diffSets(desired, current)
	if shard.tokenCount() == 0 && len(tokens) > 0 {
		msg, err := SubscriptionMessage(tokens)
		if err != nil {
			return err
		}
		if err := s.write(shard, websocket.TextMessage, msg); err != nil {
			return err
		}
		shard.replaceTokens(desired)
		return nil
	}
	if len(toAdd) > 0 {
		msg, err := UpdateSubscriptionMessage("subscribe", toAdd)
		if err != nil {
			return err
		}
		if err := s.write(shard, websocket.TextMessage, msg); err != nil {
			return err
		}
		for _, t := range toAdd {
			shard.addToken(t)
		}
	}
	if len(toRemove) > 0 {
		msg, err := UpdateSubscriptionMessage("unsubscribe", toRemove)
		if err != nil {
			return err
		}
		if err := s.write(shard, websocket.TextMessage, msg); err != nil {
			return err
		}
		for _, t := range toRemove {
			shard.removeToken(t)
		}
	}
	return nil
}

func (s *Supervisor) readLoop(ctx context.Context, shard *shardConn) {
	defer func() {
		tokens := shardTokenList(shard)
		s.mu.Lock()
		delete(s.conns, shard.id)
		s.mu.Unlock()
		_ = shard.conn.Close()
		if s.cfg.OnDisconnect != nil {
			s.cfg.OnDisconnect(shard.id, tokens)
		}
		s.reconnects.Add(1)
	}()
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		_ = shard.conn.SetReadDeadline(s.now().Add(s.cfg.ReadDeadline))
		_, data, err := shard.conn.ReadMessage()
		if err != nil {
			return
		}
		text := strings.TrimSpace(string(data))
		if text == "PONG" {
			s.lastPongAge.Store(s.now().UnixNano())
			continue
		}
		s.lastMsgAge.Store(s.now().UnixNano())
		events, err := ParseFrame(data)
		if err != nil {
			s.malformed.Add(1)
			continue
		}
		if len(events) > 0 && s.handler != nil {
			s.handler(events)
		}
	}
}

func (s *Supervisor) pingLoop(ctx context.Context, shard *shardConn) {
	ticker := time.NewTicker(s.cfg.PingInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.write(shard, websocket.TextMessage, []byte("PING")); err != nil {
				return
			}
		}
	}
}

func (s *Supervisor) write(shard *shardConn, msgType int, data []byte) error {
	shard.writeMu.Lock()
	defer shard.writeMu.Unlock()
	_ = shard.conn.SetWriteDeadline(s.now().Add(s.cfg.WriteDeadline))
	return shard.conn.WriteMessage(msgType, data)
}

func (s *Supervisor) waitBackoff(ctx context.Context, current time.Duration) time.Duration {
	jitter := time.Duration(rand.Int63n(int64(current/2 + 1)))
	wait := current + jitter
	select {
	case <-ctx.Done():
		return current
	case <-time.After(wait):
	}
	next := current * 2
	if next > s.cfg.ReconnectMax {
		next = s.cfg.ReconnectMax
	}
	return next
}

func shardTokenList(shard *shardConn) []string {
	shard.tokensMu.Lock()
	defer shard.tokensMu.Unlock()
	out := make([]string, 0, len(shard.tokens))
	for token := range shard.tokens {
		out = append(out, token)
	}
	return out
}

func partition(tokens []string, size int) map[int][]string {
	out := make(map[int][]string)
	for i, token := range tokens {
		shardID := i / size
		out[shardID] = append(out[shardID], token)
	}
	return out
}

func sliceToSet(tokens []string) map[string]struct{} {
	out := make(map[string]struct{}, len(tokens))
	for _, t := range tokens {
		out[t] = struct{}{}
	}
	return out
}

func tokenSet(m map[string]struct{}) map[string]struct{} {
	out := make(map[string]struct{}, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}

func diffSets(desired, current map[string]struct{}) (add, remove []string) {
	for k := range desired {
		if _, ok := current[k]; !ok {
			add = append(add, k)
		}
	}
	for k := range current {
		if _, ok := desired[k]; !ok {
			remove = append(remove, k)
		}
	}
	return add, remove
}
