package realtime

import (
	"sync"
	"testing"
)

func TestHubConcurrentPublishAndShutdownDoesNotRaceSendClosure(t *testing.T) {
	const attempts = 10_000

	for i := 0; i < attempts; i++ {
		hub := NewHub(HubConfig{MaxQueue: 2})
		client := NewClient(hub, "client")
		if !hub.Register(client, "") {
			t.Fatal("register failed")
		}
		hub.Subscribe(client, "market", "token")

		start := make(chan struct{})
		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			defer wg.Done()
			<-start
			hub.PublishToToken("market", "token", []byte("update"))
		}()
		go func() {
			defer wg.Done()
			<-start
			hub.shutdown()
		}()
		close(start)
		wg.Wait()
	}
}
