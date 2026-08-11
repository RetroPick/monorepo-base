package positions

import "context"

// ReorgNotifier marks position projections updating when chain reorgs occur.
type ReorgNotifier interface {
	// PendingReorgs returns user IDs that should show updating until reconcile completes.
	PendingReorgs(ctx context.Context) []string
}

// NopReorgNotifier is the default when chain indexer is unwired.
type NopReorgNotifier struct{}

func (NopReorgNotifier) PendingReorgs(context.Context) []string {
	return nil
}

// MemoryReorgNotifier tracks reorg-pending users for tests.
type MemoryReorgNotifier struct {
	users []string
}

// Notify marks a user as reorg-pending.
func (n *MemoryReorgNotifier) Notify(userID string) {
	n.users = append(n.users, userID)
}

// PendingReorgs returns users awaiting reconcile after reorg.
func (n *MemoryReorgNotifier) PendingReorgs(context.Context) []string {
	out := make([]string, len(n.users))
	copy(out, n.users)
	return out
}

// Clear removes all pending reorg flags.
func (n *MemoryReorgNotifier) Clear() {
	n.users = nil
}
