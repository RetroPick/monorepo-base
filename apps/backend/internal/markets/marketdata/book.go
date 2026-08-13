package marketdata

import (
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"

	"retropick/apps/backend/internal/markets"
	"retropick/apps/backend/internal/markets/clob"
)

var (
	ErrCrossedBook = errors.New("crossed order book")
	ErrGapDetected = errors.New("order-book gap detected")
	ErrInvalidBook = errors.New("invalid order book")
)

type Side string

const (
	SideBid Side = "bid"
	SideAsk Side = "ask"
)

type Delta struct {
	BaseHash  string
	NextHash  string
	Timestamp time.Time
	Side      Side
	Price     markets.DecimalString
	Size      markets.DecimalString
}

type State struct {
	Snapshot markets.OrderBookSnapshot
}

func BuildSnapshot(marketID string, upstream clob.OrderBook, observedAt time.Time, maxAge time.Duration) (markets.OrderBookSnapshot, error) {
	if strings.TrimSpace(marketID) == "" || upstream.ConditionID == "" || upstream.TokenID == "" ||
		upstream.Hash == "" || upstream.Timestamp.IsZero() || observedAt.IsZero() || maxAge <= 0 {
		return markets.OrderBookSnapshot{}, fmt.Errorf("%w: incomplete snapshot identity", ErrInvalidBook)
	}
	bids, err := normalizeLevels(upstream.Bids, SideBid)
	if err != nil {
		return markets.OrderBookSnapshot{}, err
	}
	asks, err := normalizeLevels(upstream.Asks, SideAsk)
	if err != nil {
		return markets.OrderBookSnapshot{}, err
	}
	minOrderSize, err := markets.ParseDecimalString(upstream.MinOrderSize)
	if err != nil {
		return markets.OrderBookSnapshot{}, fmt.Errorf("%w: min order size", ErrInvalidBook)
	}
	tickSize, err := markets.ParseDecimalString(upstream.TickSize)
	if err != nil {
		return markets.OrderBookSnapshot{}, fmt.Errorf("%w: tick size", ErrInvalidBook)
	}
	if decimalSign(minOrderSize) <= 0 || decimalSign(tickSize) <= 0 {
		return markets.OrderBookSnapshot{}, fmt.Errorf("%w: non-positive trading constraint", ErrInvalidBook)
	}

	var lastTrade *markets.DecimalString
	if upstream.LastTradePrice != "" {
		value, err := markets.ParseDecimalString(upstream.LastTradePrice)
		if err != nil || !probability(value) {
			return markets.OrderBookSnapshot{}, fmt.Errorf("%w: last trade price", ErrInvalidBook)
		}
		lastTrade = &value
	}
	age := observedAt.Sub(upstream.Timestamp)
	if age < 0 {
		age = 0
	}
	freshness := markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: observedAt.UTC(),
		AgeMillis:  age.Milliseconds(),
		BookHash:   upstream.Hash,
	}
	if age > maxAge {
		freshness.State = markets.FreshnessStale
		freshness.Reason = "snapshot_age_exceeded"
	}
	snapshot := markets.OrderBookSnapshot{
		SchemaVersion:  markets.SchemaVersion,
		MarketID:       marketID,
		ConditionID:    upstream.ConditionID,
		TokenID:        upstream.TokenID,
		Hash:           upstream.Hash,
		Timestamp:      upstream.Timestamp.UTC(),
		Bids:           bids,
		Asks:           asks,
		MinOrderSize:   minOrderSize,
		TickSize:       tickSize,
		NegRisk:        upstream.NegRisk,
		LastTradePrice: lastTrade,
		Freshness:      freshness,
		Provenance: markets.UpstreamProvenance{
			Source:      "polymarket_clob",
			UpstreamID:  upstream.TokenID,
			ObservedAt:  observedAt.UTC(),
			ContentHash: upstream.Hash,
		},
	}
	if err := setQuotes(&snapshot); err != nil {
		snapshot.Freshness.State = markets.FreshnessInvalid
		snapshot.Freshness.Reason = "crossed_book"
		return snapshot, err
	}
	return snapshot, nil
}

func (s *State) ApplyDelta(delta Delta) error {
	if delta.BaseHash == "" || delta.BaseHash != s.Snapshot.Hash {
		s.markResync("snapshot_hash_mismatch")
		return ErrGapDetected
	}
	if delta.NextHash == "" {
		s.markResync("next_hash_missing")
		return ErrGapDetected
	}
	if delta.Timestamp.IsZero() || !delta.Timestamp.After(s.Snapshot.Timestamp) {
		s.markResync("timestamp_not_increasing")
		return ErrGapDetected
	}
	if !probability(delta.Price) || decimalSign(delta.Size) < 0 {
		s.Snapshot.Freshness.State = markets.FreshnessInvalid
		s.Snapshot.Freshness.Reason = "invalid_delta"
		return ErrInvalidBook
	}

	switch delta.Side {
	case SideBid:
		s.Snapshot.Bids = applyLevel(s.Snapshot.Bids, delta.Price, delta.Size, SideBid)
	case SideAsk:
		s.Snapshot.Asks = applyLevel(s.Snapshot.Asks, delta.Price, delta.Size, SideAsk)
	default:
		s.Snapshot.Freshness.State = markets.FreshnessInvalid
		s.Snapshot.Freshness.Reason = "invalid_delta_side"
		return ErrInvalidBook
	}
	s.Snapshot.Hash = delta.NextHash
	s.Snapshot.Timestamp = delta.Timestamp.UTC()
	s.Snapshot.Freshness = markets.MarketFreshness{
		State:      markets.FreshnessFresh,
		ObservedAt: delta.Timestamp.UTC(),
		BookHash:   delta.NextHash,
	}
	if err := setQuotes(&s.Snapshot); err != nil {
		s.Snapshot.Freshness.State = markets.FreshnessInvalid
		s.Snapshot.Freshness.Reason = "crossed_book"
		return err
	}
	return nil
}

func (s *State) MarkDisconnected(observedAt time.Time) {
	s.Snapshot.Freshness = markets.MarketFreshness{
		State:      markets.FreshnessResyncing,
		ObservedAt: observedAt.UTC(),
		Reason:     "realtime_disconnected",
		BookHash:   s.Snapshot.Hash,
	}
}

func (s *State) markResync(reason string) {
	s.Snapshot.Freshness.State = markets.FreshnessResyncing
	s.Snapshot.Freshness.Reason = reason
	s.Snapshot.Freshness.BookHash = s.Snapshot.Hash
}

func Health(snapshot markets.OrderBookSnapshot, observedAt time.Time) (markets.MarketHealthSnapshot, error) {
	if strings.TrimSpace(snapshot.MarketID) == "" || snapshot.Timestamp.IsZero() || observedAt.IsZero() {
		return markets.MarketHealthSnapshot{}, fmt.Errorf("%w: incomplete health input", ErrInvalidBook)
	}
	bidDepth, err := sumSizes(snapshot.Bids)
	if err != nil {
		return markets.MarketHealthSnapshot{}, err
	}
	askDepth, err := sumSizes(snapshot.Asks)
	if err != nil {
		return markets.MarketHealthSnapshot{}, err
	}
	bestBid := bestPrice(snapshot.Bids, SideBid)
	bestAsk := bestPrice(snapshot.Asks, SideAsk)
	var spread *markets.DecimalString
	crossed := false
	if bestBid != nil && bestAsk != nil {
		cmp := compareDecimal(*bestBid, *bestAsk)
		crossed = cmp >= 0
		if !crossed {
			value := subtractDecimal(*bestAsk, *bestBid)
			spread = &value
		}
	}
	age := observedAt.Sub(snapshot.Timestamp)
	if age < 0 {
		age = 0
	}
	return markets.MarketHealthSnapshot{
		SchemaVersion: markets.SchemaVersion,
		MarketID:      snapshot.MarketID,
		Algorithm:     "market-health-components-v1",
		ObservedAt:    observedAt.UTC(),
		Spread:        spread,
		BestBid:       bestBid,
		BestAsk:       bestAsk,
		BidDepth:      bidDepth,
		AskDepth:      askDepth,
		SnapshotAgeMS: age.Milliseconds(),
		Crossed:       crossed,
		Freshness:     snapshot.Freshness,
		Provenance:    snapshot.Provenance,
	}, nil
}

func NormalizeHistory(rows []clob.PricePoint) ([]markets.PricePoint, error) {
	points := make([]markets.PricePoint, 0, len(rows))
	var previous time.Time
	for _, row := range rows {
		if row.Timestamp.IsZero() || (!previous.IsZero() && !row.Timestamp.After(previous)) {
			return nil, fmt.Errorf("%w: history timestamps are not increasing", ErrInvalidBook)
		}
		price, err := markets.ParseDecimalString(row.Price)
		if err != nil || !probability(price) {
			return nil, fmt.Errorf("%w: history price", ErrInvalidBook)
		}
		points = append(points, markets.PricePoint{
			Timestamp: row.Timestamp.UTC(),
			Price:     price,
			Derived:   false,
			Source:    "polymarket_clob",
		})
		previous = row.Timestamp
	}
	return points, nil
}

func normalizeLevels(rows []clob.Level, side Side) ([]markets.OrderBookLevel, error) {
	levels := make([]markets.OrderBookLevel, 0, len(rows))
	for _, row := range rows {
		price, err := markets.ParseDecimalString(row.Price)
		if err != nil || !probability(price) {
			return nil, fmt.Errorf("%w: invalid level price", ErrInvalidBook)
		}
		size, err := markets.ParseDecimalString(row.Size)
		if err != nil || decimalSign(size) <= 0 {
			return nil, fmt.Errorf("%w: invalid level size", ErrInvalidBook)
		}
		levels = append(levels, markets.OrderBookLevel{Price: price, Size: size})
	}
	sortLevels(levels, side)
	for i := 1; i < len(levels); i++ {
		if compareDecimal(levels[i-1].Price, levels[i].Price) == 0 {
			return nil, fmt.Errorf("%w: duplicate level price", ErrInvalidBook)
		}
	}
	return levels, nil
}

func applyLevel(levels []markets.OrderBookLevel, price, size markets.DecimalString, side Side) []markets.OrderBookLevel {
	out := make([]markets.OrderBookLevel, 0, len(levels)+1)
	found := false
	for _, level := range levels {
		if compareDecimal(level.Price, price) == 0 {
			found = true
			if decimalSign(size) > 0 {
				out = append(out, markets.OrderBookLevel{Price: price, Size: size})
			}
			continue
		}
		out = append(out, level)
	}
	if !found && decimalSign(size) > 0 {
		out = append(out, markets.OrderBookLevel{Price: price, Size: size})
	}
	sortLevels(out, side)
	return out
}

func sortLevels(levels []markets.OrderBookLevel, side Side) {
	sort.Slice(levels, func(i, j int) bool {
		cmp := compareDecimal(levels[i].Price, levels[j].Price)
		if side == SideBid {
			return cmp > 0
		}
		return cmp < 0
	})
}

func setQuotes(snapshot *markets.OrderBookSnapshot) error {
	snapshot.BestBid = bestPrice(snapshot.Bids, SideBid)
	snapshot.BestAsk = bestPrice(snapshot.Asks, SideAsk)
	snapshot.Midpoint = nil
	snapshot.Spread = nil
	if snapshot.BestBid == nil || snapshot.BestAsk == nil {
		return nil
	}
	if compareDecimal(*snapshot.BestBid, *snapshot.BestAsk) >= 0 {
		return ErrCrossedBook
	}
	spread := subtractDecimal(*snapshot.BestAsk, *snapshot.BestBid)
	midpoint := averageDecimal(*snapshot.BestAsk, *snapshot.BestBid)
	snapshot.Spread = &spread
	snapshot.Midpoint = &midpoint
	return nil
}

func bestPrice(levels []markets.OrderBookLevel, side Side) *markets.DecimalString {
	if len(levels) == 0 {
		return nil
	}
	best := levels[0].Price
	for _, level := range levels[1:] {
		cmp := compareDecimal(level.Price, best)
		if (side == SideBid && cmp > 0) || (side == SideAsk && cmp < 0) {
			best = level.Price
		}
	}
	return &best
}

func sumSizes(levels []markets.OrderBookLevel) (markets.DecimalString, error) {
	total := new(big.Rat)
	for _, level := range levels {
		value, ok := new(big.Rat).SetString(string(level.Size))
		if !ok || value.Sign() < 0 {
			return "", fmt.Errorf("%w: invalid level size", ErrInvalidBook)
		}
		total.Add(total, value)
	}
	return decimalFromRat(total)
}

func probability(value markets.DecimalString) bool {
	rat := decimalRat(value)
	return rat.Sign() >= 0 && rat.Cmp(big.NewRat(1, 1)) <= 0
}

func decimalSign(value markets.DecimalString) int {
	return decimalRat(value).Sign()
}

func compareDecimal(left, right markets.DecimalString) int {
	return decimalRat(left).Cmp(decimalRat(right))
}

func subtractDecimal(left, right markets.DecimalString) markets.DecimalString {
	value := new(big.Rat).Sub(decimalRat(left), decimalRat(right))
	decimal, _ := decimalFromRat(value)
	return decimal
}

func averageDecimal(left, right markets.DecimalString) markets.DecimalString {
	value := new(big.Rat).Add(decimalRat(left), decimalRat(right))
	value.Quo(value, big.NewRat(2, 1))
	decimal, _ := decimalFromRat(value)
	return decimal
}

func decimalRat(value markets.DecimalString) *big.Rat {
	rat, ok := new(big.Rat).SetString(string(value))
	if !ok {
		panic("invalid canonical decimal")
	}
	return rat
}

func decimalFromRat(value *big.Rat) (markets.DecimalString, error) {
	if value.Sign() < 0 {
		return "", fmt.Errorf("%w: negative decimal", ErrInvalidBook)
	}
	denominator := new(big.Int).Set(value.Denom())
	two := big.NewInt(2)
	five := big.NewInt(5)
	remainder := new(big.Int)
	twos := 0
	fives := 0
	for {
		quotient, rem := new(big.Int).QuoRem(denominator, two, remainder)
		if rem.Sign() != 0 {
			break
		}
		denominator = quotient
		twos++
	}
	for {
		quotient, rem := new(big.Int).QuoRem(denominator, five, remainder)
		if rem.Sign() != 0 {
			break
		}
		denominator = quotient
		fives++
	}
	if denominator.Cmp(big.NewInt(1)) != 0 {
		return "", fmt.Errorf("%w: non-terminating decimal", ErrInvalidBook)
	}
	scale := twos
	if fives > scale {
		scale = fives
	}
	numerator := new(big.Int).Set(value.Num())
	if twos < scale {
		numerator.Mul(numerator, new(big.Int).Exp(two, big.NewInt(int64(scale-twos)), nil))
	}
	if fives < scale {
		numerator.Mul(numerator, new(big.Int).Exp(five, big.NewInt(int64(scale-fives)), nil))
	}
	digits := numerator.String()
	if scale > 0 {
		if len(digits) <= scale {
			digits = strings.Repeat("0", scale-len(digits)+1) + digits
		}
		index := len(digits) - scale
		digits = digits[:index] + "." + digits[index:]
		digits = strings.TrimRight(digits, "0")
		digits = strings.TrimRight(digits, ".")
	}
	return markets.ParseDecimalString(digits)
}
