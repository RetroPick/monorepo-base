package api

import (
	"encoding/json"
	"testing"
)

func TestDecodePrepareArgs_RollingAndBatch(t *testing.T) {
	tid := json.RawMessage(`"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`)

	args, err := decodePrepareArgs("genesisLockRolling", []json.RawMessage{tid})
	if err != nil {
		t.Fatal(err)
	}
	if len(args) != 1 {
		t.Fatalf("len %d", len(args))
	}

	batch, err := decodePrepareArgs("executeRollingRoundBatch", []json.RawMessage{json.RawMessage(`[
		"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	]`)})
	if err != nil {
		t.Fatal(err)
	}
	if len(batch) != 1 {
		t.Fatalf("batch len")
	}

	open, err := decodePrepareArgs("openEpochsBatch", []json.RawMessage{
		json.RawMessage(`["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`),
		json.RawMessage(`["1"]`),
		json.RawMessage(`["100"]`),
		json.RawMessage(`["200"]`),
		json.RawMessage(`["300"]`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(open) != 5 {
		t.Fatalf("openEpochsBatch: got %d args", len(open))
	}

	feed, err := decodePrepareArgs("setFeedDecimals", []json.RawMessage{
		json.RawMessage(`"0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298"`),
		json.RawMessage(`8`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(feed) != 2 {
		t.Fatalf("setFeedDecimals: got %d args", len(feed))
	}
}

func TestDecodePrepareArgs_Emergency(t *testing.T) {
	tid := json.RawMessage(`"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`)
	tid2 := json.RawMessage(`"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"`)

	cases := []struct {
		name string
		fn   string
		raw  []json.RawMessage
		want int
	}{
		{"halt", "haltRollingMarket", []json.RawMessage{tid}, 1},
		{"reset lifecycle", "resetRollingLifecycle", []json.RawMessage{tid, json.RawMessage(`"2"`)}, 2},
		{"cancel", "cancelEpoch", []json.RawMessage{tid, json.RawMessage(`"1"`), json.RawMessage(`6`), json.RawMessage(`false`)}, 4},
		{"cancel rolling", "cancelRollingEpochWhileHalted", []json.RawMessage{tid, json.RawMessage(`1`), json.RawMessage(`5`), json.RawMessage(`"true"`)}, 4},
		{"yield withdraw", "yieldEmergencyWithdraw", []json.RawMessage{tid}, 1},
		{"reconcile", "reconcileEpochRoutedPrincipal", []json.RawMessage{tid, json.RawMessage(`"1"`), json.RawMessage(`"1000000000000000000000"`)}, 3},
		{"recover claims", "recoverRoutedSettledClaims", []json.RawMessage{tid, json.RawMessage(`"1"`), json.RawMessage(`"0x10"`)}, 3},
		{"reassign", "reassignRecoveredBalance", []json.RawMessage{tid, tid2, json.RawMessage(`"7"`)}, 3},
		{"finalize", "finalizeRecoveredYield", []json.RawMessage{tid}, 1},
		{"reset router", "resetYieldRouterFailures", nil, 0},
		{"withdraw fees", "withdrawFees", []json.RawMessage{tid, json.RawMessage(`"25"`)}, 2},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			args, err := decodePrepareArgs(tc.fn, tc.raw)
			if err != nil {
				t.Fatal(err)
			}
			if len(args) != tc.want {
				t.Fatalf("got %d args, want %d", len(args), tc.want)
			}
		})
	}
}
