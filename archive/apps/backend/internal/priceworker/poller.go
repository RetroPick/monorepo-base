package priceworker

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"math/big"
	"strings"
	"sync"
	"time"

	"retropick/apps/backend/internal/feedregistry"
	"retropick/apps/backend/internal/marketdata"
)

type Reading struct {
	RoundID         string
	Answer          int64
	UpdatedAt       time.Time
	AnsweredInRound string
	Decimals        uint8
}

type Reader interface {
	Latest(context.Context, string) (Reading, error)
}

type Sink interface {
	IngestTick(context.Context, marketdata.Tick) error
	UpsertFeedHealth(context.Context, marketdata.FeedHealth) error
}

type Stats struct {
	SuccessfulPolls uint64
	FailedPolls     uint64
	IngestedTicks   uint64
}

type feedState struct {
	roundID       string
	lastPersisted time.Time
}

type Poller struct {
	feeds     []feedregistry.Entry
	reader    Reader
	sink      Sink
	heartbeat time.Duration
	log       *slog.Logger
	now       func() time.Time
	state     map[string]feedState
	statsMu   sync.RWMutex
	stats     Stats
}

func ValidateRegistryChain(contractChainID, feedChainID int64) error {
	if contractChainID <= 0 || feedChainID <= 0 || contractChainID != feedChainID {
		return fmt.Errorf("feed registry chain mismatch: contracts=%d feeds=%d", contractChainID, feedChainID)
	}
	return nil
}

func NewPoller(feeds []feedregistry.Entry, reader Reader, sink Sink, heartbeat time.Duration, log *slog.Logger) *Poller {
	if heartbeat <= 0 {
		heartbeat = 5 * time.Minute
	}
	if log == nil {
		log = slog.Default()
	}
	return &Poller{
		feeds:     append([]feedregistry.Entry(nil), feeds...),
		reader:    reader,
		sink:      sink,
		heartbeat: heartbeat,
		log:       log,
		now:       time.Now,
		state:     make(map[string]feedState),
	}
}

func (p *Poller) Stats() Stats {
	p.statsMu.RLock()
	defer p.statsMu.RUnlock()
	return p.stats
}

func (p *Poller) RunOnce(ctx context.Context) error {
	var errs []error
	for _, feed := range p.feeds {
		if err := p.pollFeed(ctx, feed); err != nil {
			errs = append(errs, err)
			p.addFailedPoll()
			p.log.Warn("chainlink feed poll", "feed", feed.ProxyAddress, "label", feed.Label, "err", err)
		} else {
			p.addSuccessfulPoll()
		}
	}
	return errors.Join(errs...)
}

func (p *Poller) pollFeed(ctx context.Context, feed feedregistry.Entry) error {
	now := p.now().UTC()
	feedID := strings.ToLower(feed.ProxyAddress)
	reading, err := p.reader.Latest(ctx, feed.ProxyAddress)
	if err != nil {
		p.recordHealth(ctx, marketdata.FeedHealth{
			FeedID: feedID, Label: feed.Label, LastCheckedAt: now, Stale: true,
			Error: err.Error(), Source: "chainlink",
		})
		return err
	}
	priceE8, stale, err := validateReading(feed, reading, now)
	health := marketdata.FeedHealth{
		FeedID: feedID, Label: feed.Label, RoundID: reading.RoundID, PriceE8: priceE8,
		PublishTime: reading.UpdatedAt, LastCheckedAt: now, Stale: stale, Source: "chainlink",
	}
	if err != nil {
		health.Error = err.Error()
		p.recordHealth(ctx, health)
		return err
	}
	if err := p.sink.UpsertFeedHealth(ctx, health); err != nil {
		return fmt.Errorf("persist feed health: %w", err)
	}
	prev := p.state[feedID]
	if prev.roundID == reading.RoundID && now.Sub(prev.lastPersisted) < p.heartbeat {
		return nil
	}
	if err := p.sink.IngestTick(ctx, marketdata.Tick{
		FeedID: feedID, PriceE8: priceE8, Source: "chainlink", SeenAt: now,
	}); err != nil {
		return fmt.Errorf("ingest tick: %w", err)
	}
	p.state[feedID] = feedState{roundID: reading.RoundID, lastPersisted: now}
	p.addIngestedTick()
	return nil
}

func (p *Poller) addSuccessfulPoll() {
	p.statsMu.Lock()
	defer p.statsMu.Unlock()
	p.stats.SuccessfulPolls++
}

func (p *Poller) addFailedPoll() {
	p.statsMu.Lock()
	defer p.statsMu.Unlock()
	p.stats.FailedPolls++
}

func (p *Poller) addIngestedTick() {
	p.statsMu.Lock()
	defer p.statsMu.Unlock()
	p.stats.IngestedTicks++
}

func (p *Poller) recordHealth(ctx context.Context, health marketdata.FeedHealth) {
	if err := p.sink.UpsertFeedHealth(ctx, health); err != nil {
		p.log.Warn("persist chainlink feed health", "feed", health.FeedID, "err", err)
	}
}

func validateReading(feed feedregistry.Entry, reading Reading, now time.Time) (int64, bool, error) {
	roundID, okRound := new(big.Int).SetString(reading.RoundID, 10)
	answeredInRound, okAnswered := new(big.Int).SetString(reading.AnsweredInRound, 10)
	if !okRound || !okAnswered || roundID.Sign() <= 0 || answeredInRound.Cmp(roundID) < 0 {
		return 0, true, fmt.Errorf("incomplete round: round=%s answeredInRound=%s", reading.RoundID, reading.AnsweredInRound)
	}
	if reading.Answer <= 0 || reading.UpdatedAt.IsZero() {
		return 0, true, fmt.Errorf("invalid feed answer")
	}
	maxAge := time.Duration(feed.SuggestedMaxDelaySeconds) * time.Second
	stale := maxAge > 0 && now.Sub(reading.UpdatedAt) > maxAge
	if stale {
		return 0, true, fmt.Errorf("stale feed: updatedAt=%s maxAge=%s", reading.UpdatedAt.UTC().Format(time.RFC3339), maxAge)
	}
	priceE8, err := normalizeToE8(reading.Answer, reading.Decimals)
	if err != nil {
		return 0, true, err
	}
	return priceE8, false, nil
}

func normalizeToE8(answer int64, decimals uint8) (int64, error) {
	if answer <= 0 {
		return 0, fmt.Errorf("answer must be positive")
	}
	if decimals == 8 {
		return answer, nil
	}
	if decimals < 8 {
		factor := int64(math.Pow10(int(8 - decimals)))
		if answer > math.MaxInt64/factor {
			return 0, fmt.Errorf("normalized price overflows int64")
		}
		return answer * factor, nil
	}
	factor := int64(math.Pow10(int(decimals - 8)))
	if factor == 0 {
		return 0, fmt.Errorf("unsupported decimals: %d", decimals)
	}
	return answer / factor, nil
}
