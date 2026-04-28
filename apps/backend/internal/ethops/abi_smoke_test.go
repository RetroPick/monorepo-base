package ethops

import (
	"bytes"
	"encoding/hex"
	"math/big"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"

	"retropick/apps/backend/internal/abis"
)

func TestEmbeddedIMarketEngineABI_Parses(t *testing.T) {
	_, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		t.Fatal(err)
	}
}

func TestTokenFaucetConfig_UnpackTuple(t *testing.T) {
	faucetABI, err := abi.JSON(strings.NewReader(string(abis.TokenFaucetJSON)))
	if err != nil {
		t.Fatal(err)
	}
	rawHex := strings.Repeat("0", 63) + "1" + strings.Repeat("0", 61) + "3e8"
	raw, err := hex.DecodeString(rawHex)
	if err != nil {
		t.Fatal(err)
	}
	values, err := faucetABI.Unpack("config", raw)
	if err != nil {
		t.Fatal(err)
	}
	var out FaucetState
	applyFaucetConfig(&out, values)
	if out.CooldownSeconds == nil || *out.CooldownSeconds != 1 {
		t.Fatalf("cooldown got %#v", out.CooldownSeconds)
	}
	if out.MaxMintAmount != "1000" {
		t.Fatalf("maxMintAmount got %q", out.MaxMintAmount)
	}

	out = FaucetState{}
	applyFaucetConfig(&out, []interface{}{uint64(3600), big.NewInt(1000)})
	if out.CooldownSeconds == nil || *out.CooldownSeconds != 3600 || out.MaxMintAmount != "1000" {
		t.Fatalf("legacy tuple decode failed: %#v", out)
	}
}

func TestPauseProgram_Pack(t *testing.T) {
	marketABI, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		t.Fatal(err)
	}
	data, err := marketABI.Pack("pauseProgram", true)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) < 4 {
		t.Fatal(data)
	}
}

func TestUpsertTemplate_Pack(t *testing.T) {
	marketABI, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		t.Fatal(err)
	}
	raw := []byte(`{
		"slug": "smoke-template",
		"assetSymbol": "ETH",
		"oracleFeedId": "0x0000000000000000000000000000000000000000000000000000000000000001",
		"marketType": 0,
		"condition": 0,
		"thresholdRule": 0,
		"active": true,
		"outcomeCount": 2,
		"absoluteThresholdValueE8": "10000000000",
		"switchFeeBps": 100,
		"settlementFeeBps": 100,
		"allowMultiSidePositions": true,
		"executionMode": 0,
		"templateOracleKind": 0,
		"oracleClass": 0
	}`)
	p, err := UnmarshalUpsertTemplateParamsJSON(raw)
	if err != nil {
		t.Fatal(err)
	}
	data, err := marketABI.Pack("upsertTemplate", p)
	if err != nil {
		t.Fatal(err)
	}
	want := marketABI.Methods["upsertTemplate"].ID
	if !bytes.Equal(data[:4], want[:]) {
		t.Fatalf("selector got %x want %x", data[:4], want)
	}
}

func TestInitializeMarketAndOpenEpoch_Pack(t *testing.T) {
	marketABI, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		t.Fatal(err)
	}
	tid := common.HexToHash("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	data, err := marketABI.Pack("initializeMarket", tid)
	if err != nil {
		t.Fatal(err)
	}
	want := marketABI.Methods["initializeMarket"].ID
	if !bytes.Equal(data[:4], want[:]) {
		t.Fatalf("initializeMarket selector got %x want %x", data[:4], want)
	}

	data, err = marketABI.Pack("openEpoch", tid, uint64(1), uint64(10), uint64(20), uint64(30))
	if err != nil {
		t.Fatal(err)
	}
	want = marketABI.Methods["openEpoch"].ID
	if !bytes.Equal(data[:4], want[:]) {
		t.Fatalf("openEpoch selector got %x want %x", data[:4], want)
	}
}

func TestGenesisStartRolling_Pack(t *testing.T) {
	marketABI, err := abi.JSON(strings.NewReader(string(abis.IMarketEngineJSON)))
	if err != nil {
		t.Fatal(err)
	}
	tid := common.HexToHash("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")
	data, err := marketABI.Pack("genesisStartRolling", tid)
	if err != nil {
		t.Fatal(err)
	}
	want := marketABI.Methods["genesisStartRolling"].ID
	if !bytes.Equal(data[:4], want[:]) {
		t.Fatalf("genesisStartRolling selector got %x want %x", data[:4], want)
	}
}
