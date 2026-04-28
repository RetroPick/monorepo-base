package ethops

import (
	"github.com/ethereum/go-ethereum/accounts/abi"
)

// unpackSingleTuple decodes a Solidity function whose only output is a single
// tuple (i.e. one ABI argument of type "tuple") into a typed Go struct T.
//
// go-ethereum's Arguments.Copy treats a one-output function as "atomic": when
// the destination is a struct, the entire wire value is assigned to the
// destination's first field instead of being mapped tuple-component-by-field.
// Passing a flat mirror struct (e.g. PositionView) therefore fails with
// "abi: cannot unmarshal struct {...} in to bool" because the tuple is shoved
// into the first scalar field.
//
// Wrapping the destination in a single-field anonymous struct sidesteps the
// special case: copyAtomic now puts the whole tuple into wrapper.Result (a
// struct), and go-ethereum's set() falls through to setStruct() which copies
// fields positionally — which matches our typed mirror structs in views.go.
func unpackSingleTuple[T any](a abi.ABI, method string, raw []byte) (T, error) {
	var out T
	var wrapper struct {
		Result T
	}
	if err := a.UnpackIntoInterface(&wrapper, method, raw); err != nil {
		return out, err
	}
	return wrapper.Result, nil
}
