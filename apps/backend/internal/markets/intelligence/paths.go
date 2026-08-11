package intelligence

import (
	"os"
	"path/filepath"
	"runtime"
)

// RepoWhaleFeedVectorsPath resolves the harness golden vectors file from this package.
func RepoWhaleFeedVectorsPath() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return ""
	}
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", "..", "..", ".."))
	return filepath.Join(root, ".dev", "markets-v1", "intelligence", "testdata", "whale_feed_vectors.yaml")
}

// ResolveWhaleFeedVectorsPath returns the vectors path when present in the workspace.
func ResolveWhaleFeedVectorsPath() string {
	path := RepoWhaleFeedVectorsPath()
	if path == "" {
		return ""
	}
	if _, err := os.Stat(path); err != nil {
		return ""
	}
	return path
}
