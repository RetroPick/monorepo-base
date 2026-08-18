package funding

import "fmt"

const (
	StatusCreated             = "CREATED"
	StatusBalanceScanning     = "SCANNING_BALANCES"
	StatusOptionsReady        = "OPTIONS_READY"
	StatusRouteSelected       = "ROUTE_SELECTED"
	StatusAwaitingWallet      = "AWAITING_WALLET_SIGNATURE"
	StatusExecutionStarted    = "EXECUTION_STARTED"
	StatusSourceTxSubmitted   = "SOURCE_TX_SUBMITTED"
	StatusBridging            = "BRIDGING"
	StatusDestinationDetected = "DESTINATION_USDC_VERIFIED"
	StatusCrediting           = "CREDITING"
	StatusCredited            = "CREDITED"
	StatusFailed              = "FAILED"
	StatusExpired             = "EXPIRED"
	StatusManualReview        = "MANUAL_REVIEW"
	StatusRefunded            = "REFUNDED"
	StatusNoFundingOptions    = "NO_FUNDING_OPTIONS"
)

var allowedTransitions = map[string]map[string]struct{}{
	StatusCreated: {
		StatusBalanceScanning: {},
		StatusOptionsReady:    {},
		StatusNoFundingOptions: {},
		StatusFailed:          {},
		StatusExpired:         {},
	},
	StatusBalanceScanning: {
		StatusOptionsReady:     {},
		StatusNoFundingOptions: {},
		StatusFailed:           {},
	},
	StatusOptionsReady: {
		StatusRouteSelected: {},
		StatusFailed:        {},
		StatusExpired:       {},
	},
	StatusRouteSelected: {
		StatusAwaitingWallet:   {},
		StatusExecutionStarted: {},
		StatusFailed:           {},
		StatusExpired:          {},
	},
	StatusAwaitingWallet: {
		StatusExecutionStarted: {},
		StatusFailed:           {},
		StatusExpired:          {},
	},
	StatusExecutionStarted: {
		StatusSourceTxSubmitted: {},
		StatusBridging:          {},
		StatusFailed:            {},
		StatusManualReview:      {},
	},
	StatusSourceTxSubmitted: {
		StatusBridging:     {},
		StatusFailed:       {},
		StatusManualReview: {},
	},
	StatusBridging: {
		StatusDestinationDetected: {},
		StatusFailed:              {},
		StatusManualReview:        {},
	},
	StatusDestinationDetected: {
		StatusCrediting: {},
		StatusFailed:    {},
	},
	StatusCrediting: {
		StatusCredited: {},
		StatusFailed:   {},
	},
}

func ValidateTransition(from, to string) error {
	if from == to {
		return nil
	}
	allowed, ok := allowedTransitions[from]
	if !ok {
		return fmt.Errorf("invalid current state %s", from)
	}
	if _, ok := allowed[to]; !ok {
		return fmt.Errorf("transition not allowed %s -> %s", from, to)
	}
	return nil
}
