package markets

import "time"

// EligibilityResponse is the fail-closed jurisdiction gate for Markets clients.
type EligibilityResponse struct {
	Eligible  bool      `json:"eligible"`
	Reason    string    `json:"reason,omitempty"`
	CheckedAt time.Time `json:"checkedAt"`
	Region    string    `json:"region,omitempty"`
}

// CapabilitiesResponse advertises supported Markets features for this build.
type CapabilitiesResponse struct {
	Version   string          `json:"version"`
	Catalog   bool            `json:"catalog"`
	Trading   bool            `json:"trading"`
	Combos    bool            `json:"combos"`
	Intel     bool            `json:"intelligence"`
	Features  map[string]bool `json:"features,omitempty"`
	CheckedAt time.Time       `json:"checkedAt"`
}

// EventSummary is a normalized Polymarket event stub (catalog grows in later phases).
type EventSummary struct {
	ID    string `json:"id"`
	Slug  string `json:"slug,omitempty"`
	Title string `json:"title"`
}

// EventsListResponse paginates catalog events from the BFF.
type EventsListResponse struct {
	Events  []EventSummary `json:"events"`
	Cursor  *string        `json:"cursor"`
	Source  string         `json:"source"`
	CheckedAt time.Time    `json:"checkedAt"`
}
