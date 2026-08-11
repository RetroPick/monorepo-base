package params_test

import (
	"testing"

	"retropick/apps/backend/internal/markets/intelligence/params"
)

func TestLoadWhaleScoreLaunchWeights(t *testing.T) {
	file, err := params.Load()
	if err != nil {
		t.Fatal(err)
	}
	w := file.WhaleScoreLaunch.Weights
	if w.NotionalZ != 0.40 || w.VolumeShare != 0.35 || w.PriceImpact != 0.25 {
		t.Fatalf("weights = %+v", w)
	}
	if file.WhaleScoreLaunch.TauGlobalMinor() != 5_000_000_000 {
		t.Fatalf("tau global minor = %d", file.WhaleScoreLaunch.TauGlobalMinor())
	}
}
