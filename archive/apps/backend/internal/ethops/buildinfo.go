package ethops

import (
	"crypto/sha256"

	"retropick/apps/backend/internal/abis"
)

func EmbeddedABIHash() [32]byte {
	h := sha256.New()
	_, _ = h.Write(abis.IMarketEngineJSON)
	_, _ = h.Write(abis.MarketEngineDispatcherJSON)
	var out [32]byte
	copy(out[:], h.Sum(nil))
	return out
}
