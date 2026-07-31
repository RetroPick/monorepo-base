package ws

import (
	"sort"
	"sync"
	"time"
)

// TokenPriority describes subscription priority tier.
type TokenPriority int

const (
	PriorityClientView TokenPriority = iota
	PriorityWatchlist
	PriorityLiquidActive
)

// TokenRequest is a subscription request with priority.
type TokenRequest struct {
	TokenID   string
	MarketID  string
	Priority  TokenPriority
	Requested time.Time
	RefCount  int
}

// PlannerConfig bounds upstream subscriptions.
type PlannerConfig struct {
	MaxSubscribedAssets int
	ReconcileInterval   time.Duration
	EvictionCooldown    time.Duration
}

// Planner selects which tokens to subscribe upstream.
type Planner struct {
	cfg      PlannerConfig
	mu       sync.RWMutex
	requests map[string]TokenRequest
	evicted  map[string]time.Time
}

func NewPlanner(cfg PlannerConfig) *Planner {
	if cfg.MaxSubscribedAssets <= 0 {
		cfg.MaxSubscribedAssets = 200
	}
	if cfg.ReconcileInterval <= 0 {
		cfg.ReconcileInterval = 5 * time.Second
	}
	if cfg.EvictionCooldown <= 0 {
		cfg.EvictionCooldown = 30 * time.Second
	}
	return &Planner{
		cfg:      cfg,
		requests: make(map[string]TokenRequest),
		evicted:  make(map[string]time.Time),
	}
}

func (p *Planner) Subscribe(tokenID, marketID string, priority TokenPriority) {
	if tokenID == "" {
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.evicted, tokenID)
	req, ok := p.requests[tokenID]
	if ok {
		req.RefCount++
		if req.MarketID == "" {
			req.MarketID = marketID
		}
	} else {
		req = TokenRequest{
			TokenID:   tokenID,
			MarketID:  marketID,
			Priority:  priority,
			Requested: time.Now().UTC(),
			RefCount:  1,
		}
	}
	p.requests[tokenID] = req
}

func (p *Planner) Unsubscribe(tokenID string) {
	if tokenID == "" {
		return
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	req, ok := p.requests[tokenID]
	if !ok {
		return
	}
	req.RefCount--
	if req.RefCount <= 0 {
		delete(p.requests, tokenID)
		p.evicted[tokenID] = time.Now().UTC()
		return
	}
	p.requests[tokenID] = req
}

func (p *Planner) DesiredTokens() []string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	now := time.Now().UTC()
	list := make([]TokenRequest, 0, len(p.requests))
	for tokenID, req := range p.requests {
		if req.RefCount <= 0 {
			continue
		}
		if evictedAt, ok := p.evicted[tokenID]; ok && now.Sub(evictedAt) < p.cfg.EvictionCooldown {
			continue
		}
		list = append(list, req)
	}
	sort.SliceStable(list, func(i, j int) bool {
		if list[i].Priority != list[j].Priority {
			return list[i].Priority < list[j].Priority
		}
		return list[i].Requested.Before(list[j].Requested)
	})
	limit := p.cfg.MaxSubscribedAssets
	if limit > len(list) {
		limit = len(list)
	}
	out := make([]string, 0, limit)
	for i := 0; i < limit; i++ {
		out = append(out, list[i].TokenID)
	}
	return out
}

func (p *Planner) DemandCount() int {
	p.mu.RLock()
	defer p.mu.RUnlock()
	count := 0
	for _, req := range p.requests {
		if req.RefCount > 0 {
			count++
		}
	}
	return count
}

func (p *Planner) SubscribedCount() int {
	return len(p.DesiredTokens())
}

func (p *Planner) EligibleCount() int {
	return p.DemandCount()
}

func (p *Planner) CoverageRatio() float64 {
	eligible := p.EligibleCount()
	if eligible == 0 {
		return 1
	}
	return float64(p.SubscribedCount()) / float64(eligible)
}

func (p *Planner) ReconcileInterval() time.Duration {
	return p.cfg.ReconcileInterval
}
