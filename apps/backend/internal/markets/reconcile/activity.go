package reconcile

import (
	"context"

	"retropick/apps/backend/internal/markets/activity"
)

// ActivityAppender is the durable, append-only event boundary used when a
// reconciled venue fill is first observed.
type ActivityAppender interface {
	Append(context.Context, activity.Event) error
}
