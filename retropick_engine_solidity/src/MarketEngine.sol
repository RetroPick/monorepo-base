// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/utils/ReentrancyGuard.sol";
import {MarketTypes} from "./types/MarketTypes.sol";
import {MarketMath} from "./math/MarketMath.sol";
import {Resolvers} from "./logic/Resolvers.sol";
import {IPriceOracle} from "./interfaces/IPriceOracle.sol";

/// @title MarketEngine
/// @notice EVM port of `retropick_market_engine_v5` (Anchor) — same state machine, math, and oracle checks.
contract MarketEngine is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using MarketTypes for MarketTypes.Epoch;
    using MarketMath for MarketTypes.Ledger;

    address public immutable deployer;

    IERC20 public stakeToken;
    IPriceOracle public priceOracle;

    bool public configInitialized;
    address public admin;
    address public treasury;
    address public workerAuthority;
    bool public globalPaused;

    uint16 public defaultSettlementFeeBps;
    uint16 public maxSwitchFeeBps;
    uint8 public maxOutcomes;
    MarketTypes.OracleConfig public oracleConfig;

    mapping(bytes32 templateId => MarketTypes.Template) public templates;
    mapping(bytes32 templateId => MarketTypes.Ledger) public ledgers;
    mapping(bytes32 templateId => MarketTypes.VaultBalances) internal vaults;
    mapping(bytes32 templateId => mapping(uint64 epochId => MarketTypes.Epoch)) public epochs;
    mapping(bytes32 positionKey => mapping(address user => MarketTypes.Position)) internal positions;

    error Unauthorized();
    error InvalidAuthority();
    error ProtocolPaused();
    error InvalidTemplate();
    error TemplateInactive();
    error TooManyOutcomes();
    error InvalidFeeBps();
    error InvalidTiming();
    error InvalidEpochState();
    error BettingClosed();
    error TooEarlyToLock();
    error TooEarlyToResolve();
    error EpochAlreadyResolved();
    error EpochAlreadyExists();
    error PreviousEpochUnresolved();
    error EpochNotActive();
    error InvalidOracleFeed();
    error OracleStale();
    error OracleConfidenceTooWide();
    error InvalidOraclePrice();
    error InvalidOraclePublishTime();
    error CheckpointAlreadyWritten();
    error NoWinningOutcome();
    error InvalidOutcome();
    error SingleSideViolation();
    error PartialSwitchDisallowed();
    error AmountTooSmall();
    error ZeroStake();
    error InsufficientSourceStake();
    error NothingToClaim();
    error AlreadyClaimed();
    error ClaimNotAvailable();
    error MathOverflow();
    error ConfidenceOverflow();
    error RollingModeOnly();
    error ManualModeOnly();
    error RollingWrongPhase();
    error RollingNotDirection();
    error RollingInvalidParams();
    error RollingGenesisAlreadyStarted();
    error RollingHaltedUserOps();
    error InvalidRollingRecovery();

    event ConfigInitialized(address admin, address treasury, address workerAuthority);
    event TemplateUpserted(bytes32 indexed templateId, string slug, uint8 marketType, uint8 outcomeCount);
    event MarketInitialized(bytes32 indexed templateId);
    event EpochOpened(
        bytes32 indexed templateId, uint64 indexed epochId, uint64 openAt, uint64 lockAt, uint64 resolveAt
    );
    event PositionDeposited(
        bytes32 indexed templateId, uint64 indexed epochId, address indexed user, uint8 outcome, uint256 amount
    );
    event SideSwitched(
        bytes32 indexed templateId,
        uint64 indexed epochId,
        address indexed user,
        uint8 fromOutcome,
        uint8 toOutcome,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount
    );
    event EpochLocked(
        bytes32 indexed templateId, uint64 indexed epochId, int256 checkpointAValueE8, uint64 publishTime
    );
    event EpochResolved(
        bytes32 indexed templateId,
        uint64 indexed epochId,
        uint256 winningMask,
        uint256 claimLiabilityTotal,
        uint256 settlementFeeTotal,
        bool refundMode
    );
    event EpochCancelled(bytes32 indexed templateId, uint64 indexed epochId, uint8 reason);
    event Claimed(bytes32 indexed templateId, uint64 indexed epochId, address indexed user, uint256 amount);
    event FeesWithdrawn(bytes32 indexed templateId, uint256 amount);
    event RollingGenesisStarted(bytes32 indexed templateId, uint64 epochId, uint64 lockAt, uint64 resolveAt);
    event RollingGenesisLocked(bytes32 indexed templateId, uint64 lockedEpochId, uint64 newOpenEpochId);
    event RollingRoundExecuted(
        bytes32 indexed templateId, uint64 resolvedEpochId, uint64 lockedEpochId, uint64 newOpenEpochId
    );
    event RollingHalted(bytes32 indexed templateId, uint8 reason, uint64 haltedAtEpochId);
    event RollingLifecycleReset(bytes32 indexed templateId, uint64 nextRollingEpochId);

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert Unauthorized();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier onlyWorkerOrAdmin() {
        if (msg.sender != admin && msg.sender != workerAuthority) revert Unauthorized();
        _;
    }

    modifier onlyTreasuryOrAdmin() {
        if (msg.sender != treasury && msg.sender != admin) revert Unauthorized();
        _;
    }

    modifier notPausedUserOps() {
        if (globalPaused) revert ProtocolPaused();
        _;
    }

    modifier notPausedWorkerOps() {
        if (globalPaused) revert ProtocolPaused();
        _;
    }

    constructor() {
        deployer = msg.sender;
    }

    function initializeConfig(
        IERC20 stakeToken_,
        IPriceOracle priceOracle_,
        address admin_,
        address treasury_,
        address worker_,
        uint16 defaultSettlementFeeBps_,
        uint16 maxSwitchFeeBps_,
        uint8 maxOutcomes_,
        MarketTypes.OracleKind oracleKind_,
        uint64 oracleMaxDelaySeconds_,
        uint16 oracleMaxConfidenceBps_
    ) external onlyDeployer {
        if (configInitialized) revert Unauthorized();
        if (admin_ == address(0) || treasury_ == address(0) || worker_ == address(0)) revert Unauthorized();
        if (defaultSettlementFeeBps_ > 10_000 || maxSwitchFeeBps_ > 10_000) revert InvalidFeeBps();
        if (maxOutcomes_ > MarketTypes.MAX_OUTCOMES) revert TooManyOutcomes();
        if (oracleKind_ != MarketTypes.OracleKind.Pyth) revert InvalidOracleFeed();

        stakeToken = stakeToken_;
        priceOracle = priceOracle_;
        admin = admin_;
        treasury = treasury_;
        workerAuthority = worker_;
        defaultSettlementFeeBps = defaultSettlementFeeBps_;
        maxSwitchFeeBps = maxSwitchFeeBps_;
        maxOutcomes = maxOutcomes_;
        oracleConfig = MarketTypes.OracleConfig({
            oracleKind: oracleKind_, maxDelaySeconds: oracleMaxDelaySeconds_, maxConfidenceBps: oracleMaxConfidenceBps_
        });

        configInitialized = true;
        emit ConfigInitialized(admin_, treasury_, worker_);
    }

    struct UpsertTemplateParams {
        string slug;
        string assetSymbol;
        bytes32 oracleFeedId;
        MarketTypes.MarketType marketType;
        MarketTypes.Condition condition;
        MarketTypes.ThresholdRule thresholdRule;
        bool active;
        uint8 outcomeCount;
        int256 absoluteThresholdValueE8;
        int256[7] rangeBoundsE8;
        uint16 switchFeeBps;
        uint16 settlementFeeBps;
        bool allowMultiSidePositions;
        MarketTypes.ExecutionMode executionMode;
        uint64 rollingIntervalSeconds;
        uint64 rollingBufferSeconds;
    }

    function upsertTemplate(UpsertTemplateParams calldata p) external onlyAdmin {
        if (bytes(p.slug).length == 0 || bytes(p.slug).length > MarketTypes.SLUG_MAX_LEN) revert InvalidTemplate();
        if (bytes(p.assetSymbol).length == 0 || bytes(p.assetSymbol).length > MarketTypes.ASSET_SYMBOL_MAX_LEN) {
            revert InvalidTemplate();
        }
        if (p.switchFeeBps > maxSwitchFeeBps) revert InvalidFeeBps();
        if (p.outcomeCount == 0 || p.outcomeCount > maxOutcomes) revert TooManyOutcomes();
        if (p.oracleFeedId == bytes32(0)) revert InvalidOracleFeed();

        bytes32 tid = templateIdFromSlug(p.slug);
        MarketTypes.Template storage t = templates[tid];

        if (t.version != 0) {
            if (keccak256(bytes(t.slug)) != keccak256(bytes(p.slug))) revert InvalidTemplate();
        } else {
            t.version = MarketTypes.VERSION;
        }

        t.slug = p.slug;
        t.assetSymbol = p.assetSymbol;
        t.oracleFeedId = p.oracleFeedId;
        t.marketType = p.marketType;
        t.condition = p.condition;
        t.thresholdRule = p.thresholdRule;
        t.active = p.active;
        t.outcomeCount = p.outcomeCount;
        t.absoluteThresholdValueE8 = p.absoluteThresholdValueE8;
        t.rangeBoundsE8 = p.rangeBoundsE8;
        t.switchFeeBps = p.switchFeeBps;
        t.settlementFeeBps = p.settlementFeeBps;
        t.equalPriceVoids = true;
        t.feeOnLosingPool = true;
        t.allowMultiSidePositions = p.allowMultiSidePositions;
        t.executionMode = p.executionMode;
        t.rollingIntervalSeconds = p.rollingIntervalSeconds;
        t.rollingBufferSeconds = p.rollingBufferSeconds;

        if (p.executionMode == MarketTypes.ExecutionMode.Rolling) {
            if (p.marketType != MarketTypes.MarketType.Direction) revert RollingNotDirection();
            if (p.rollingIntervalSeconds == 0) revert RollingInvalidParams();
            if (!(p.rollingBufferSeconds < p.rollingIntervalSeconds)) revert RollingInvalidParams();
        }

        _validateTemplate(t);
        emit TemplateUpserted(tid, p.slug, uint8(uint256(p.marketType)), p.outcomeCount);
    }

    function initializeMarket(bytes32 templateId) external onlyAdmin {
        MarketTypes.Template storage t = templates[templateId];
        if (t.version == 0) revert InvalidTemplate();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (ledger.initialized) revert EpochAlreadyExists();

        ledger.version = MarketTypes.VERSION;
        ledger.initialized = true;
        ledger.activeEpochId = 0;
        ledger.lastResolvedEpochId = 0;
        ledger.activeCollateralTotal = 0;
        ledger.claimsReserveTotal = 0;
        ledger.feeReserveTotal = 0;
        ledger.insuranceReserveTotal = 0;
        ledger.rollingPhase = MarketTypes.RollingPhase.Uninitialized;
        ledger.rollingHaltReason = MarketTypes.RollingHaltReason.NoneReason;
        ledger.rollingNextEpochId = 1;
        ledger.haltedAtEpochId = 0;

        emit MarketInitialized(templateId);
    }

    /// @notice Pancake-style genesis: open the next rolling epoch id (`rollingNextEpochId`, starts at 1).
    function genesisStartRolling(bytes32 templateId) external onlyWorkerOrAdmin notPausedWorkerOps {
        if (!configInitialized) revert Unauthorized();
        MarketTypes.Template storage t = templates[templateId];
        if (t.version == 0) revert InvalidTemplate();
        if (t.executionMode != MarketTypes.ExecutionMode.Rolling) revert RollingModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (ledger.rollingPhase != MarketTypes.RollingPhase.Uninitialized) revert RollingGenesisAlreadyStarted();

        uint64 ts = uint64(block.timestamp);
        uint64 opened = _openRollingEpoch(templateId, ts, t);
        ledger.rollingPhase = MarketTypes.RollingPhase.GenesisOpen;
        emit RollingGenesisStarted(
            templateId, opened, uint64(ts + t.rollingIntervalSeconds), uint64(ts + 2 * t.rollingIntervalSeconds)
        );
    }

    /// @notice Lock the genesis-open epoch and open the next; enters Live rolling phase. Missed buffer or oracle issues halt instead of reverting.
    function genesisLockRolling(bytes32 templateId) external onlyWorkerOrAdmin notPausedWorkerOps nonReentrant {
        if (!configInitialized) revert Unauthorized();
        MarketTypes.Template storage t = templates[templateId];
        if (t.executionMode != MarketTypes.ExecutionMode.Rolling) revert RollingModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (ledger.rollingPhase != MarketTypes.RollingPhase.GenesisOpen) revert RollingWrongPhase();

        uint64 k = ledger.activeEpochId;
        _requireActiveEpoch(ledger, k);
        MarketTypes.Epoch storage e1 = epochs[templateId][k];
        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < e1.timing.lockAt) revert TooEarlyToLock();
        if (nowTs > e1.timing.lockAt + t.rollingBufferSeconds) {
            _haltRolling(templateId, ledger, MarketTypes.RollingHaltReason.BufferMissOnLock, k);
            return;
        }

        int256 priceE8;
        uint64 publishTime;
        uint256 confidenceE8;
        try priceOracle.getNormalizedPrice(t.oracleFeedId, oracleConfig.maxDelaySeconds, nowTs) returns (
            int256 p, uint64 pt, uint256 c
        ) {
            priceE8 = p;
            publishTime = pt;
            confidenceE8 = c;
        } catch {
            _haltRolling(templateId, ledger, MarketTypes.RollingHaltReason.OracleFailure, k);
            return;
        }
        if (!_confidenceWithinBand(priceE8, confidenceE8)) {
            _haltRolling(templateId, ledger, MarketTypes.RollingHaltReason.OracleConfidenceWide, k);
            return;
        }

        _applyLock(templateId, k, priceE8, publishTime, confidenceE8);

        uint64 newOpen = _openRollingEpoch(templateId, nowTs, t);
        ledger.rollingPhase = MarketTypes.RollingPhase.Live;
        emit RollingGenesisLocked(templateId, k, newOpen);
    }

    /// @notice One keeper tx: resolve (k-1), lock (k), open (k+1). Same oracle sample for lock A and resolve B.
    function executeRollingRound(bytes32 templateId) external onlyWorkerOrAdmin notPausedWorkerOps nonReentrant {
        _executeRollingRoundCore(templateId);
    }

    function _executeRollingRoundCore(bytes32 templateId) internal {
        if (!configInitialized) revert Unauthorized();
        MarketTypes.Template storage t = templates[templateId];
        if (t.executionMode != MarketTypes.ExecutionMode.Rolling) revert RollingModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (ledger.rollingPhase != MarketTypes.RollingPhase.Live) revert RollingWrongPhase();

        uint64 k = ledger.activeEpochId;
        if (k < 2) revert InvalidEpochState();
        uint64 prev = k - 1;

        MarketTypes.Epoch storage ePrev = epochs[templateId][prev];
        MarketTypes.Epoch storage eCur = epochs[templateId][k];
        uint64 nowTs = uint64(block.timestamp);

        if (nowTs < ePrev.timing.resolveAt) revert TooEarlyToResolve();
        if (nowTs > ePrev.timing.resolveAt + t.rollingBufferSeconds) {
            _haltRolling(templateId, ledger, MarketTypes.RollingHaltReason.BufferMissOnResolve, prev);
            return;
        }
        if (nowTs < eCur.timing.lockAt) revert TooEarlyToLock();
        if (nowTs > eCur.timing.lockAt + t.rollingBufferSeconds) {
            _haltRolling(templateId, ledger, MarketTypes.RollingHaltReason.BufferMissOnLock, k);
            return;
        }

        int256 priceE8;
        uint64 publishTime;
        uint256 confidenceE8;
        try priceOracle.getNormalizedPrice(t.oracleFeedId, oracleConfig.maxDelaySeconds, nowTs) returns (
            int256 p, uint64 pt, uint256 c
        ) {
            priceE8 = p;
            publishTime = pt;
            confidenceE8 = c;
        } catch {
            _haltRolling(templateId, ledger, MarketTypes.RollingHaltReason.OracleFailure, k);
            return;
        }
        if (!_confidenceWithinBand(priceE8, confidenceE8)) {
            _haltRolling(templateId, ledger, MarketTypes.RollingHaltReason.OracleConfidenceWide, k);
            return;
        }

        _finishResolveEpochRolling(templateId, prev, priceE8, publishTime, confidenceE8);
        _applyLock(templateId, k, priceE8, publishTime, confidenceE8);
        uint64 newOpen = _openRollingEpoch(templateId, nowTs, t);

        emit RollingRoundExecuted(templateId, prev, k, newOpen);
    }

    /// @notice Amortize calldata for multi-template rolling keepers.
    function executeRollingRoundBatch(bytes32[] calldata templateIds)
        external
        onlyWorkerOrAdmin
        notPausedWorkerOps
        nonReentrant
    {
        uint256 n = templateIds.length;
        for (uint256 i = 0; i < n; i++) {
            _executeRollingRoundCore(templateIds[i]);
        }
    }

    function pauseProgram(bool paused) external onlyAdmin {
        globalPaused = paused;
    }

    /// @notice Emergency: stop rolling keeper progression (users can still claim; use recovery flow to re-bootstrap).
    function haltRollingMarket(bytes32 templateId) external onlyAdmin {
        MarketTypes.Template storage t = templates[templateId];
        if (t.executionMode != MarketTypes.ExecutionMode.Rolling) revert RollingModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (
            ledger.rollingPhase != MarketTypes.RollingPhase.GenesisOpen
                && ledger.rollingPhase != MarketTypes.RollingPhase.Live
        ) revert RollingWrongPhase();
        _haltRolling(
            templateId, ledger, MarketTypes.RollingHaltReason.ManualAdmin, ledger.activeEpochId
        );
    }

    /// @dev After halt: pause, cancel stuck Open/Locked epochs via `cancelRollingEpochWhileHalted`, then reset cursors and re-run genesis.
    function resetRollingLifecycle(bytes32 templateId, uint64 nextRollingEpochId) external onlyAdmin {
        if (!globalPaused) revert ProtocolPaused();
        MarketTypes.Template storage t = templates[templateId];
        if (t.executionMode != MarketTypes.ExecutionMode.Rolling) revert RollingModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (ledger.rollingPhase != MarketTypes.RollingPhase.Halted) revert RollingWrongPhase();
        uint64 hi = ledger.lastResolvedEpochId;
        if (ledger.activeEpochId > hi) hi = ledger.activeEpochId;
        if (nextRollingEpochId == 0 || nextRollingEpochId <= hi) revert InvalidRollingRecovery();

        ledger.rollingPhase = MarketTypes.RollingPhase.Uninitialized;
        ledger.rollingHaltReason = MarketTypes.RollingHaltReason.NoneReason;
        ledger.haltedAtEpochId = 0;
        ledger.rollingNextEpochId = nextRollingEpochId;
        ledger.activeEpochId = 0;
        emit RollingLifecycleReset(templateId, nextRollingEpochId);
    }

    /// @dev Cancel an Open or Locked rolling epoch while halted (unlocks the locked predecessor the active-epoch-only `cancelEpoch` cannot reach).
    function cancelRollingEpochWhileHalted(
        bytes32 templateId,
        uint64 epochId,
        MarketTypes.CancelReason reason,
        bool voided
    ) external onlyAdmin nonReentrant {
        if (!globalPaused) revert ProtocolPaused();
        if (reason == MarketTypes.CancelReason.NoneReason) revert InvalidEpochState();
        MarketTypes.Template storage t = templates[templateId];
        if (t.executionMode != MarketTypes.ExecutionMode.Rolling) revert RollingModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (ledger.rollingPhase != MarketTypes.RollingPhase.Halted) revert RollingWrongPhase();

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (!e.exists) revert InvalidEpochState();
        if (!(e.status == MarketTypes.EpochStatus.Open || e.status == MarketTypes.EpochStatus.Locked)) {
            revert InvalidEpochState();
        }

        uint256 refundLiability = e.totalPool;
        if (refundLiability > 0) {
            vaults[templateId].active -= refundLiability;
            vaults[templateId].claims += refundLiability;
            MarketMath.reserveClaimsFromActive(ledger, refundLiability);
        }

        e.claimLiabilityTotal = 0;
        e.totalRefundLiability = refundLiability;
        e.settlementFeeTotal = 0;
        e.winningOutcomeMask = 0;
        e.remainingWinningStake = 0;
        e.cancelReason = reason;
        e.refundMode = true;
        e.claimable = true;
        e.status = voided ? MarketTypes.EpochStatus.Voided : MarketTypes.EpochStatus.Cancelled;
        e.resolvedAt = uint64(block.timestamp);
        if (epochId > ledger.lastResolvedEpochId) {
            ledger.lastResolvedEpochId = epochId;
        }

        emit EpochCancelled(templateId, epochId, uint8(reason));
    }

    function setWorkerAuthority(address worker) external onlyAdmin {
        if (worker == address(0)) revert InvalidAuthority();
        workerAuthority = worker;
    }

    function setTreasury(address t) external onlyAdmin {
        if (t == address(0)) revert InvalidAuthority();
        treasury = t;
    }

    function openEpoch(bytes32 templateId, uint64 epochId, uint64 openAt, uint64 lockAt, uint64 resolveAt)
        external
        onlyWorkerOrAdmin
        notPausedWorkerOps
    {
        _openEpoch(templateId, epochId, openAt, lockAt, resolveAt);
    }

    /// @notice Amortizes fixed calldata/base gas for keepers maintaining multiple templates.
    function openEpochsBatch(
        bytes32[] calldata templateIds,
        uint64[] calldata epochIds,
        uint64[] calldata openAt,
        uint64[] calldata lockAt,
        uint64[] calldata resolveAt
    ) external onlyWorkerOrAdmin notPausedWorkerOps {
        uint256 n = templateIds.length;
        if (!(n == epochIds.length && n == openAt.length && n == lockAt.length && n == resolveAt.length)) {
            revert InvalidTemplate();
        }
        for (uint256 i = 0; i < n; i++) {
            _openEpoch(templateIds[i], epochIds[i], openAt[i], lockAt[i], resolveAt[i]);
        }
    }

    function _openEpoch(bytes32 templateId, uint64 epochId, uint64 openAt, uint64 lockAt, uint64 resolveAt) internal {
        if (templates[templateId].executionMode == MarketTypes.ExecutionMode.Rolling) revert ManualModeOnly();
        if (!(openAt < lockAt && lockAt < resolveAt)) revert InvalidTiming();
        MarketTypes.Template storage t = templates[templateId];
        if (t.version == 0) revert InvalidTemplate();
        if (!t.active) revert TemplateInactive();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        _requireCanOpenNextEpoch(ledger, epochId);

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (e.exists) revert EpochAlreadyExists();

        uint64 nowTs = uint64(block.timestamp);
        e.version = MarketTypes.VERSION;
        e.status = MarketTypes.EpochStatus.Open;
        e.cancelReason = MarketTypes.CancelReason.NoneReason;
        e.outcomeCount = t.outcomeCount;
        e.marketType = t.marketType;
        e.condition = t.condition;
        e.switchFeeBps = t.switchFeeBps;
        e.settlementFeeBps = t.settlementFeeBps;
        e.equalPriceVoids = t.equalPriceVoids;
        e.feeOnLosingPool = t.feeOnLosingPool;
        e.allowMultiSidePositions = t.allowMultiSidePositions;
        e.refundMode = false;
        e.claimable = false;
        e.exists = true;
        e.epochId = epochId;
        e.totalPositions = 0;
        e.timing = MarketTypes.MarketTiming({openAt: openAt, lockAt: lockAt, resolveAt: resolveAt});
        e.createdAt = nowTs;
        e.lockedAt = 0;
        e.resolvedAt = 0;
        e.checkpointA = MarketTypes.OracleCheckpoint({valueE8: 0, publishTime: 0, confidenceE8: 0, written: false});
        e.checkpointB = MarketTypes.OracleCheckpoint({valueE8: 0, publishTime: 0, confidenceE8: 0, written: false});
        e.oracleFeedId = t.oracleFeedId;
        e.absoluteThresholdValueE8 = t.absoluteThresholdValueE8;
        e.rangeBoundsE8 = t.rangeBoundsE8;
        e.winningOutcomeMask = 0;
        e.totalPool = 0;
        e.switchFeeTotal = 0;
        e.settlementFeeTotal = 0;
        e.claimLiabilityTotal = 0;
        e.totalRefundLiability = 0;
        e.claimedTotal = 0;
        e.remainingWinningStake = 0;
        for (uint256 i = 0; i < MarketTypes.MAX_OUTCOMES; i++) {
            e.outcomePools[i] = 0;
        }

        ledger.activeEpochId = epochId;
        emit EpochOpened(templateId, epochId, openAt, lockAt, resolveAt);
    }

    /// @dev Rolling-only open: uses `ledger.rollingNextEpochId`, then advances it. No manual sequential open guard.
    function _openRollingEpoch(bytes32 templateId, uint64 startTs, MarketTypes.Template storage t)
        internal
        returns (uint64 openedEpochId)
    {
        if (t.version == 0) revert InvalidTemplate();
        if (!t.active) revert TemplateInactive();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();

        uint64 epochId = ledger.rollingNextEpochId;
        if (epochId == 0) revert InvalidEpochState();

        uint64 inter = t.rollingIntervalSeconds;
        uint64 openAt = startTs;
        uint64 lockAt = startTs + inter;
        uint64 resolveAt = startTs + 2 * inter;
        if (!(openAt < lockAt && lockAt < resolveAt)) revert InvalidTiming();

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (e.exists) revert EpochAlreadyExists();

        uint64 nowTs = uint64(block.timestamp);
        e.version = MarketTypes.VERSION;
        e.status = MarketTypes.EpochStatus.Open;
        e.cancelReason = MarketTypes.CancelReason.NoneReason;
        e.outcomeCount = t.outcomeCount;
        e.marketType = t.marketType;
        e.condition = t.condition;
        e.switchFeeBps = t.switchFeeBps;
        e.settlementFeeBps = t.settlementFeeBps;
        e.equalPriceVoids = t.equalPriceVoids;
        e.feeOnLosingPool = t.feeOnLosingPool;
        e.allowMultiSidePositions = t.allowMultiSidePositions;
        e.refundMode = false;
        e.claimable = false;
        e.exists = true;
        e.epochId = epochId;
        e.totalPositions = 0;
        e.timing = MarketTypes.MarketTiming({openAt: openAt, lockAt: lockAt, resolveAt: resolveAt});
        e.createdAt = nowTs;
        e.lockedAt = 0;
        e.resolvedAt = 0;
        e.checkpointA = MarketTypes.OracleCheckpoint({valueE8: 0, publishTime: 0, confidenceE8: 0, written: false});
        e.checkpointB = MarketTypes.OracleCheckpoint({valueE8: 0, publishTime: 0, confidenceE8: 0, written: false});
        e.oracleFeedId = t.oracleFeedId;
        e.absoluteThresholdValueE8 = t.absoluteThresholdValueE8;
        e.rangeBoundsE8 = t.rangeBoundsE8;
        e.winningOutcomeMask = 0;
        e.totalPool = 0;
        e.switchFeeTotal = 0;
        e.settlementFeeTotal = 0;
        e.claimLiabilityTotal = 0;
        e.totalRefundLiability = 0;
        e.claimedTotal = 0;
        e.remainingWinningStake = 0;
        for (uint256 i = 0; i < MarketTypes.MAX_OUTCOMES; i++) {
            e.outcomePools[i] = 0;
        }

        ledger.activeEpochId = epochId;
        ledger.rollingNextEpochId = epochId + 1;
        openedEpochId = epochId;
        emit EpochOpened(templateId, epochId, openAt, lockAt, resolveAt);
    }

    function _haltRolling(
        bytes32 templateId,
        MarketTypes.Ledger storage ledger,
        MarketTypes.RollingHaltReason reason,
        uint64 atEpoch
    ) internal {
        ledger.rollingPhase = MarketTypes.RollingPhase.Halted;
        ledger.rollingHaltReason = reason;
        ledger.haltedAtEpochId = atEpoch;
        emit RollingHalted(templateId, uint8(reason), atEpoch);
    }

    function depositToSide(bytes32 templateId, uint64 epochId, uint8 outcomeIndex, uint256 amount)
        external
        nonReentrant
        notPausedUserOps
    {
        if (!configInitialized) revert Unauthorized();
        if (amount == 0) revert ZeroStake();
        MarketTypes.Template storage t = templates[templateId];
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (t.executionMode == MarketTypes.ExecutionMode.Rolling && ledger.rollingPhase == MarketTypes.RollingPhase.Halted)
        {
            revert RollingHaltedUserOps();
        }
        _requireActiveEpoch(ledger, epochId);

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (!(uint256(outcomeIndex) < uint256(e.outcomeCount))) revert InvalidOutcome();

        uint64 nowTs = uint64(block.timestamp);
        if (!e.isEpochOpen(nowTs)) revert BettingClosed();

        stakeToken.safeTransferFrom(msg.sender, address(this), amount);

        bytes32 pk = positionKey(templateId, epochId);
        MarketTypes.Position storage pos = positions[pk][msg.sender];
        if (!pos.initialized) {
            pos.version = MarketTypes.VERSION;
            pos.initialized = true;
            for (uint256 i = 0; i < MarketTypes.MAX_OUTCOMES; i++) {
                pos.stakes[i] = 0;
            }
            pos.totalStake = 0;
            pos.switchFeesPaid = 0;
            pos.entryFeesPaid = 0;
            pos.claimedAmount = 0;
            pos.claimed = false;
            e.totalPositions += 1;
        }

        if (!_canDepositToOutcome(pos, outcomeIndex, e.outcomeCount, e.allowMultiSidePositions)) {
            revert SingleSideViolation();
        }

        pos.stakes[outcomeIndex] += amount;
        pos.totalStake += amount;
        e.outcomePools[outcomeIndex] += amount;
        e.totalPool += amount;
        ledger.increaseActiveCollateral(amount);
        vaults[templateId].active += amount;

        emit PositionDeposited(templateId, epochId, msg.sender, outcomeIndex, amount);
    }

    function switchSide(bytes32 templateId, uint64 epochId, uint8 fromOutcome, uint8 toOutcome, uint256 grossAmount)
        external
        nonReentrant
        notPausedUserOps
    {
        if (!configInitialized) revert Unauthorized();
        if (grossAmount == 0) revert ZeroStake();
        if (fromOutcome == toOutcome) revert InvalidOutcome();
        MarketTypes.Template storage t = templates[templateId];
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (t.executionMode == MarketTypes.ExecutionMode.Rolling && ledger.rollingPhase == MarketTypes.RollingPhase.Halted)
        {
            revert RollingHaltedUserOps();
        }
        _requireActiveEpoch(ledger, epochId);

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (!(uint256(fromOutcome) < uint256(e.outcomeCount) && uint256(toOutcome) < uint256(e.outcomeCount))) {
            revert InvalidOutcome();
        }

        uint64 nowTs = uint64(block.timestamp);
        if (!e.isEpochOpen(nowTs)) revert BettingClosed();

        bytes32 pk = positionKey(templateId, epochId);
        MarketTypes.Position storage pos = positions[pk][msg.sender];
        if (pos.stakes[fromOutcome] < grossAmount) revert InsufficientSourceStake();

        (uint256 netAmount, uint256 feeAmount) = MarketMath.computeSwitch(grossAmount, e.switchFeeBps);
        if (netAmount == 0) revert AmountTooSmall();

        if (!e.allowMultiSidePositions) {
            if (!_isSingleSidedOn(pos, fromOutcome, e.outcomeCount)) revert SingleSideViolation();
            if (grossAmount != pos.stakes[fromOutcome]) revert PartialSwitchDisallowed();
        }

        pos.stakes[fromOutcome] -= grossAmount;
        pos.stakes[toOutcome] += netAmount;
        pos.totalStake -= feeAmount;
        pos.switchFeesPaid += feeAmount;

        e.outcomePools[fromOutcome] -= grossAmount;
        e.outcomePools[toOutcome] += netAmount;
        e.totalPool -= feeAmount;
        e.switchFeeTotal += feeAmount;

        if (feeAmount > 0) {
            vaults[templateId].active -= feeAmount;
            vaults[templateId].fees += feeAmount;
            MarketMath.reserveFeesFromActive(ledger, feeAmount);
        }

        emit SideSwitched(templateId, epochId, msg.sender, fromOutcome, toOutcome, grossAmount, feeAmount, netAmount);
    }

    function lockEpoch(bytes32 templateId, uint64 epochId) external onlyWorkerOrAdmin notPausedWorkerOps {
        _lockEpoch(templateId, epochId);
    }

    function lockEpochsBatch(bytes32[] calldata templateIds, uint64[] calldata epochIds)
        external
        onlyWorkerOrAdmin
        notPausedWorkerOps
    {
        uint256 n = templateIds.length;
        if (n != epochIds.length) revert InvalidTemplate();
        for (uint256 i = 0; i < n; i++) {
            _lockEpoch(templateIds[i], epochIds[i]);
        }
    }

    function _lockEpoch(bytes32 templateId, uint64 epochId) internal {
        if (!configInitialized) revert Unauthorized();
        if (templates[templateId].executionMode == MarketTypes.ExecutionMode.Rolling) revert ManualModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        _requireActiveEpoch(ledger, epochId);

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        uint64 nowTs = uint64(block.timestamp);
        if (!e.isLockable(nowTs)) revert TooEarlyToLock();

        if (MarketTypes.requiresCheckpointAOnLock(e)) {
            (int256 priceE8, uint64 publishTime, uint256 confidenceE8) =
                priceOracle.getNormalizedPrice(e.oracleFeedId, oracleConfig.maxDelaySeconds, nowTs);
            _enforceConfidence(priceE8, confidenceE8);
            _applyLock(templateId, epochId, priceE8, publishTime, confidenceE8);
        } else {
            _applyLock(templateId, epochId, 0, 0, 0);
        }
    }

    /// @dev Shared lock transition; for Direction uses supplied oracle sample (single read in rolling execute).
    function _applyLock(bytes32 templateId, uint64 epochId, int256 priceE8, uint64 publishTime, uint256 confidenceE8)
        internal
    {
        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        uint64 nowTs = uint64(block.timestamp);
        if (!e.isLockable(nowTs)) revert TooEarlyToLock();

        if (MarketTypes.requiresCheckpointAOnLock(e)) {
            if (e.checkpointA.written) revert CheckpointAlreadyWritten();
            _enforceConfidence(priceE8, confidenceE8);
            if (!e.validateCheckpointAPublishTime(publishTime)) revert InvalidOraclePublishTime();
            e.checkpointA = MarketTypes.OracleCheckpoint({
                valueE8: priceE8, publishTime: publishTime, confidenceE8: _toConf128(confidenceE8), written: true
            });
        }

        e.status = MarketTypes.EpochStatus.Locked;
        e.lockedAt = nowTs;
        emit EpochLocked(templateId, epochId, e.checkpointA.valueE8, e.checkpointA.publishTime);
    }

    function resolveEpoch(bytes32 templateId, uint64 epochId)
        external
        onlyWorkerOrAdmin
        notPausedWorkerOps
        nonReentrant
    {
        _resolveEpoch(templateId, epochId);
    }

    function resolveEpochsBatch(bytes32[] calldata templateIds, uint64[] calldata epochIds)
        external
        onlyWorkerOrAdmin
        notPausedWorkerOps
        nonReentrant
    {
        uint256 n = templateIds.length;
        if (n != epochIds.length) revert InvalidTemplate();
        for (uint256 i = 0; i < n; i++) {
            _resolveEpoch(templateIds[i], epochIds[i]);
        }
    }

    function _resolveEpoch(bytes32 templateId, uint64 epochId) internal {
        if (!configInitialized) revert Unauthorized();
        if (templates[templateId].executionMode == MarketTypes.ExecutionMode.Rolling) revert ManualModeOnly();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        _requireActiveEpoch(ledger, epochId);

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        uint64 nowTs = uint64(block.timestamp);
        if (!e.isResolvable(nowTs)) revert TooEarlyToResolve();
        if (e.checkpointB.written) revert CheckpointAlreadyWritten();

        (int256 priceE8, uint64 publishTime, uint256 confidenceE8) =
            priceOracle.getNormalizedPrice(e.oracleFeedId, oracleConfig.maxDelaySeconds, nowTs);
        _enforceConfidence(priceE8, confidenceE8);
        _finishResolveEpoch(templateId, epochId, priceE8, publishTime, confidenceE8, false, nowTs);
    }

    function _finishResolveEpochRolling(
        bytes32 templateId,
        uint64 epochId,
        int256 priceE8,
        uint64 publishTime,
        uint256 confidenceE8
    ) internal {
        uint64 nowTs = uint64(block.timestamp);
        _finishResolveEpoch(templateId, epochId, priceE8, publishTime, confidenceE8, true, nowTs);
    }

    /// @param rollingLink true: resolve epoch `epochId` where `epochId + 1 == activeEpochId` (rolling pipeline).
    function _finishResolveEpoch(
        bytes32 templateId,
        uint64 epochId,
        int256 priceE8,
        uint64 publishTime,
        uint256 confidenceE8,
        bool rollingLink,
        uint64 nowTs
    ) internal {
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (rollingLink) {
            if (epochId + 1 != ledger.activeEpochId) revert InvalidEpochState();
        } else {
            if (epochId != ledger.activeEpochId) revert EpochNotActive();
        }

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (!e.isResolvable(nowTs)) revert TooEarlyToResolve();
        if (e.checkpointB.written) revert CheckpointAlreadyWritten();
        if (!e.validateCheckpointBPublishTime(publishTime)) revert InvalidOraclePublishTime();

        e.checkpointB = MarketTypes.OracleCheckpoint({
            valueE8: priceE8, publishTime: publishTime, confidenceE8: _toConf128(confidenceE8), written: true
        });

        bool refundMode;
        uint256 winningMask;
        uint256 claimLiabilityTotal;
        uint256 settlementFeeTotal;

        if (e.marketType == MarketTypes.MarketType.Direction) {
            (bool voided, uint256 mask) = Resolvers.resolveDirection(e.checkpointA, e.checkpointB, e.equalPriceVoids);
            if (voided) {
                refundMode = true;
                winningMask = 0;
                claimLiabilityTotal = e.totalPool;
                settlementFeeTotal = 0;
            } else {
                refundMode = false;
                winningMask = mask;
                e.winningOutcomeMask = mask;
                (claimLiabilityTotal, settlementFeeTotal,) =
                    MarketMath.computeEpochClaimLiabilityStorage(e, e.settlementFeeBps, e.feeOnLosingPool);
            }
        } else if (e.marketType == MarketTypes.MarketType.Threshold) {
            refundMode = false;
            winningMask = Resolvers.resolveThreshold(e.condition, e.absoluteThresholdValueE8, e.checkpointB);
            e.winningOutcomeMask = winningMask;
            (claimLiabilityTotal, settlementFeeTotal,) =
                MarketMath.computeEpochClaimLiabilityStorage(e, e.settlementFeeBps, e.feeOnLosingPool);
        } else {
            refundMode = false;
            winningMask = Resolvers.resolveRangeClose(e.checkpointB, e.outcomeCount, e.rangeBoundsE8);
            e.winningOutcomeMask = winningMask;
            (claimLiabilityTotal, settlementFeeTotal,) =
                MarketMath.computeEpochClaimLiabilityStorage(e, e.settlementFeeBps, e.feeOnLosingPool);
        }

        if (claimLiabilityTotal > 0) {
            vaults[templateId].active -= claimLiabilityTotal;
            vaults[templateId].claims += claimLiabilityTotal;
            MarketMath.reserveClaimsFromActive(ledger, claimLiabilityTotal);
        }
        if (settlementFeeTotal > 0) {
            vaults[templateId].active -= settlementFeeTotal;
            vaults[templateId].fees += settlementFeeTotal;
            MarketMath.reserveFeesFromActive(ledger, settlementFeeTotal);
        }

        e.winningOutcomeMask = winningMask;
        e.claimLiabilityTotal = refundMode ? 0 : claimLiabilityTotal;
        e.totalRefundLiability = refundMode ? claimLiabilityTotal : 0;
        e.settlementFeeTotal = settlementFeeTotal;
        e.remainingWinningStake = refundMode ? 0 : MarketTypes.winningPoolTotalStorage(e);
        e.refundMode = refundMode;
        e.claimable = true;
        e.status = refundMode ? MarketTypes.EpochStatus.Voided : MarketTypes.EpochStatus.Resolved;
        e.resolvedAt = nowTs;
        ledger.lastResolvedEpochId = epochId;

        emit EpochResolved(templateId, epochId, winningMask, claimLiabilityTotal, settlementFeeTotal, refundMode);
    }

    function cancelEpoch(bytes32 templateId, uint64 epochId, MarketTypes.CancelReason reason, bool voided)
        external
        onlyWorkerOrAdmin
        nonReentrant
    {
        if (!configInitialized) revert Unauthorized();
        if (reason == MarketTypes.CancelReason.NoneReason) revert InvalidEpochState();
        MarketTypes.Template storage t = templates[templateId];
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (
            t.executionMode == MarketTypes.ExecutionMode.Rolling && ledger.rollingPhase == MarketTypes.RollingPhase.Live
        ) {
            revert ManualModeOnly();
        }
        if (!ledger.initialized) revert InvalidTemplate();
        _requireActiveEpoch(ledger, epochId);

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (!(e.status == MarketTypes.EpochStatus.Open || e.status == MarketTypes.EpochStatus.Locked)) {
            revert InvalidEpochState();
        }

        uint256 refundLiability = e.totalPool;
        if (refundLiability > 0) {
            vaults[templateId].active -= refundLiability;
            vaults[templateId].claims += refundLiability;
            MarketMath.reserveClaimsFromActive(ledger, refundLiability);
        }

        e.claimLiabilityTotal = 0;
        e.totalRefundLiability = refundLiability;
        e.settlementFeeTotal = 0;
        e.winningOutcomeMask = 0;
        e.remainingWinningStake = 0;
        e.cancelReason = reason;
        e.refundMode = true;
        e.claimable = true;
        e.status = voided ? MarketTypes.EpochStatus.Voided : MarketTypes.EpochStatus.Cancelled;
        e.resolvedAt = uint64(block.timestamp);
        ledger.lastResolvedEpochId = epochId;

        emit EpochCancelled(templateId, epochId, uint8(reason));
    }

    function claim(bytes32 templateId, uint64 epochId) external nonReentrant {
        if (!configInitialized) revert Unauthorized();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();

        MarketTypes.Epoch storage e = epochs[templateId][epochId];
        if (!e.claimable) revert ClaimNotAvailable();

        bytes32 pk = positionKey(templateId, epochId);
        MarketTypes.Position storage pos = positions[pk][msg.sender];
        if (pos.claimed) revert AlreadyClaimed();

        uint256 amount;
        uint256 winningStake;
        if (e.refundMode) {
            amount = MarketMath.computeRefundTotal(pos.totalStake);
            winningStake = 0;
        } else {
            uint256[8] memory stakes;
            for (uint256 i = 0; i < MarketTypes.MAX_OUTCOMES; i++) {
                stakes[i] = pos.stakes[i];
            }
            (amount, winningStake) = MarketMath.computeClaimPayoutStorage(e, stakes, ledger.claimsReserveTotal);
        }

        if (amount == 0) revert NothingToClaim();

        stakeToken.safeTransfer(msg.sender, amount);

        pos.claimedAmount = amount;
        pos.claimed = true;
        e.claimedTotal += amount;
        if (!e.refundMode) {
            e.remainingWinningStake -= winningStake;
        }
        MarketMath.releaseClaimOnWithdraw(ledger, amount);
        vaults[templateId].claims -= amount;

        emit Claimed(templateId, epochId, msg.sender, amount);
    }

    function withdrawFees(bytes32 templateId, uint256 amount) external onlyTreasuryOrAdmin nonReentrant {
        if (!configInitialized) revert Unauthorized();
        if (amount == 0) revert NothingToClaim();
        MarketTypes.Ledger storage ledger = ledgers[templateId];
        if (!ledger.initialized) revert InvalidTemplate();
        if (ledger.feeReserveTotal < amount) revert NothingToClaim();

        stakeToken.safeTransfer(treasury, amount);
        MarketMath.releaseFeeOnWithdraw(ledger, amount);
        vaults[templateId].fees -= amount;

        emit FeesWithdrawn(templateId, amount);
    }

    function templateIdFromSlug(string memory slug) public pure returns (bytes32) {
        return keccak256(bytes(slug));
    }

    function positionKey(bytes32 templateId, uint64 epochId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(templateId, epochId));
    }

    function getVaultBalances(bytes32 templateId) external view returns (uint256 active, uint256 claims, uint256 fees) {
        MarketTypes.VaultBalances storage v = vaults[templateId];
        return (v.active, v.claims, v.fees);
    }

    /// @notice Rolling cursor + phase for keepers and UIs (avoids unpacking the full public `ledgers` tuple).
    function getRollingLifecycle(bytes32 templateId)
        external
        view
        returns (
            MarketTypes.RollingPhase phase,
            MarketTypes.RollingHaltReason haltReason,
            uint64 haltedAtEpochId,
            uint64 rollingNextEpochId,
            uint64 activeEpochId,
            uint64 lastResolvedEpochId
        )
    {
        MarketTypes.Ledger storage l = ledgers[templateId];
        return (
            l.rollingPhase,
            l.rollingHaltReason,
            l.haltedAtEpochId,
            l.rollingNextEpochId,
            l.activeEpochId,
            l.lastResolvedEpochId
        );
    }

    function _toConf128(uint256 confidenceE8) internal pure returns (uint128) {
        if (confidenceE8 > type(uint128).max) revert ConfidenceOverflow();
        return uint128(confidenceE8);
    }

    function _confidenceWithinBand(int256 priceE8, uint256 confidenceE8) internal view returns (bool) {
        uint256 abs = priceE8 >= 0 ? uint256(priceE8) : uint256(-priceE8);
        uint256 limit = (abs * uint256(oracleConfig.maxConfidenceBps)) / 10_000;
        return confidenceE8 <= limit;
    }

    function _enforceConfidence(int256 priceE8, uint256 confidenceE8) internal view {
        if (!_confidenceWithinBand(priceE8, confidenceE8)) revert OracleConfidenceTooWide();
    }

    function _requireCanOpenNextEpoch(MarketTypes.Ledger storage ledger, uint64 epochId) internal view {
        if (ledger.activeEpochId != ledger.lastResolvedEpochId) revert PreviousEpochUnresolved();
        if (epochId != ledger.activeEpochId + 1) revert EpochAlreadyExists();
    }

    function _requireActiveEpoch(MarketTypes.Ledger storage ledger, uint64 epochId) internal view {
        if (epochId != ledger.activeEpochId) revert EpochNotActive();
    }

    function _validateTemplate(MarketTypes.Template storage t) internal view {
        if (t.outcomeCount > maxOutcomes) revert TooManyOutcomes();
        if (t.switchFeeBps > 10_000 || t.settlementFeeBps > 10_000) revert InvalidFeeBps();

        if (t.marketType == MarketTypes.MarketType.Direction) {
            if (t.outcomeCount != 2) revert InvalidTemplate();
            if (t.thresholdRule != MarketTypes.ThresholdRule.None) revert InvalidTemplate();
            if (!t.equalPriceVoids) revert InvalidTemplate();
        } else if (t.marketType == MarketTypes.MarketType.Threshold) {
            if (t.outcomeCount != 2) revert InvalidTemplate();
            if (t.thresholdRule != MarketTypes.ThresholdRule.Absolute) revert InvalidTemplate();
        } else {
            if (t.outcomeCount < 2) revert InvalidTemplate();
            for (uint256 i = 1; i < uint256(t.outcomeCount) - 1; i++) {
                if (!(t.rangeBoundsE8[i - 1] < t.rangeBoundsE8[i])) revert InvalidTemplate();
            }
        }
    }

    function _canDepositToOutcome(
        MarketTypes.Position storage pos,
        uint8 outcomeIndex,
        uint8 outcomeCount,
        bool allowMultiSide
    ) internal view returns (bool) {
        if (allowMultiSide) return true;
        if (pos.totalStake == 0) return true;
        for (uint256 i = 0; i < outcomeCount; i++) {
            if (i != outcomeIndex && pos.stakes[i] != 0) return false;
        }
        return true;
    }

    function _isSingleSidedOn(MarketTypes.Position storage pos, uint8 outcomeIndex, uint8 outcomeCount)
        internal
        view
        returns (bool)
    {
        for (uint256 i = 0; i < outcomeCount; i++) {
            if (i != outcomeIndex && pos.stakes[i] != 0) return false;
        }
        return true;
    }
}
