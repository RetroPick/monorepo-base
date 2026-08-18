package keeper

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestServiceRunOnceCompletesClaimedJob(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 5, 6, 12, 0, 0, 0, time.UTC)
	repo := &fakeRepo{
		job: &Job{
			ID:           7,
			Action:       ActionLockEpoch,
			TemplateID:   []byte{0x01},
			EpochID:      int64Ptr(9),
			ScheduledAt:  now.Add(-time.Minute),
			WindowEndAt:  now.Add(time.Minute),
			AttemptCount: 1,
		},
	}
	executor := &fakeExecutor{
		preflightSnapshot: map[string]any{"status": "open"},
		txResult: TxResult{
			Hash:        "0xabc",
			Nonce:       12,
			GasUsed:     21000,
			SubmittedAt: now,
			MinedAt:     now.Add(5 * time.Second),
			Receipt:     map[string]any{"status": "ok"},
		},
	}
	svc := NewService(repo, executor, Config{WorkerID: "keeper-a", Now: func() time.Time { return now }}, nil)

	processed, err := svc.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}
	if !processed {
		t.Fatal("RunOnce() processed = false, want true")
	}
	if repo.completed == nil {
		t.Fatal("expected complete call")
	}
	if repo.completed.TxHash != "0xabc" {
		t.Fatalf("completed tx hash = %q, want 0xabc", repo.completed.TxHash)
	}
	if len(repo.executions) != 1 || repo.executions[0].Result != ExecutionResultSucceeded {
		t.Fatalf("executions = %#v, want single succeeded execution", repo.executions)
	}
}

func TestServiceRunOnceRetriesPreflightFailureAndRaisesIncident(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 5, 6, 12, 0, 0, 0, time.UTC)
	repo := &fakeRepo{
		job: &Job{
			ID:           8,
			Action:       ActionResolveEpoch,
			TemplateID:   []byte{0x02},
			EpochID:      int64Ptr(10),
			ScheduledAt:  now.Add(-time.Minute),
			WindowEndAt:  now.Add(10 * time.Minute),
			AttemptCount: 2,
		},
	}
	executor := &fakeExecutor{preflightErr: errors.New("oracle stale")}
	svc := NewService(repo, executor, Config{
		WorkerID:      "keeper-a",
		RetryBackoff:  time.Minute,
		MaxRetryCount: 4,
		Now:           func() time.Time { return now },
	}, nil)

	processed, err := svc.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}
	if !processed {
		t.Fatal("RunOnce() processed = false, want true")
	}
	if repo.retried == nil {
		t.Fatal("expected retry call")
	}
	if repo.retried.NextScheduledAt != now.Add(time.Minute) {
		t.Fatalf("retry scheduled_at = %v, want %v", repo.retried.NextScheduledAt, now.Add(time.Minute))
	}
	if len(repo.incidents) != 1 {
		t.Fatalf("incidents len = %d, want 1", len(repo.incidents))
	}
	if len(repo.executions) != 1 || repo.executions[0].Result != ExecutionResultPreflightFailed {
		t.Fatalf("executions = %#v, want single preflight_failed execution", repo.executions)
	}
}

func TestServiceRunOnceMarksExpiredWindow(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 5, 6, 12, 0, 0, 0, time.UTC)
	repo := &fakeRepo{
		job: &Job{
			ID:           9,
			Action:       ActionGenesisLockRolling,
			TemplateID:   []byte{0x03},
			ScheduledAt:  now.Add(-2 * time.Minute),
			WindowEndAt:  now.Add(-time.Second),
			AttemptCount: 1,
		},
	}
	svc := NewService(repo, &fakeExecutor{}, Config{WorkerID: "keeper-a", Now: func() time.Time { return now }}, nil)

	processed, err := svc.RunOnce(context.Background())
	if err != nil {
		t.Fatalf("RunOnce() error = %v", err)
	}
	if !processed {
		t.Fatal("RunOnce() processed = false, want true")
	}
	if repo.expired == nil {
		t.Fatal("expected expire call")
	}
	if len(repo.incidents) != 1 {
		t.Fatalf("incidents len = %d, want 1", len(repo.incidents))
	}
	if len(repo.executions) != 1 || repo.executions[0].Result != ExecutionResultMissedWindow {
		t.Fatalf("executions = %#v, want single missed_window execution", repo.executions)
	}
}

type fakeRepo struct {
	job        *Job
	executions []ExecutionRecord
	completed  *CompleteParams
	retried    *RetryParams
	expired    *ExpireParams
	incidents  []IncidentRecord
}

func (f *fakeRepo) ClaimDueJob(context.Context, string, time.Time) (*Job, error) {
	return f.job, nil
}

func (f *fakeRepo) InsertExecution(_ context.Context, record ExecutionRecord) error {
	f.executions = append(f.executions, record)
	return nil
}

func (f *fakeRepo) MarkCompleted(_ context.Context, params CompleteParams) error {
	f.completed = &params
	return nil
}

func (f *fakeRepo) MarkRetry(_ context.Context, params RetryParams) error {
	f.retried = &params
	return nil
}

func (f *fakeRepo) MarkExpired(_ context.Context, params ExpireParams) error {
	f.expired = &params
	return nil
}

func (f *fakeRepo) InsertIncident(_ context.Context, record IncidentRecord) error {
	f.incidents = append(f.incidents, record)
	return nil
}

type fakeExecutor struct {
	preflightSnapshot map[string]any
	preflightErr      error
	txResult          TxResult
	executeErr        error
}

func (f *fakeExecutor) Preflight(context.Context, Action, []byte, *int64) (map[string]any, error) {
	if f.preflightErr != nil {
		return nil, f.preflightErr
	}
	if f.preflightSnapshot == nil {
		return map[string]any{}, nil
	}
	return f.preflightSnapshot, nil
}

func (f *fakeExecutor) Execute(context.Context, Action, []byte, *int64) (TxResult, error) {
	return f.txResult, f.executeErr
}

func int64Ptr(v int64) *int64 { return &v }
