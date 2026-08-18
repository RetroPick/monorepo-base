package readcache

import (
	"testing"
	"time"
)

func TestCacheEvictsOldestEntryAtCapacity(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	cache := New[string, int](2, time.Minute)
	cache.now = func() time.Time { return now }
	cache.Set("a", 1)
	now = now.Add(time.Second)
	cache.Set("b", 2)
	now = now.Add(time.Second)
	cache.Set("c", 3)

	if _, ok := cache.Get("a"); ok {
		t.Fatal("expected oldest entry evicted")
	}
	if got, ok := cache.Get("c"); !ok || got != 3 {
		t.Fatalf("c = %v,%v", got, ok)
	}
}

func TestCacheExpiresEntry(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	cache := New[string, int](2, time.Second)
	cache.now = func() time.Time { return now }
	cache.Set("a", 1)
	now = now.Add(2 * time.Second)

	if _, ok := cache.Get("a"); ok {
		t.Fatal("expected expired entry miss")
	}
	stats := cache.Stats()
	if stats.Hits != 0 || stats.Misses != 1 {
		t.Fatalf("stats = %#v", stats)
	}
}

func TestCacheClearInvalidatesEntries(t *testing.T) {
	cache := New[string, int](2, time.Minute)
	cache.Set("a", 1)
	cache.Clear()
	if _, ok := cache.Get("a"); ok {
		t.Fatal("expected clear to remove entry")
	}
	if cache.Stats().Invalidations != 1 {
		t.Fatalf("stats = %#v", cache.Stats())
	}
}
