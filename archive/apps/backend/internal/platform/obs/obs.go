package obs

import "log/slog"

// Logger is a thin alias over slog for domain services.
type Logger = *slog.Logger

// Default returns the process default logger.
func Default() Logger {
	return slog.Default()
}
