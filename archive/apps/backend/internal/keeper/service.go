package keeper

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"
)

type Action string

const (
	ActionLockEpoch           Action = "lockEpoch"
	ActionResolveEpoch        Action = "resolveEpoch"
	ActionGenesisLockRolling  Action = "genesisLockRolling"
	ActionExecuteRollingRound Action = "executeRollingRound"
)

type ExecutionResult string

const (
	ExecutionResultSucceeded       ExecutionResult = "succeeded"
	ExecutionResultFailed          ExecutionResult = "failed"
	ExecutionResultPreflightFailed ExecutionResult = "preflight_failed"
	ExecutionResultMissedWindow    ExecutionResult = "missed_window"
)

type Config struct {
	WorkerID      string
	RetryBackoff  time.Duration
	MaxRetryCount int
	Now           func() time.Time
}

type Service struct {
	repo     Repository
	executor Executor
	cfg      Config
	log      *slog.Logger
}

func NewService(repo Repository, executor Executor, cfg Config, log *slog.Logger) *Service {
	if cfg.WorkerID == "" {
		cfg.WorkerID = "keeper"
	}
	if cfg.RetryBackoff <= 0 {
		cfg.RetryBackoff = 30 * time.Second
	}
	if cfg.MaxRetryCount <= 0 {
		cfg.MaxRetryCount = 3
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	return &Service{repo: repo, executor: executor, cfg: cfg, log: log}
}

func (s *Service) RunOnce(ctx context.Context) (bool, error) {
	now := s.cfg.Now().UTC()
	job, err := s.repo.ClaimDueJob(ctx, s.cfg.WorkerID, now)
	if err != nil {
		return false, err
	}
	if job == nil {
		return false, nil
	}

	if now.After(job.WindowEndAt) {
		return true, s.markExpired(ctx, *job, now, errors.New("window expired before execution"))
	}

	startedAt := now
	snapshot, err := s.executor.Preflight(ctx, job.Action, job.TemplateID, job.EpochID)
	if err != nil {
		return true, s.markFailure(ctx, *job, startedAt, snapshot, ExecutionResultPreflightFailed, err)
	}

	txResult, err := s.executor.Execute(ctx, job.Action, job.TemplateID, job.EpochID)
	if err != nil {
		return true, s.markFailure(ctx, *job, startedAt, snapshot, ExecutionResultFailed, err)
	}
	record := ExecutionRecord{
		ScheduleID:        job.ID,
		Action:            job.Action,
		TemplateID:        append([]byte(nil), job.TemplateID...),
		EpochID:           job.EpochID,
		Result:            ExecutionResultSucceeded,
		TxHash:            txResult.Hash,
		StartedAt:         startedAt,
		SubmittedAt:       txResult.SubmittedAt,
		MinedAt:           txResult.MinedAt,
		GasUsed:           txResult.GasUsed,
		ReceiptJSON:       marshalJSON(txResult.Receipt),
		ChainID:           txResult.ChainID,
		Nonce:             txResult.Nonce,
		PreflightSnapshot: marshalJSON(snapshot),
	}
	if err := s.repo.InsertExecution(ctx, record); err != nil {
		return true, err
	}
	if err := s.repo.MarkCompleted(ctx, CompleteParams{
		JobID:      job.ID,
		TxHash:     txResult.Hash,
		FinishedAt: txResult.MinedAtOr(startedAt),
	}); err != nil {
		return true, err
	}
	if s.log != nil {
		s.log.Info("keeper job completed", "job_id", job.ID, "action", job.Action, "tx_hash", txResult.Hash)
	}
	return true, nil
}

func (s *Service) markExpired(ctx context.Context, job Job, startedAt time.Time, reason error) error {
	record := ExecutionRecord{
		ScheduleID:   job.ID,
		Action:       job.Action,
		TemplateID:   append([]byte(nil), job.TemplateID...),
		EpochID:      job.EpochID,
		Result:       ExecutionResultMissedWindow,
		StartedAt:    startedAt,
		ErrorMessage: reason.Error(),
	}
	if err := s.repo.InsertExecution(ctx, record); err != nil {
		return err
	}
	if err := s.repo.MarkExpired(ctx, ExpireParams{
		JobID:      job.ID,
		LastError:  reason.Error(),
		FinishedAt: startedAt,
	}); err != nil {
		return err
	}
	return s.repo.InsertIncident(ctx, IncidentRecord{
		Title:      fmt.Sprintf("keeper missed window: %s", job.Action),
		Severity:   "high",
		TemplateID: append([]byte(nil), job.TemplateID...),
		Payload: marshalJSON(map[string]any{
			"scheduleId": job.ID,
			"action":     job.Action,
			"epochId":    job.EpochID,
			"error":      reason.Error(),
		}),
	})
}

func (s *Service) markFailure(ctx context.Context, job Job, startedAt time.Time, snapshot map[string]any, result ExecutionResult, reason error) error {
	record := ExecutionRecord{
		ScheduleID:        job.ID,
		Action:            job.Action,
		TemplateID:        append([]byte(nil), job.TemplateID...),
		EpochID:           job.EpochID,
		Result:            result,
		StartedAt:         startedAt,
		ErrorMessage:      reason.Error(),
		PreflightSnapshot: marshalJSON(snapshot),
	}
	if err := s.repo.InsertExecution(ctx, record); err != nil {
		return err
	}
	if err := s.repo.InsertIncident(ctx, IncidentRecord{
		Title:      fmt.Sprintf("keeper %s failed", job.Action),
		Severity:   incidentSeverity(result),
		TemplateID: append([]byte(nil), job.TemplateID...),
		Payload: marshalJSON(map[string]any{
			"scheduleId": job.ID,
			"action":     job.Action,
			"epochId":    job.EpochID,
			"result":     result,
			"error":      reason.Error(),
			"snapshot":   snapshot,
		}),
	}); err != nil {
		return err
	}
	if job.AttemptCount >= s.cfg.MaxRetryCount || s.cfg.Now().UTC().Add(s.cfg.RetryBackoff).After(job.WindowEndAt) {
		return s.repo.MarkExpired(ctx, ExpireParams{
			JobID:      job.ID,
			LastError:  reason.Error(),
			FinishedAt: startedAt,
		})
	}
	return s.repo.MarkRetry(ctx, RetryParams{
		JobID:           job.ID,
		LastError:       reason.Error(),
		NextScheduledAt: s.cfg.Now().UTC().Add(s.cfg.RetryBackoff),
		FinishedAt:      startedAt,
	})
}

func incidentSeverity(result ExecutionResult) string {
	switch result {
	case ExecutionResultPreflightFailed:
		return "medium"
	default:
		return "high"
	}
}

func marshalJSON(v any) string {
	if v == nil {
		return "{}"
	}
	b, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(b)
}
