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

// ErrOwnershipUnverified indicates that the account wallet cannot be linked
// from the authenticated signer without a cryptographically verified proof.
var ErrOwnershipUnverified = errors.New("wallet ownership unverified")

// ErrRelayDisabled ensures a client-supplied deployment address is never
// persisted until an authenticated upstream relay integration is available.
var ErrRelayDisabled = errors.New("account wallet relay disabled")
