package eligibility

// Recorder increments fail-closed eligibility metrics by reason code.
type Recorder interface {
	RecordFailClosed(reason string)
}

// NopRecorder discards metric events.
type NopRecorder struct{}

func (NopRecorder) RecordFailClosed(_ string) {}
