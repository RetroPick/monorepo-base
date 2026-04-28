package ethops

import (
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestPrepareTx_ExecuteRollingRoundBatch(t *testing.T) {
	c, err := NewCaller("")
	if err != nil {
		t.Fatal(err)
	}
	h := common.HexToHash("0x" + strings.Repeat("ab", 32))
	_, err = c.PrepareTx(84532, common.Address{}, "executeRollingRoundBatch", []any{[]common.Hash{h}}, nil)
	if err != nil {
		t.Fatal(err)
	}
}

func TestPrepareTx_OpenEpochsBatch(t *testing.T) {
	c, err := NewCaller("")
	if err != nil {
		t.Fatal(err)
	}
	tid := common.HexToHash("0x" + strings.Repeat("cd", 32))
	_, err = c.PrepareTx(84532, common.Address{}, "openEpochsBatch", []any{
		[]common.Hash{tid},
		[]uint64{1},
		[]uint64{10},
		[]uint64{20},
		[]uint64{30},
	}, nil)
	if err != nil {
		t.Fatal(err)
	}
}
