package abis

import _ "embed"

//go:embed IMarketEngine.json
var IMarketEngineJSON []byte

//go:embed MarketEngineDispatcher.json
var MarketEngineDispatcherJSON []byte

//go:embed TokenFaucet.json
var TokenFaucetJSON []byte

//go:embed MockERC20.json
var MockERC20JSON []byte

//go:embed ChainlinkAdapter.json
var ChainlinkAdapterJSON []byte
