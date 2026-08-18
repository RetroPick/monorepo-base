package metrics

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

type Snapshot func() map[string]float64

func ServeIfConfigured(ctx context.Context, service string, snapshot Snapshot, log *slog.Logger) {
	port := strings.TrimSpace(os.Getenv("METRICS_PORT"))
	if port == "" {
		return
	}
	host := strings.TrimSpace(os.Getenv("METRICS_HOST"))
	if host == "" {
		host = "127.0.0.1"
	}
	addr := host + ":" + port
	mux := http.NewServeMux()
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		_, _ = fmt.Fprintf(w, "retropick_service_info{service=%q} 1\n", service)
		for key, value := range snapshot() {
			_, _ = fmt.Fprintf(w, "%s %v\n", key, value)
		}
	})
	server := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()
	go func() {
		if log != nil {
			log.Info("metrics listening", "service", service, "addr", addr)
		}
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed && log != nil {
			log.Error("metrics server", "service", service, "err", err)
		}
	}()
}
