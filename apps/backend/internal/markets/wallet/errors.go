package wallet

import "errors"

// ErrInvalidAddress indicates a malformed Ethereum address.
var ErrInvalidAddress = errors.New("invalid address")

// ErrLinkerUnwired indicates link writes are not configured.
var ErrLinkerUnwired = errors.New("linker unwired")

// ErrInvalidRequest indicates malformed link input.
var ErrInvalidRequest = errors.New("invalid request")

// ErrConflict indicates a conflicting linkage state.
var ErrConflict = errors.New("conflict")
