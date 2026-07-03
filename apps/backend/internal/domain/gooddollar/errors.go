package gooddollar

import "errors"

// ErrDisabled is returned when GOODDOLLAR_ENABLED is off.
var ErrDisabled = errors.New("gooddollar: feature disabled")
