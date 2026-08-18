package indexer

import "testing"

func TestResolveSyncWindow_PrefersExplicitStartBlock(t *testing.T) {
	from, to, ok := resolveSyncWindow(0, 250_000, 10_000, Config{
		StartBlock:     120_000,
		LookbackBlocks: 50_000,
		FinalityDepth:  3,
	})
	if !ok {
		t.Fatal("expected sync window")
	}
	if from != 120_000 {
		t.Fatalf("from = %d, want 120000", from)
	}
	if to != 129_999 {
		t.Fatalf("to = %d, want 129999", to)
	}
}

func TestResolveSyncWindow_FallsBackToLookback(t *testing.T) {
	from, to, ok := resolveSyncWindow(0, 250_000, 10_000, Config{
		LookbackBlocks: 50_000,
		FinalityDepth:  3,
	})
	if !ok {
		t.Fatal("expected sync window")
	}
	if from != 199_997 {
		t.Fatalf("from = %d, want 199997", from)
	}
	if to != 209_996 {
		t.Fatalf("to = %d, want 209996", to)
	}
}

func TestResolveSyncWindow_UsesStoredProgressAfterBootstrap(t *testing.T) {
	from, to, ok := resolveSyncWindow(20, 200, 50, Config{FinalityDepth: 3})
	if !ok {
		t.Fatal("expected sync window")
	}
	if from != 21 {
		t.Fatalf("from = %d, want 21", from)
	}
	if to != 70 {
		t.Fatalf("to = %d, want 70", to)
	}
}
