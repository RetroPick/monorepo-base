package clob

// Neg-risk exchange routing is EIP-712 domain selection, not a separate CLOB wire path.
// POST /order uses the same host for standard and neg_risk markets; the signed order's
// verifyingContract must match the preview exchangeDomain chosen in orders/negrisk.go.
//
// EV-008 registry pins (Polygon 137) — kept here for parity checks with orders package.
const (
	CTFExchangeV2Address        = "0xe111180000d2663c0091e4f400237545b87b996b"
	NegRiskCTFExchangeV2Address = "0xe2222d279d744050d28e00520010520000310f59"
)
