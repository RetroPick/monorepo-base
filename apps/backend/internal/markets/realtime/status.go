package realtime

import (
	"sync"
	"sync/atomic"
	"time"

	upstreamws "retropick/apps/backend/internal/markets/upstream/ws"
)

// RuntimeState describes live realtime ingestion health.
type RuntimeState string

const (
	StateDisabled      RuntimeState = "DISABLED"
	StateIdleReady     RuntimeState = "IDLE_READY"
	StateConnecting    RuntimeState = "CONNECTING"
	StateSynchronizing RuntimeState = "SYNCHRONIZING"
	StateOperational   RuntimeState = "OPERATIONAL"
	StateDegraded      RuntimeState = "DEGRADED"
	StateUnavailable   RuntimeState = "UNAVAILABLE"
)

// StatusProvider exposes live realtime truth for capabilities and health.
type StatusProvider struct {
	mu              sync.RWMutex
	state           RuntimeState
	registryReady   bool
	hubRunning      bool
	connectedShards atomic.Int32
	syncedTokens    atomic.Int32
	demandedTokens  atomic.Int32
	lastUpstreamMsg atomic.Int64
	enabled         bool
}

func NewStatusProvider(enabled bool) *StatusProvider {
	s := &StatusProvider{enabled: enabled}
	if !enabled {
		s.state = StateDisabled
	} else {
		s.state = StateUnavailable
	}
	return s
}

func (s *StatusProvider) SetRegistryReady(ok bool) {
	s.mu.Lock()
	s.registryReady = ok
	s.recomputeLocked()
	s.mu.Unlock()
}

func (s *StatusProvider) SetHubRunning(ok bool) {
	s.mu.Lock()
	s.hubRunning = ok
	s.recomputeLocked()
	s.mu.Unlock()
}

func (s *StatusProvider) SetConnectedShards(n int32) {
	s.connectedShards.Store(n)
	s.recompute()
}

func (s *StatusProvider) SetSyncedTokens(n int32) {
	s.syncedTokens.Store(n)
	s.recompute()
}

func (s *StatusProvider) SetDemandedTokens(n int32) {
	s.demandedTokens.Store(n)
	s.recompute()
}

func (s *StatusProvider) MarkUpstreamMessage(at time.Time) {
	s.lastUpstreamMsg.Store(at.UnixNano())
	s.recompute()
}

func (s *StatusProvider) State() RuntimeState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.state
}

func (s *StatusProvider) Operational() bool {
	st := s.State()
	return st == StateOperational || st == StateDegraded || st == StateIdleReady
}

func (s *StatusProvider) CapabilitiesRealtime() bool {
	if !s.enabled {
		return false
	}
	s.mu.RLock()
	ready := s.registryReady && s.hubRunning
	s.mu.RUnlock()
	if !ready {
		return false
	}
	st := s.State()
	return st != StateUnavailable && st != StateDisabled
}

func (s *StatusProvider) HealthCheck() string {
	switch s.State() {
	case StateDisabled:
		return "disabled"
	case StateOperational, StateIdleReady:
		return "ok"
	case StateDegraded, StateSynchronizing, StateConnecting:
		return "degraded"
	default:
		return "unavailable"
	}
}

func (s *StatusProvider) recompute() {
	s.mu.Lock()
	s.recomputeLocked()
	s.mu.Unlock()
}

func (s *StatusProvider) recomputeLocked() {
	if !s.enabled {
		s.state = StateDisabled
		return
	}
	if !s.registryReady || !s.hubRunning {
		s.state = StateUnavailable
		return
	}
	demanded := s.demandedTokens.Load()
	if demanded == 0 {
		s.state = StateIdleReady
		return
	}
	synced := s.syncedTokens.Load()
	shards := s.connectedShards.Load()
	if shards == 0 {
		s.state = StateConnecting
		return
	}
	if synced < demanded {
		s.state = StateSynchronizing
		return
	}
	msgAge := time.Duration(0)
	if ts := s.lastUpstreamMsg.Load(); ts > 0 {
		msgAge = time.Since(time.Unix(0, ts))
	}
	if msgAge > 30*time.Second {
		s.state = StateDegraded
		return
	}
	s.state = StateOperational
}

// UpdateFromSupervisor refreshes shard/message metrics.
func (s *StatusProvider) UpdateFromSupervisor(supervisor *upstreamws.Supervisor, planner *upstreamws.Planner, producer *Producer) {
	if supervisor == nil {
		return
	}
	s.SetConnectedShards(int32(supervisor.ConnectedShardCount()))
	if age := supervisor.LastMessageAge(); age > 0 {
		s.MarkUpstreamMessage(time.Now().Add(-age))
	}
	if planner != nil {
		s.SetDemandedTokens(int32(planner.DemandCount()))
	}
	if producer != nil {
		s.SetSyncedTokens(int32(producer.SynchronizedBookCount()))
	}
}
