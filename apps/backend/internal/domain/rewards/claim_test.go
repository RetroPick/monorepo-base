package rewards

import (
	"testing"
)

func TestTrim0x(t *testing.T) {
	if trim0x("0xabc") != "abc" {
		t.Fatal("expected trim")
	}
	if trim0x("ABC") != "ABC" {
		t.Fatal("expected unchanged")
	}
}
