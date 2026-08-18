package abiembed

import _ "embed"

//go:embed MarketEngineDispatcher.json
var MarketEngineDispatcherJSON []byte

//go:embed FeeRouter.json
var FeeRouterJSON []byte
