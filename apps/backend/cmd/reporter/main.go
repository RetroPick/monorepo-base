package main

import (
	"log/slog"
	"os"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	log.Info("retropick-reporter stub: TrustedReporter posting not implemented")
	os.Exit(0)
}
