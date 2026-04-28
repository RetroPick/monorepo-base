package api

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/go-chi/chi/v5"

	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/registry"
)

type prepareMeta struct {
	RequiredRole   string   `json:"requiredRole"`
	RunbookRef     string   `json:"runbookRef"`
	ExpectedEvents []string `json:"expectedEvents"`
	Checklist      []string `json:"validationChecklist"`
}

// Whitelisted write functions for calldata preparation only (no signing/broadcast).
var opsPrepareWhitelist = map[string]prepareMeta{
	"pauseProgram": {
		RequiredRole:   "admin / governance (Safe)",
		RunbookRef:     "package/contract/.operator/.runbook.md — pause / unpause",
		ExpectedEvents: []string{"Paused / program pause state change (see deployment ABI)"},
		Checklist: []string{
			"Confirm incident or drill scope",
			"Verify proxy target (not implementation)",
			"Post-action: read getOperatorGlobalView.globalPaused",
		},
	},
	"upsertTemplate": {
		RequiredRole:   "admin or workerAuthority (per deployment); Safe on mainnet",
		RunbookRef:     "package/contract/.operator/.runbook.md — Before a template goes live; Manual lifecycle",
		ExpectedEvents: []string{"TemplateUpserted"},
		Checklist: []string{
			"Confirm market family approved (.operator/.marketType.md)",
			"Verify oracle feed id, adapter, delay/confidence policy",
			"Confirm executionMode (Manual vs Rolling) and rolling timings if Rolling",
			"Post-action: read getMarketView / getOperatorTemplateView for templateId = keccak256(bytes(slug))",
		},
	},
	"initializeMarket": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Initialize market",
		ExpectedEvents: []string{"MarketInitialized"},
		Checklist: []string{
			"Template upserted and active",
			"Governance agrees on templateId",
			"Post-action: ledger initialized; rollingNextEpochId == 1 for new template",
		},
	},
	"openEpoch": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Open epoch",
		ExpectedEvents: []string{"EpochOpened"},
		Checklist: []string{
			"Protocol not paused; template Manual mode, initialized, active",
			"epochId is next valid id; openAt < lockAt < resolveAt; on-chain timing rules",
			"Post-action: getEpochView shows expected open/lock/resolve",
		},
	},
	"genesisStartRolling": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Rolling lifecycle",
		ExpectedEvents: []string{"RollingGenesisStarted"},
		Checklist: []string{
			"Template Rolling mode, initialized; not Manual openEpoch path",
			"Follow runbook for genesisLockRolling / executeRollingRound after genesis",
			"Post-action: rolling phase and events per getOperatorTemplateView",
		},
	},
	"genesisLockRolling": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Rolling lifecycle — Genesis lock",
		ExpectedEvents: []string{"RollingGenesisLocked"},
		Checklist: []string{
			"After genesisStartRolling; within lock window + buffer",
			"Post-action: rollingPhase Live; schedule executeRollingRound",
		},
	},
	"executeRollingRound": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Rolling steady state",
		ExpectedEvents: []string{"RollingRoundExecuted", "EpochResolved", "EpochLocked", "EpochOpened"},
		Checklist: []string{
			"Template in Live phase; not halted",
			"Oracle fresh within template delay; watch for halt on failure",
		},
	},
	"executeRollingRoundBatch": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Rolling batch",
		ExpectedEvents: []string{"RollingRoundExecuted (per template that advances)"},
		Checklist: []string{
			"Each templateId is Rolling + Live; same worker batching as single tick",
		},
	},
	"openEpochsBatch": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Manual lifecycle — batch open",
		ExpectedEvents: []string{"EpochOpened (per row)"},
		Checklist: []string{
			"Parallel arrays same length; each row valid openEpoch semantics",
		},
	},
	"lockEpochsBatch": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Manual lifecycle — batch lock",
		ExpectedEvents: []string{"EpochLocked / EpochLockedV2 (per row)"},
		Checklist: []string{
			"Each epoch in Open and past lockAt; oracle path valid for type",
		},
	},
	"resolveEpochsBatch": {
		RequiredRole:   "admin or workerAuthority (per deployment)",
		RunbookRef:     "package/contract/.operator/.runbook.md — Manual lifecycle — batch resolve",
		ExpectedEvents: []string{"EpochResolved / EpochResolvedV2 (per row)"},
		Checklist: []string{
			"Each epoch Locked and past resolveAt",
		},
	},
	"haltRollingMarket":             emergencyMeta("package/contract/.operator/.runbook.md — rolling halt", []string{"RollingMarketHalted"}),
	"resetRollingLifecycle":         emergencyMeta("package/contract/.operator/.runbook.md — rolling recovery reset", []string{"RollingLifecycleReset"}),
	"cancelEpoch":                   emergencyMeta("package/contract/.operator/.runbook.md — manual emergency cancel", []string{"EpochCancelled / EpochVoided"}),
	"cancelRollingEpochWhileHalted": emergencyMeta("package/contract/.operator/.runbook.md — rolling emergency cancel while halted", []string{"EpochCancelled / EpochVoided"}),
	"yieldEmergencyWithdraw":        emergencyMeta("package/contract/.operator/.runbook.md — yield emergency withdraw", []string{"YieldEmergencyWithdrawn"}),
	"reconcileEpochRoutedPrincipal": emergencyMeta("package/contract/.operator/.runbook.md — routed-principal recovery", []string{"EpochRoutedPrincipalReconciled"}),
	"recoverRoutedSettledClaims":    emergencyMeta("package/contract/.operator/.runbook.md — routed settled-claims recovery", []string{"RoutedSettledClaimsRecovered"}),
	"reassignRecoveredBalance":      emergencyMeta("package/contract/.operator/.runbook.md — recovered-balance reassignment", []string{"EmergencyRecoveredBalanceReassigned"}),
	"finalizeRecoveredYield":        emergencyMeta("package/contract/.operator/.runbook.md — finalize recovered yield", []string{"RecoveredYieldFinalized"}),
	"resetYieldRouterFailures":      emergencyMeta("package/contract/.operator/.runbook.md — yield router reset", []string{"YieldRouterFailuresReset"}),
	"withdrawFees":                  emergencyMeta("package/contract/.operator/.runbook.md — fee withdrawal", []string{"FeesWithdrawn"}),
}

func emergencyMeta(runbook string, events []string) prepareMeta {
	return prepareMeta{
		RequiredRole:   "admin / governance (Safe)",
		RunbookRef:     runbook,
		ExpectedEvents: events,
		Checklist: []string{
			"Confirm incident scope and affected template/epoch",
			"Verify proxy target, chain id, and calldata before signing",
			"Post-action: refresh operator global/template/epoch views and incident log",
		},
	}
}

type prepareRequest struct {
	Function string            `json:"function"`
	Args     []json.RawMessage `json:"args"`
}

func registerOpsPrepareRoutes(r chi.Router, eth *ethops.Caller, reg *registry.Registry) {
	if eth == nil {
		return
	}
	r.Post("/tx/prepare", func(w http.ResponseWriter, req *http.Request) {
		var body prepareRequest
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		fn := strings.TrimSpace(body.Function)
		meta, ok := opsPrepareWhitelist[fn]
		if !ok {
			http.Error(w, `{"error":"function not allowed for prepare"}`, http.StatusForbidden)
			return
		}
		args, err := decodePrepareArgs(fn, body.Args)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"args","message":%q}`, err.Error()), http.StatusBadRequest)
			return
		}
		calldata, err := eth.PrepareTx(reg.ChainID, common.HexToAddress(reg.Contracts.MarketEngineProxy), fn, args, nil)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":"pack","message":%q}`, err.Error()), http.StatusBadRequest)
			return
		}
		proxy := common.HexToAddress(reg.Contracts.MarketEngineProxy)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"target":              proxy.Hex(),
			"chainId":             reg.ChainID,
			"abi":                 "IMarketEngine",
			"function":            fn,
			"calldata":            "0x" + hex.EncodeToString(calldata),
			"value":               "0",
			"requiredRole":        meta.RequiredRole,
			"runbookRef":          meta.RunbookRef,
			"expectedEvents":      meta.ExpectedEvents,
			"validationChecklist": meta.Checklist,
			"productionApproval":  "Required for mainnet; internal drill only on Base Sepolia.",
			"environment":         reg.Environment,
		})
	})
}

func decodePrepareArgs(fn string, raw []json.RawMessage) ([]any, error) {
	switch fn {
	case "pauseProgram":
		if len(raw) != 1 {
			return nil, fmt.Errorf("pauseProgram expects 1 bool arg")
		}
		var paused bool
		if err := json.Unmarshal(raw[0], &paused); err != nil {
			return nil, fmt.Errorf("pauseProgram arg: %w", err)
		}
		return []any{paused}, nil
	case "upsertTemplate":
		if len(raw) != 1 {
			return nil, fmt.Errorf("upsertTemplate expects 1 object arg (UpsertTemplateParams)")
		}
		p, err := ethops.UnmarshalUpsertTemplateParamsJSON(raw[0])
		if err != nil {
			return nil, fmt.Errorf("upsertTemplate params: %w", err)
		}
		return []any{p}, nil
	case "initializeMarket", "genesisStartRolling", "genesisLockRolling", "executeRollingRound":
		if len(raw) != 1 {
			return nil, fmt.Errorf("%s expects 1 templateId (bytes32 hex string)", fn)
		}
		tid, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, err
		}
		return []any{tid}, nil
	case "haltRollingMarket", "yieldEmergencyWithdraw", "finalizeRecoveredYield":
		if len(raw) != 1 {
			return nil, fmt.Errorf("%s expects 1 templateId (bytes32 hex string)", fn)
		}
		tid, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, err
		}
		return []any{tid}, nil
	case "resetYieldRouterFailures":
		if len(raw) != 0 {
			return nil, fmt.Errorf("resetYieldRouterFailures expects no args")
		}
		return []any{}, nil
	case "resetRollingLifecycle":
		if len(raw) != 2 {
			return nil, fmt.Errorf("resetRollingLifecycle expects 2 args: templateId, nextRollingEpochId")
		}
		tid, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("templateId: %w", err)
		}
		nextID, err := decodeUint64Arg(raw[1], "nextRollingEpochId")
		if err != nil {
			return nil, err
		}
		return []any{tid, nextID}, nil
	case "cancelEpoch", "cancelRollingEpochWhileHalted":
		if len(raw) != 4 {
			return nil, fmt.Errorf("%s expects 4 args: templateId, epochId, reason(uint8), voided(bool)", fn)
		}
		tid, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("templateId: %w", err)
		}
		epochID, err := decodeUint64Arg(raw[1], "epochId")
		if err != nil {
			return nil, err
		}
		reason, err := decodeUint8Arg(raw[2], "reason")
		if err != nil {
			return nil, err
		}
		voided, err := decodeBoolArg(raw[3], "voided")
		if err != nil {
			return nil, err
		}
		return []any{tid, epochID, reason, voided}, nil
	case "reconcileEpochRoutedPrincipal", "recoverRoutedSettledClaims":
		if len(raw) != 3 {
			return nil, fmt.Errorf("%s expects 3 args: templateId, epochId, amount", fn)
		}
		tid, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("templateId: %w", err)
		}
		epochID, err := decodeUint64Arg(raw[1], "epochId")
		if err != nil {
			return nil, err
		}
		amount, err := decodeBigIntArg(raw[2], "amount")
		if err != nil {
			return nil, err
		}
		return []any{tid, epochID, amount}, nil
	case "reassignRecoveredBalance":
		if len(raw) != 3 {
			return nil, fmt.Errorf("reassignRecoveredBalance expects 3 args: fromTemplateId, toTemplateId, amount")
		}
		from, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("fromTemplateId: %w", err)
		}
		to, err := decodeTemplateIDArg(raw[1])
		if err != nil {
			return nil, fmt.Errorf("toTemplateId: %w", err)
		}
		amount, err := decodeBigIntArg(raw[2], "amount")
		if err != nil {
			return nil, err
		}
		return []any{from, to, amount}, nil
	case "withdrawFees":
		if len(raw) != 2 {
			return nil, fmt.Errorf("withdrawFees expects 2 args: templateId, amount")
		}
		tid, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("templateId: %w", err)
		}
		amount, err := decodeBigIntArg(raw[1], "amount")
		if err != nil {
			return nil, err
		}
		return []any{tid, amount}, nil
	case "executeRollingRoundBatch":
		if len(raw) != 1 {
			return nil, fmt.Errorf("executeRollingRoundBatch expects 1 arg: templateIds (bytes32[] hex strings)")
		}
		ids, err := decodeTemplateIDListArg(raw[0])
		if err != nil {
			return nil, err
		}
		return []any{ids}, nil
	case "openEpochsBatch":
		if len(raw) != 5 {
			return nil, fmt.Errorf("openEpochsBatch expects 5 parallel arrays: templateIds, epochIds, openAt, lockAt, resolveAt")
		}
		tids, err := decodeTemplateIDListArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("templateIds: %w", err)
		}
		eids, err := decodeUint64ListArg(raw[1], "epochIds")
		if err != nil {
			return nil, err
		}
		openAt, err := decodeUint64ListArg(raw[2], "openAt")
		if err != nil {
			return nil, err
		}
		lockAt, err := decodeUint64ListArg(raw[3], "lockAt")
		if err != nil {
			return nil, err
		}
		resolveAt, err := decodeUint64ListArg(raw[4], "resolveAt")
		if err != nil {
			return nil, err
		}
		n := len(tids)
		if len(eids) != n || len(openAt) != n || len(lockAt) != n || len(resolveAt) != n {
			return nil, fmt.Errorf("openEpochsBatch: all arrays must have the same length (%d)", n)
		}
		return []any{tids, eids, openAt, lockAt, resolveAt}, nil
	case "lockEpochsBatch", "resolveEpochsBatch":
		if len(raw) != 2 {
			return nil, fmt.Errorf("%s expects 2 args: templateIds[], epochIds[]", fn)
		}
		tids, err := decodeTemplateIDListArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("templateIds: %w", err)
		}
		eids, err := decodeUint64ListArg(raw[1], "epochIds")
		if err != nil {
			return nil, err
		}
		if len(tids) != len(eids) {
			return nil, fmt.Errorf("%s: templateIds and epochIds length mismatch", fn)
		}
		return []any{tids, eids}, nil
	case "openEpoch":
		if len(raw) != 5 {
			return nil, fmt.Errorf("openEpoch expects 5 args: templateId, epochId, openAt, lockAt, resolveAt")
		}
		tid, err := decodeTemplateIDArg(raw[0])
		if err != nil {
			return nil, fmt.Errorf("templateId: %w", err)
		}
		epochID, err := decodeUint64Arg(raw[1], "epochId")
		if err != nil {
			return nil, err
		}
		openAt, err := decodeUint64Arg(raw[2], "openAt")
		if err != nil {
			return nil, err
		}
		lockAt, err := decodeUint64Arg(raw[3], "lockAt")
		if err != nil {
			return nil, err
		}
		resolveAt, err := decodeUint64Arg(raw[4], "resolveAt")
		if err != nil {
			return nil, err
		}
		return []any{tid, epochID, openAt, lockAt, resolveAt}, nil
	default:
		return nil, fmt.Errorf("unsupported function")
	}
}

func decodeBoolArg(raw json.RawMessage, field string) (bool, error) {
	var b bool
	if err := json.Unmarshal(raw, &b); err == nil {
		return b, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return false, fmt.Errorf("%s: %w", field, err)
	}
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "1", "true", "yes", "y":
		return true, nil
	case "0", "false", "no", "n":
		return false, nil
	default:
		return false, fmt.Errorf("%s: expected bool", field)
	}
}

func decodeUint8Arg(raw json.RawMessage, field string) (uint8, error) {
	u, err := decodeUint64Arg(raw, field)
	if err != nil {
		return 0, err
	}
	if u > 255 {
		return 0, fmt.Errorf("%s overflows uint8", field)
	}
	return uint8(u), nil
}

func decodeBigIntArg(raw json.RawMessage, field string) (*big.Int, error) {
	s := strings.TrimSpace(string(raw))
	if s == "" || s == "null" {
		return nil, fmt.Errorf("%s empty", field)
	}
	if strings.HasPrefix(s, `"`) {
		if err := json.Unmarshal(raw, &s); err != nil {
			return nil, fmt.Errorf("%s: %w", field, err)
		}
		s = strings.TrimSpace(s)
	}
	n := new(big.Int)
	base := 10
	if strings.HasPrefix(s, "0x") || strings.HasPrefix(s, "0X") {
		base = 16
		s = s[2:]
	}
	if _, ok := n.SetString(s, base); !ok || n.Sign() < 0 {
		return nil, fmt.Errorf("%s: expected unsigned integer", field)
	}
	return n, nil
}

func decodeTemplateIDListArg(raw json.RawMessage) ([]common.Hash, error) {
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return nil, fmt.Errorf("expected JSON array: %w", err)
	}
	out := make([]common.Hash, 0, len(elems))
	for i, e := range elems {
		h, err := decodeTemplateIDArg(e)
		if err != nil {
			return nil, fmt.Errorf("index %d: %w", i, err)
		}
		out = append(out, h)
	}
	return out, nil
}

func decodeUint64ListArg(raw json.RawMessage, field string) ([]uint64, error) {
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return nil, fmt.Errorf("%s: expected JSON array: %w", field, err)
	}
	out := make([]uint64, 0, len(elems))
	for i, e := range elems {
		u, err := decodeUint64Arg(e, fmt.Sprintf("%s[%d]", field, i))
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}

func decodeTemplateIDArg(raw json.RawMessage) (common.Hash, error) {
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return common.Hash{}, fmt.Errorf("templateId: %w", err)
	}
	s = strings.TrimSpace(s)
	if s == "" {
		return common.Hash{}, fmt.Errorf("templateId empty")
	}
	if !strings.HasPrefix(s, "0x") && !strings.HasPrefix(s, "0X") {
		s = "0x" + s
	}
	if len(s) != 2+64 {
		return common.Hash{}, fmt.Errorf("templateId must be 32-byte hex")
	}
	return common.HexToHash(s), nil
}

func decodeUint64Arg(raw json.RawMessage, field string) (uint64, error) {
	s := strings.TrimSpace(string(raw))
	if s == "" || s == "null" {
		return 0, fmt.Errorf("%s empty", field)
	}
	raw = json.RawMessage(s)
	if len(raw) == 0 {
		return 0, fmt.Errorf("%s empty", field)
	}
	if raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return 0, fmt.Errorf("%s: %w", field, err)
		}
		s = strings.TrimSpace(s)
		return strconv.ParseUint(s, 0, 64)
	}
	var u uint64
	if err := json.Unmarshal(raw, &u); err == nil {
		return u, nil
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err != nil {
		return 0, fmt.Errorf("%s: %w", field, err)
	}
	return strconv.ParseUint(n.String(), 10, 64)
}
