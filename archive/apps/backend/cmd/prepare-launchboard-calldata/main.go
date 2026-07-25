package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/big"
	"os"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"

	"retropick/apps/backend/internal/ethops"
	"retropick/apps/backend/internal/launchboard"
)

type txOutput struct {
	Target   string `json:"target"`
	ChainID  int64  `json:"chainId"`
	ABI      string `json:"abi"`
	Function string `json:"function"`
	Calldata string `json:"calldata"`
	Value    string `json:"value"`
}

func main() {
	var (
		function = flag.String("function", "", "contract function name")
		argsFile = flag.String("args-file", "", "json array of arguments")
		catalog  = flag.String("catalog", "", "optional launch catalog path")
	)
	flag.Parse()

	if strings.TrimSpace(*function) == "" {
		fatalf("missing --function")
	}
	if strings.TrimSpace(*argsFile) == "" {
		fatalf("missing --args-file")
	}

	var cat *launchboard.Catalog
	var err error
	if strings.TrimSpace(*catalog) == "" {
		cat, err = launchboard.Default()
	} else {
		cat, err = launchboard.LoadFile(*catalog)
	}
	if err != nil {
		fatalf("load catalog: %v", err)
	}

	rawArgs, err := os.ReadFile(*argsFile)
	if err != nil {
		fatalf("read args: %v", err)
	}

	var encoded []any
	abiName := "IMarketEngine"
	target := common.HexToAddress(cat.Contracts.MarketEngineProxy)
	switch *function {
	case "setFeedDecimals":
		abiName = "ChainlinkAdapter"
		target = common.HexToAddress(cat.Contracts.ChainlinkAdapter)
		encoded, err = decodeSetFeedDecimals(rawArgs)
	case "upsertTemplate":
		encoded, err = decodeUpsertTemplate(rawArgs)
	case "initializeMarket", "genesisStartRolling", "genesisLockRolling", "executeRollingRound", "haltRollingMarket", "yieldEmergencyWithdraw", "finalizeRecoveredYield":
		encoded, err = decodeTemplateIDArgs(rawArgs)
	case "openEpoch":
		encoded, err = decodeOpenEpochArgs(rawArgs)
	default:
		fatalf("unsupported function %q", *function)
	}
	if err != nil {
		fatalf("decode args: %v", err)
	}

	caller, err := ethops.NewCaller("")
	if err != nil {
		fatalf("build abi packer: %v", err)
	}
	defer caller.Close()

	calldata, err := caller.PrepareTx(cat.ChainID, target, *function, encoded, big.NewInt(0))
	if err != nil {
		fatalf("pack calldata: %v", err)
	}

	out := txOutput{
		Target:   target.Hex(),
		ChainID:  cat.ChainID,
		ABI:      abiName,
		Function: *function,
		Calldata: "0x" + common.Bytes2Hex(calldata),
		Value:    "0",
	}
	if err := json.NewEncoder(os.Stdout).Encode(out); err != nil {
		fatalf("encode output: %v", err)
	}
}

func decodeSetFeedDecimals(raw []byte) ([]any, error) {
	var args []json.RawMessage
	if err := json.Unmarshal(raw, &args); err != nil {
		return nil, err
	}
	if len(args) != 2 {
		return nil, fmt.Errorf("setFeedDecimals expects 2 args")
	}
	feedID, err := decodeBytes32(args[0])
	if err != nil {
		return nil, err
	}
	decimals, err := decodeUint8(args[1])
	if err != nil {
		return nil, err
	}
	return []any{feedID, decimals}, nil
}

func decodeUpsertTemplate(raw []byte) ([]any, error) {
	var args []json.RawMessage
	if err := json.Unmarshal(raw, &args); err != nil {
		return nil, err
	}
	if len(args) != 1 {
		return nil, fmt.Errorf("upsertTemplate expects 1 arg")
	}
	p, err := ethops.UnmarshalUpsertTemplateParamsJSON(args[0])
	if err != nil {
		return nil, err
	}
	return []any{p}, nil
}

func decodeTemplateIDArgs(raw []byte) ([]any, error) {
	var args []json.RawMessage
	if err := json.Unmarshal(raw, &args); err != nil {
		return nil, err
	}
	if len(args) != 1 {
		return nil, fmt.Errorf("template-id function expects 1 arg")
	}
	tid, err := decodeBytes32(args[0])
	if err != nil {
		return nil, err
	}
	return []any{tid}, nil
}

func decodeOpenEpochArgs(raw []byte) ([]any, error) {
	var args []json.RawMessage
	if err := json.Unmarshal(raw, &args); err != nil {
		return nil, err
	}
	if len(args) != 5 {
		return nil, fmt.Errorf("openEpoch expects 5 args")
	}
	tid, err := decodeBytes32(args[0])
	if err != nil {
		return nil, err
	}
	epochID, err := decodeUint64(args[1])
	if err != nil {
		return nil, err
	}
	openAt, err := decodeUint64(args[2])
	if err != nil {
		return nil, err
	}
	lockAt, err := decodeUint64(args[3])
	if err != nil {
		return nil, err
	}
	resolveAt, err := decodeUint64(args[4])
	if err != nil {
		return nil, err
	}
	return []any{tid, epochID, openAt, lockAt, resolveAt}, nil
}

func decodeBytes32(raw json.RawMessage) (common.Hash, error) {
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return common.Hash{}, err
	}
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "0x") {
		s = "0x" + s
	}
	return common.HexToHash(s), nil
}

func decodeUint8(raw json.RawMessage) (uint8, error) {
	var u uint8
	if err := json.Unmarshal(raw, &u); err == nil {
		return u, nil
	}
	v, err := decodeUint64(raw)
	if err != nil {
		return 0, err
	}
	if v > 255 {
		return 0, fmt.Errorf("uint8 overflow")
	}
	return uint8(v), nil
}

func decodeUint64(raw json.RawMessage) (uint64, error) {
	var u uint64
	if err := json.Unmarshal(raw, &u); err == nil {
		return u, nil
	}
	var s string
	if err := json.Unmarshal(raw, &s); err != nil {
		return 0, err
	}
	s = strings.TrimSpace(s)
	return strconv.ParseUint(s, 10, 64)
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
