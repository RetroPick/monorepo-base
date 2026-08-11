package positions

import "errors"

var (
	// ErrUnauthorized indicates no valid Markets session was resolved.
	ErrUnauthorized = errors.New("unauthorized")

	// ErrAccountNotLinked indicates the session has no linked primary account wallet.
	ErrAccountNotLinked = errors.New("account not linked")

	// ErrUpstreamUnavailable indicates the venue position source is unwired or failed.
	ErrUpstreamUnavailable = errors.New("upstream unavailable")
)
