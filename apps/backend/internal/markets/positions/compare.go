package positions

import (
	"errors"
	"math/big"
	"strings"

	"retropick/apps/backend/internal/markets"
)

var errInvalidDecimal = errors.New("invalid decimal")

// DriftResult captures per-token drift between local and venue snapshots.
type DriftResult struct {
	Drifted []string
	Count   int
}

// ComparePositions detects size drift keyed by tokenID.
func ComparePositions(local []PositionRecord, venue []VenuePosition) DriftResult {
	localByToken := indexLocal(local)
	venueByToken := indexVenue(venue)

	seen := make(map[string]struct{})
	out := make([]string, 0)

	for tokenID, venueRow := range venueByToken {
		seen[tokenID] = struct{}{}
		localRow, ok := localByToken[tokenID]
		if !ok {
			out = append(out, tokenID)
			continue
		}
		if !sizesEqual(localRow.Size, venueRow.Size) {
			out = append(out, tokenID)
		}
	}
	for tokenID := range localByToken {
		if _, ok := seen[tokenID]; ok {
			continue
		}
		out = append(out, tokenID)
	}

	return DriftResult{Drifted: out, Count: len(out)}
}

func indexLocal(rows []PositionRecord) map[string]PositionRecord {
	out := make(map[string]PositionRecord, len(rows))
	for _, row := range rows {
		tokenID := strings.TrimSpace(row.TokenID)
		if tokenID == "" {
			continue
		}
		out[tokenID] = row
	}
	return out
}

func indexVenue(rows []VenuePosition) map[string]VenuePosition {
	out := make(map[string]VenuePosition, len(rows))
	for _, row := range rows {
		tokenID := strings.TrimSpace(row.TokenID)
		if tokenID == "" {
			continue
		}
		out[tokenID] = row
	}
	return out
}

func sizesEqual(left, right string) bool {
	left = strings.TrimSpace(left)
	right = strings.TrimSpace(right)
	if left == right {
		return true
	}
	leftRat, errLeft := decimalRat(left)
	rightRat, errRight := decimalRat(right)
	if errLeft != nil || errRight != nil {
		return false
	}
	return leftRat.Cmp(rightRat) == 0
}

func decimalRat(raw string) (*big.Rat, error) {
	value, err := markets.ParseDecimalString(raw)
	if err != nil {
		return nil, err
	}
	rat := new(big.Rat)
	if _, ok := rat.SetString(string(value)); !ok {
		return nil, errInvalidDecimal
	}
	return rat, nil
}
