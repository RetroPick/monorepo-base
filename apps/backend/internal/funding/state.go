package funding

import "fmt"

const (
	StatusCreated             = "CREATED"
	StatusBalanceScanning     = "BALANCE_SCANNING"
	StatusOptionsReady        = "OPTIONS_READY"
	StatusRouteSelected       = "ROUTE_SELECTED"
	StatusAwaitingWallet      = "AWAITING_WALLET_SIGNATURE"
	StatusExecutionStarted    = "EXECUTION_STARTED"
	StatusSourceTxSubmitted   = "SOURCE_TX_SUBMITTED"
	StatusBridging            = "BRIDGING"
	StatusDestinationDetected = "DESTINATION_USDC_DETECTED"
	StatusCrediting           = "CREDITING"
	StatusCredited            = "CREDITED"
	StatusFailed              = "FAILED"
	StatusExpired             = "EXPIRED"
	StatusManualReview        = "MANUAL_REVIEW"
	StatusRefunded            = "REFUNDED"
)

var allowedTransitions = map[string]map[string]struct{}{
	StatusCreated: {
		StatusBalanceScanning: {},
		StatusOptionsReady:    {},
		StatusFailed:          {},
		StatusExpired:         {},
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
