package reporter

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/domain"
)

// Service manages reporter identity, submissions, and audit log.
type Service struct {
	domain.Service
	Pool *pgxpool.Pool
}

// New returns a reporter domain service.
func New(s domain.Service, pool *pgxpool.Pool) *Service {
	return &Service{Service: s, Pool: pool}
}

// Submission is a pending or processed reporter claim.
type Submission struct {
	ID         int64           `json:"id"`
	TemplateID string          `json:"templateId"`
	EpochID    int64           `json:"epochId"`
	Outcome    json.RawMessage `json:"outcome"`
	Evidence   json.RawMessage `json:"evidence"`
	Status     string          `json:"status"`
}

// ListPending returns submissions awaiting review.
func (s *Service) ListPending(ctx context.Context) ([]Submission, error) {
	if s.Pool == nil {
		return nil, nil
	}
	rows, err := s.Pool.Query(ctx, `
		SELECT id, template_id, epoch_id, outcome, evidence, status
		FROM reporter_submissions
		WHERE status = 'pending'
		ORDER BY created_at ASC
		LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Submission
	for rows.Next() {
		var sub Submission
		if err := rows.Scan(&sub.ID, &sub.TemplateID, &sub.EpochID, &sub.Outcome, &sub.Evidence, &sub.Status); err != nil {
			return nil, err
		}
		out = append(out, sub)
	}
	return out, rows.Err()
}
