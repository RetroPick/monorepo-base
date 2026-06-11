package keeper

import (
	"context"
	"time"
)

type Job struct {
	ID           int64
	Action       Action
	TemplateID   []byte
	EpochID      *int64
	ScheduledAt  time.Time
	WindowEndAt  time.Time
	AttemptCount int
}

type ExecutionRecord struct {
	ScheduleID        int64
	Action            Action
	TemplateID        []byte
	EpochID           *int64
	Result            ExecutionResult
	TxHash            string
	ErrorMessage      string
	StartedAt         time.Time
	SubmittedAt       time.Time
	MinedAt           time.Time
	GasUsed           uint64
	ReceiptJSON       string
	ChainID           int64
	Nonce             uint64
	PreflightSnapshot string
}

type IncidentRecord struct {
	Title      string
	Severity   string
	TemplateID []byte
	Payload    string
}

type CompleteParams struct {
	JobID      int64
	TxHash     string
	FinishedAt time.Time
}

type RetryParams struct {
	JobID           int64
	LastError       string
	NextScheduledAt time.Time
	FinishedAt      time.Time
}

type ExpireParams struct {
	JobID      int64
	LastError  string
	FinishedAt time.Time
}

type TxResult struct {
	Hash        string
	SubmittedAt time.Time
	MinedAt     time.Time
	GasUsed     uint64
	Receipt     map[string]any
	ChainID     int64
	Nonce       uint64
}

func (r TxResult) MinedAtOr(fallback time.Time) time.Time {
	if !r.MinedAt.IsZero() {
		return r.MinedAt
	}
	if !r.SubmittedAt.IsZero() {
		return r.SubmittedAt
	}
	return fallback
}

type Repository interface {
	ClaimDueJob(ctx context.Context, workerID string, now time.Time) (*Job, error)
	InsertExecution(ctx context.Context, record ExecutionRecord) error
	MarkCompleted(ctx context.Context, params CompleteParams) error
	MarkRetry(ctx context.Context, params RetryParams) error
	MarkExpired(ctx context.Context, params ExpireParams) error
	InsertIncident(ctx context.Context, record IncidentRecord) error
}

type Executor interface {
	Preflight(ctx context.Context, action Action, templateID []byte, epochID *int64) (map[string]any, error)
	Execute(ctx context.Context, action Action, templateID []byte, epochID *int64) (TxResult, error)
}
