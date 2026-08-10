package wallet

// Recorder increments wallet discovery outcomes.
type Recorder interface {
	RecordDiscovery(result string)
}

// NopRecorder discards metric events.
type NopRecorder struct{}

func (NopRecorder) RecordDiscovery(_ string) {}
