package ethops

import (
	"math/big"

	"github.com/ethereum/go-ethereum/common"
)

// OperatorGlobalView matches IMarketEngine.getOperatorGlobalView tuple.
// Only `abi` tags — json tags on the same struct confuse go-ethereum's ABI unpacker.
type OperatorGlobalView struct {
	GlobalPaused               bool           `abi:"globalPaused"`
	YieldRouter                common.Address `abi:"yieldRouter"`
	YieldRouterDisabled        bool           `abi:"yieldRouterDisabled"`
	YieldRouterFailureCount    uint8          `abi:"yieldRouterFailureCount"`
	TotalRoutedPrincipal       *big.Int       `abi:"totalRoutedPrincipal"`
	TotalUnreconciledRecovered *big.Int       `abi:"totalUnreconciledRecovered"`
	Admin                      common.Address `abi:"admin"`
	Treasury                   common.Address `abi:"treasury"`
	WorkerAuthority            common.Address `abi:"workerAuthority"`
	PriceOracle                common.Address `abi:"priceOracle"`
	RateOracle                 common.Address `abi:"rateOracle"`
	SmartDataOracle            common.Address `abi:"smartDataOracle"`
	MacroOracle                common.Address `abi:"macroOracle"`
	EquityOracle               common.Address `abi:"equityOracle"`
}

// OperatorTemplateView matches IMarketEngine.getOperatorTemplateView tuple.
type OperatorTemplateView struct {
	ActiveEpochId                        uint64   `abi:"activeEpochId"`
	LastResolvedEpochId                  uint64   `abi:"lastResolvedEpochId"`
	HaltedAtEpochId                      uint64   `abi:"haltedAtEpochId"`
	RollingNextEpochId                   uint64   `abi:"rollingNextEpochId"`
	RollingPhase                         uint8    `abi:"rollingPhase"`
	RollingHaltReason                    uint8    `abi:"rollingHaltReason"`
	ActiveVault                          *big.Int `abi:"activeVault"`
	ClaimsVault                          *big.Int `abi:"claimsVault"`
	FeesVault                            *big.Int `abi:"feesVault"`
	TemplateRoutedPrincipal              *big.Int `abi:"templateRoutedPrincipal"`
	TemplateSettledClaimsRoutedPrincipal *big.Int `abi:"templateSettledClaimsRoutedPrincipal"`
	UnreconciledRecoveredAmount          *big.Int `abi:"unreconciledRecoveredAmount"`
	UserOpsBlocked                       bool     `abi:"userOpsBlocked"`
	UnsafeToUnpauseForTemplate           bool     `abi:"unsafeToUnpauseForTemplate"`
}

// OracleCheckpoint matches nested struct in EpochView.
type OracleCheckpoint struct {
	ValueE8      *big.Int `abi:"valueE8"`
	ConfidenceE8 *big.Int `abi:"confidenceE8"`
	PublishTime  uint64   `abi:"publishTime"`
	Written      bool     `abi:"written"`
}

// EpochView matches IMarketEngine.getEpochView tuple.
type EpochView struct {
	TemplateId                       common.Hash      `abi:"templateId"`
	EpochId                          uint64           `abi:"epochId"`
	Status                           uint8            `abi:"status"`
	CancelReason                     uint8            `abi:"cancelReason"`
	OpenAt                           uint64           `abi:"openAt"`
	LockAt                           uint64           `abi:"lockAt"`
	ResolveAt                        uint64           `abi:"resolveAt"`
	CreatedAt                        uint64           `abi:"createdAt"`
	LockedAt                         uint64           `abi:"lockedAt"`
	ResolvedAt                       uint64           `abi:"resolvedAt"`
	TotalPool                        *big.Int         `abi:"totalPool"`
	TotalPositions                   uint32           `abi:"totalPositions"`
	Claimable                        bool             `abi:"claimable"`
	RefundMode                       bool             `abi:"refundMode"`
	WinningOutcomeMask               *big.Int         `abi:"winningOutcomeMask"`
	ClaimLiabilityTotal              *big.Int         `abi:"claimLiabilityTotal"`
	TotalRefundLiability             *big.Int         `abi:"totalRefundLiability"`
	SettlementFeeTotal               *big.Int         `abi:"settlementFeeTotal"`
	ClaimedTotal                     *big.Int         `abi:"claimedTotal"`
	RemainingWinningStake            *big.Int         `abi:"remainingWinningStake"`
	RoutedPrincipal                  *big.Int         `abi:"routedPrincipal"`
	SettledClaimRoutingEnabled       bool             `abi:"settledClaimRoutingEnabled"`
	SettledClaimBaseOutstanding      *big.Int         `abi:"settledClaimBaseOutstanding"`
	SettledClaimPrincipalOutstanding *big.Int         `abi:"settledClaimPrincipalOutstanding"`
	SettledClaimCurrentValue         *big.Int         `abi:"settledClaimCurrentValue"`
	OracleMaxDelaySeconds            uint64           `abi:"oracleMaxDelaySeconds"`
	OracleMaxConfidenceBps           uint16           `abi:"oracleMaxConfidenceBps"`
	CheckpointA                      OracleCheckpoint `abi:"checkpointA"`
	CheckpointB                      OracleCheckpoint `abi:"checkpointB"`
	HasSecondaryCheckpoints          bool             `abi:"hasSecondaryCheckpoints"`
	HasCompositeCheckpoints          bool             `abi:"hasCompositeCheckpoints"`
}

// OutcomeView matches IMarketEngine.getOutcomeViews tuple.
type OutcomeView struct {
	OutcomeIndex         uint8    `abi:"outcomeIndex"`
	PoolSize            *big.Int `abi:"poolSize"`
	ImpliedProbabilityE6 *big.Int `abi:"impliedProbabilityE6"`
	DisplayPercentE4     *big.Int `abi:"displayPercentE4"`
	IsWinner            bool     `abi:"isWinner"`
	IsActiveQuote       bool     `abi:"isActiveQuote"`
	GrossPayoutXe6      *big.Int `abi:"grossPayoutXe6"`
}

// PositionView matches IMarketEngine.getPositionView tuple.
type PositionView struct {
	Initialized                 bool         `abi:"initialized"`
	Claimed                     bool         `abi:"claimed"`
	ClaimableNow                bool         `abi:"claimableNow"`
	Status                      uint8        `abi:"status"`
	Stakes                      [8]*big.Int  `abi:"stakes"`
	TotalStake                  *big.Int     `abi:"totalStake"`
	EntryFeesPaid               *big.Int     `abi:"entryFeesPaid"`
	SwitchFeesPaid              *big.Int     `abi:"switchFeesPaid"`
	ClaimedAmount               *big.Int     `abi:"claimedAmount"`
	PendingClaimAmount          *big.Int     `abi:"pendingClaimAmount"`
	PendingRefundAmount         *big.Int     `abi:"pendingRefundAmount"`
	WinningStake                *big.Int     `abi:"winningStake"`
	SettledClaimRoutingEnabled  bool         `abi:"settledClaimRoutingEnabled"`
}
