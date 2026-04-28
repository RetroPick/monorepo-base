package ethops

import (
	"encoding/json"
	"fmt"
	"math/big"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
)

// UpsertTemplateParams matches IMarketEngine.UpsertTemplateParams for abi.Pack("upsertTemplate", ...).
type UpsertTemplateParams struct {
	Slug                         string         `abi:"slug"`
	AssetSymbol                  string         `abi:"assetSymbol"`
	OracleFeedId                 common.Hash    `abi:"oracleFeedId"`
	MarketType                   uint8          `abi:"marketType"`
	Condition                    uint8          `abi:"condition"`
	ThresholdRule                uint8          `abi:"thresholdRule"`
	Active                       bool           `abi:"active"`
	OutcomeCount                 uint8          `abi:"outcomeCount"`
	AbsoluteThresholdValueE8     *big.Int       `abi:"absoluteThresholdValueE8"`
	RangeBoundsE8                [7]*big.Int    `abi:"rangeBoundsE8"`
	SwitchFeeBps                 uint16         `abi:"switchFeeBps"`
	SettlementFeeBps             uint16         `abi:"settlementFeeBps"`
	AllowMultiSidePositions      bool           `abi:"allowMultiSidePositions"`
	ExecutionMode                uint8          `abi:"executionMode"`
	RollingIntervalSeconds       uint64         `abi:"rollingIntervalSeconds"`
	RollingBufferSeconds         uint64         `abi:"rollingBufferSeconds"`
	OracleMaxDelaySeconds        uint64         `abi:"oracleMaxDelaySeconds"`
	OracleMaxConfidenceBps       uint16         `abi:"oracleMaxConfidenceBps"`
	TemplateOracleKind           uint8          `abi:"templateOracleKind"`
	OracleClass                  uint8          `abi:"oracleClass"`
	EventOracle                  common.Address `abi:"eventOracle"`
	CascadeDownward              bool           `abi:"cascadeDownward"`
	AnchorPriceE8                *big.Int       `abi:"anchorPriceE8"`
	VelocityBoundsE4             [7]uint32      `abi:"velocityBoundsE4"`
	LadderBoundsE8               [7]*big.Int    `abi:"ladderBoundsE8"`
	LadderPayoutWeightsBps       [8]uint16     `abi:"ladderPayoutWeightsBps"`
	OracleFeedIdB                common.Hash    `abi:"oracleFeedIdB"`
	SpreadToleranceBps           uint16         `abi:"spreadToleranceBps"`
	CompositeFeedIds             [4]common.Hash `abi:"compositeFeedIds"`
	CompositeConditions          [4]uint8      `abi:"compositeConditions"`
	CompositeFeedCount           uint8          `abi:"compositeFeedCount"`
	CompositeLogic               uint8          `abi:"compositeLogic"`
	CompositeAbsoluteThresholdsE8 [4]*big.Int   `abi:"compositeAbsoluteThresholdsE8"`
}

// UnmarshalUpsertTemplateParamsJSON decodes JSON (one object) into UpsertTemplateParams.
// int256 fields accept JSON numbers or decimal strings. bytes32 fields accept 0x-prefixed hex.
func UnmarshalUpsertTemplateParamsJSON(raw []byte) (UpsertTemplateParams, error) {
	var aux map[string]json.RawMessage
	if err := json.Unmarshal(raw, &aux); err != nil {
		return UpsertTemplateParams{}, err
	}
	get := func(key string) (json.RawMessage, bool) {
		v, ok := aux[key]
		return v, ok && len(v) > 0 && string(v) != "null"
	}

	out := UpsertTemplateParams{
		AbsoluteThresholdValueE8: big.NewInt(0),
		AnchorPriceE8:          big.NewInt(0),
	}
	for i := range out.RangeBoundsE8 {
		out.RangeBoundsE8[i] = big.NewInt(0)
	}
	for i := range out.LadderBoundsE8 {
		out.LadderBoundsE8[i] = big.NewInt(0)
	}
	for i := range out.CompositeAbsoluteThresholdsE8 {
		out.CompositeAbsoluteThresholdsE8[i] = big.NewInt(0)
	}

	if v, ok := get("slug"); ok {
		if err := json.Unmarshal(v, &out.Slug); err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("slug: %w", err)
		}
	}
	if v, ok := get("assetSymbol"); ok {
		if err := json.Unmarshal(v, &out.AssetSymbol); err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("assetSymbol: %w", err)
		}
	}
	if v, ok := get("oracleFeedId"); ok {
		h, err := parseBytes32JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("oracleFeedId: %w", err)
		}
		out.OracleFeedId = h
	}
	if v, ok := get("marketType"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("marketType: %w", err)
		}
		out.MarketType = u
	}
	if v, ok := get("condition"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("condition: %w", err)
		}
		out.Condition = u
	}
	if v, ok := get("thresholdRule"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("thresholdRule: %w", err)
		}
		out.ThresholdRule = u
	}
	if v, ok := get("active"); ok {
		if err := json.Unmarshal(v, &out.Active); err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("active: %w", err)
		}
	}
	if v, ok := get("outcomeCount"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("outcomeCount: %w", err)
		}
		out.OutcomeCount = u
	}
	if v, ok := get("absoluteThresholdValueE8"); ok {
		bi, err := parseInt256JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("absoluteThresholdValueE8: %w", err)
		}
		out.AbsoluteThresholdValueE8 = bi
	}
	if v, ok := get("rangeBoundsE8"); ok {
		arr, err := parseInt256Array7(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("rangeBoundsE8: %w", err)
		}
		out.RangeBoundsE8 = arr
	}
	if v, ok := get("switchFeeBps"); ok {
		u, err := parseUint16JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("switchFeeBps: %w", err)
		}
		out.SwitchFeeBps = u
	}
	if v, ok := get("settlementFeeBps"); ok {
		u, err := parseUint16JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("settlementFeeBps: %w", err)
		}
		out.SettlementFeeBps = u
	}
	if v, ok := get("allowMultiSidePositions"); ok {
		if err := json.Unmarshal(v, &out.AllowMultiSidePositions); err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("allowMultiSidePositions: %w", err)
		}
	}
	if v, ok := get("executionMode"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("executionMode: %w", err)
		}
		out.ExecutionMode = u
	}
	if v, ok := get("rollingIntervalSeconds"); ok {
		u, err := parseUint64JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("rollingIntervalSeconds: %w", err)
		}
		out.RollingIntervalSeconds = u
	}
	if v, ok := get("rollingBufferSeconds"); ok {
		u, err := parseUint64JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("rollingBufferSeconds: %w", err)
		}
		out.RollingBufferSeconds = u
	}
	if v, ok := get("oracleMaxDelaySeconds"); ok {
		u, err := parseUint64JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("oracleMaxDelaySeconds: %w", err)
		}
		out.OracleMaxDelaySeconds = u
	}
	if v, ok := get("oracleMaxConfidenceBps"); ok {
		u, err := parseUint16JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("oracleMaxConfidenceBps: %w", err)
		}
		out.OracleMaxConfidenceBps = u
	}
	if v, ok := get("templateOracleKind"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("templateOracleKind: %w", err)
		}
		out.TemplateOracleKind = u
	}
	if v, ok := get("oracleClass"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("oracleClass: %w", err)
		}
		out.OracleClass = u
	}
	if v, ok := get("eventOracle"); ok {
		if err := json.Unmarshal(v, &out.EventOracle); err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("eventOracle: %w", err)
		}
	}
	if v, ok := get("cascadeDownward"); ok {
		if err := json.Unmarshal(v, &out.CascadeDownward); err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("cascadeDownward: %w", err)
		}
	}
	if v, ok := get("anchorPriceE8"); ok {
		bi, err := parseInt256JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("anchorPriceE8: %w", err)
		}
		out.AnchorPriceE8 = bi
	}
	if v, ok := get("velocityBoundsE4"); ok {
		arr, err := parseUint32Array7(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("velocityBoundsE4: %w", err)
		}
		out.VelocityBoundsE4 = arr
	}
	if v, ok := get("ladderBoundsE8"); ok {
		arr, err := parseInt256Array7(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("ladderBoundsE8: %w", err)
		}
		out.LadderBoundsE8 = arr
	}
	if v, ok := get("ladderPayoutWeightsBps"); ok {
		arr, err := parseUint16Array8(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("ladderPayoutWeightsBps: %w", err)
		}
		out.LadderPayoutWeightsBps = arr
	}
	if v, ok := get("oracleFeedIdB"); ok {
		h, err := parseBytes32JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("oracleFeedIdB: %w", err)
		}
		out.OracleFeedIdB = h
	}
	if v, ok := get("spreadToleranceBps"); ok {
		u, err := parseUint16JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("spreadToleranceBps: %w", err)
		}
		out.SpreadToleranceBps = u
	}
	if v, ok := get("compositeFeedIds"); ok {
		arr, err := parseBytes32Array4(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("compositeFeedIds: %w", err)
		}
		out.CompositeFeedIds = arr
	}
	if v, ok := get("compositeConditions"); ok {
		arr, err := parseUint8Array4(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("compositeConditions: %w", err)
		}
		out.CompositeConditions = arr
	}
	if v, ok := get("compositeFeedCount"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("compositeFeedCount: %w", err)
		}
		out.CompositeFeedCount = u
	}
	if v, ok := get("compositeLogic"); ok {
		u, err := parseUint8JSON(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("compositeLogic: %w", err)
		}
		out.CompositeLogic = u
	}
	if v, ok := get("compositeAbsoluteThresholdsE8"); ok {
		arr, err := parseInt256Array4(v)
		if err != nil {
			return UpsertTemplateParams{}, fmt.Errorf("compositeAbsoluteThresholdsE8: %w", err)
		}
		out.CompositeAbsoluteThresholdsE8 = arr
	}

	return out, nil
}

func parseInt256JSON(raw json.RawMessage) (*big.Int, error) {
	raw = bytesTrimSpace(raw)
	if len(raw) == 0 || string(raw) == "null" {
		return big.NewInt(0), nil
	}
	if raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return nil, err
		}
		s = strings.TrimSpace(s)
		if s == "" {
			return big.NewInt(0), nil
		}
		base := 10
		if strings.HasPrefix(s, "0x") || strings.HasPrefix(s, "0X") {
			base = 16
			s = s[2:]
		}
		bi, ok := new(big.Int).SetString(s, base)
		if !ok {
			return nil, fmt.Errorf("invalid int256 string")
		}
		return bi, nil
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err != nil {
		return nil, err
	}
	s := n.String()
	bi, ok := new(big.Int).SetString(s, 10)
	if !ok {
		return nil, fmt.Errorf("invalid int256 number")
	}
	return bi, nil
}

func parseUint8JSON(raw json.RawMessage) (uint8, error) {
	raw = bytesTrimSpace(raw)
	if len(raw) == 0 {
		return 0, fmt.Errorf("empty uint8")
	}
	if raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return 0, err
		}
		u64, err := strconv.ParseUint(strings.TrimSpace(s), 10, 8)
		return uint8(u64), err
	}
	var u uint8
	if err := json.Unmarshal(raw, &u); err == nil {
		return u, nil
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err != nil {
		return 0, err
	}
	u64, err := n.Int64()
	if err != nil {
		return 0, err
	}
	if u64 < 0 || u64 > 255 {
		return 0, fmt.Errorf("uint8 out of range")
	}
	return uint8(u64), nil
}

func parseUint16JSON(raw json.RawMessage) (uint16, error) {
	raw = bytesTrimSpace(raw)
	if len(raw) == 0 {
		return 0, fmt.Errorf("empty uint16")
	}
	if raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return 0, err
		}
		u64, err := strconv.ParseUint(strings.TrimSpace(s), 10, 16)
		return uint16(u64), err
	}
	var u uint16
	if err := json.Unmarshal(raw, &u); err == nil {
		return u, nil
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err != nil {
		return 0, err
	}
	u64, err := n.Int64()
	if err != nil {
		return 0, err
	}
	if u64 < 0 || u64 > 65535 {
		return 0, fmt.Errorf("uint16 out of range")
	}
	return uint16(u64), nil
}

func parseUint64JSON(raw json.RawMessage) (uint64, error) {
	raw = bytesTrimSpace(raw)
	if len(raw) > 0 && raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return 0, err
		}
		return strconv.ParseUint(strings.TrimSpace(s), 10, 64)
	}
	var u uint64
	if err := json.Unmarshal(raw, &u); err == nil {
		return u, nil
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err != nil {
		return 0, err
	}
	return strconv.ParseUint(n.String(), 10, 64)
}

func parseBytes32JSON(raw json.RawMessage) (common.Hash, error) {
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

func parseInt256Array7(raw json.RawMessage) ([7]*big.Int, error) {
	var out [7]*big.Int
	for i := range out {
		out[i] = big.NewInt(0)
	}
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return out, err
	}
	if len(elems) > 7 {
		return out, fmt.Errorf("expected at most 7 elements")
	}
	for i, e := range elems {
		bi, err := parseInt256JSON(e)
		if err != nil {
			return out, err
		}
		out[i] = bi
	}
	return out, nil
}

func parseInt256Array4(raw json.RawMessage) ([4]*big.Int, error) {
	var out [4]*big.Int
	for i := range out {
		out[i] = big.NewInt(0)
	}
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return out, err
	}
	if len(elems) > 4 {
		return out, fmt.Errorf("expected at most 4 elements")
	}
	for i, e := range elems {
		bi, err := parseInt256JSON(e)
		if err != nil {
			return out, err
		}
		out[i] = bi
	}
	return out, nil
}

func parseUint32Array7(raw json.RawMessage) ([7]uint32, error) {
	var out [7]uint32
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return out, err
	}
	if len(elems) > 7 {
		return out, fmt.Errorf("expected at most 7 elements")
	}
	for i, e := range elems {
		u, err := parseUint32Elem(e)
		if err != nil {
			return out, err
		}
		out[i] = u
	}
	return out, nil
}

func parseUint32Elem(raw json.RawMessage) (uint32, error) {
	raw = bytesTrimSpace(raw)
	if len(raw) > 0 && raw[0] == '"' {
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return 0, err
		}
		u64, err := strconv.ParseUint(strings.TrimSpace(s), 10, 32)
		return uint32(u64), err
	}
	var u uint32
	if err := json.Unmarshal(raw, &u); err == nil {
		return u, nil
	}
	var n json.Number
	if err := json.Unmarshal(raw, &n); err != nil {
		return 0, err
	}
	v, err := n.Int64()
	if err != nil {
		return 0, err
	}
	if v < 0 || v > 0xffffffff {
		return 0, fmt.Errorf("uint32 out of range")
	}
	return uint32(v), nil
}

func parseUint16Array8(raw json.RawMessage) ([8]uint16, error) {
	var out [8]uint16
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return out, err
	}
	if len(elems) > 8 {
		return out, fmt.Errorf("expected at most 8 elements")
	}
	for i, e := range elems {
		u, err := parseUint16JSON(e)
		if err != nil {
			return out, err
		}
		out[i] = u
	}
	return out, nil
}

func parseBytes32Array4(raw json.RawMessage) ([4]common.Hash, error) {
	var out [4]common.Hash
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return out, err
	}
	if len(elems) > 4 {
		return out, fmt.Errorf("expected at most 4 elements")
	}
	for i, e := range elems {
		h, err := parseBytes32JSON(e)
		if err != nil {
			return out, err
		}
		out[i] = h
	}
	return out, nil
}

func parseUint8Array4(raw json.RawMessage) ([4]uint8, error) {
	var out [4]uint8
	var elems []json.RawMessage
	if err := json.Unmarshal(raw, &elems); err != nil {
		return out, err
	}
	if len(elems) > 4 {
		return out, fmt.Errorf("expected at most 4 elements")
	}
	for i, e := range elems {
		u, err := parseUint8JSON(e)
		if err != nil {
			return out, err
		}
		out[i] = u
	}
	return out, nil
}

func bytesTrimSpace(b json.RawMessage) json.RawMessage {
	return json.RawMessage(strings.TrimSpace(string(b)))
}
