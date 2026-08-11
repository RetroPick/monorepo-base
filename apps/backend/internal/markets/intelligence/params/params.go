package params

import (
	_ "embed"
	"fmt"

	"gopkg.in/yaml.v3"
)

const (
	ParamsRef           = "intelligence_params_v1.yaml#whale_score_launch"
	FormulaVersion      = "large_trade_v1"
	NotionalMinorScale  = 1_000_000
)

//go:embed intelligence_params_v1.yaml
var embeddedYAML []byte

// WhaleScoreLaunch holds frozen Launch v1 whale scoring parameters.
type WhaleScoreLaunch struct {
	Weights struct {
		NotionalZ   float64 `yaml:"notional_z"`
		VolumeShare float64 `yaml:"volume_share"`
		PriceImpact float64 `yaml:"price_impact"`
	} `yaml:"weights"`
	TauGlobalUSD            float64 `yaml:"tau_global_usd"`
	TauLiquidityPct         float64 `yaml:"tau_liquidity_pct"`
	TauVolumePct            float64 `yaml:"tau_volume_pct"`
	ScoreThreshold          float64 `yaml:"score_threshold"`
	VolumeShareReasonBps    int64   `yaml:"volume_share_reason_bps"`
	PriceImpactReasonBps    int64   `yaml:"price_impact_reason_bps"`
	PriceImpactCapBps       int64   `yaml:"price_impact_cap_bps"`
	NotionalZ               struct {
		MuUSD    float64 `yaml:"mu_usd"`
		SigmaUSD float64 `yaml:"sigma_usd"`
	} `yaml:"notional_z"`
	DedupWindowMinutes      int     `yaml:"dedup_window_minutes"`
	VolumeShareEpsilonUSD   float64 `yaml:"volume_share_epsilon_usd"`
}

// File is the parsed intelligence params document.
type File struct {
	Version          string           `yaml:"version"`
	WhaleScoreLaunch WhaleScoreLaunch `yaml:"whale_score_launch"`
}

// Load parses the embedded Launch params file.
func Load() (File, error) {
	var file File
	if err := yaml.Unmarshal(embeddedYAML, &file); err != nil {
		return File{}, fmt.Errorf("parse intelligence params: %w", err)
	}
	if err := file.Validate(); err != nil {
		return File{}, err
	}
	return file, nil
}

// Validate checks weight sum and required fields.
func (f File) Validate() error {
	w := f.WhaleScoreLaunch.Weights
	sum := w.NotionalZ + w.VolumeShare + w.PriceImpact
	if sum < 0.999 || sum > 1.001 {
		return fmt.Errorf("whale_score_launch weights must sum to 1.0, got %.4f", sum)
	}
	if f.WhaleScoreLaunch.TauGlobalUSD <= 0 {
		return fmt.Errorf("tau_global_usd required")
	}
	if f.WhaleScoreLaunch.ScoreThreshold <= 0 {
		return fmt.Errorf("score_threshold required")
	}
	if f.WhaleScoreLaunch.DedupWindowMinutes <= 0 {
		return fmt.Errorf("dedup_window_minutes required")
	}
	return nil
}

// LoadDefault returns embedded params or panics on invalid config (init-time safe).
func LoadDefault() File {
	file, err := Load()
	if err != nil {
		panic(err)
	}
	return file
}

// TauGlobalMinor returns τ_global in notional minor units.
func (w WhaleScoreLaunch) TauGlobalMinor() int64 {
	return int64(w.TauGlobalUSD * NotionalMinorScale)
}
