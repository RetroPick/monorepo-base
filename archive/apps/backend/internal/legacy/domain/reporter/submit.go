package reporter

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
)

// SubmitInput is the HTTP payload for reporter submission.
type SubmitInput struct {
	ReporterAddress string          `json:"reporterAddress"`
	TemplateID      string          `json:"templateId"`
	EpochID         int64           `json:"epochId"`
	Outcome         json.RawMessage `json:"outcome"`
	Evidence        json.RawMessage `json:"evidence"`
	Signature       string          `json:"signature"`
	Nonce           int64           `json:"nonce"`
}

// ReviewInput is the HTTP payload for approve/reject.
type ReviewInput struct {
	SubmissionID int64  `json:"submissionId"`
	ActorAddress string `json:"actorAddress"`
	Reason       string `json:"reason"`
	TxHash       string `json:"txHash"`
}

// Submit stores a reporter claim for review.
func (s *Service) Submit(ctx context.Context, in SubmitInput) (*Submission, error) {
	if s.Pool == nil {
		return nil, fmt.Errorf("reporter: db unavailable")
	}
	addr, err := normalizeAddress(in.ReporterAddress)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(in.TemplateID) == "" || in.EpochID < 0 {
		return nil, fmt.Errorf("reporter: templateId and epochId required")
	}
	sig, err := decodeHexBytes(in.Signature)
	if err != nil {
		return nil, fmt.Errorf("reporter: invalid signature")
	}
	evidenceHash := sha256.Sum256(in.Evidence)
	reporterID, err := s.ensureReporter(ctx, addr)
	if err != nil {
		return nil, err
	}
	var sub Submission
	err = s.Pool.QueryRow(ctx, `
INSERT INTO reporter_submissions (
  template_id, epoch_id, reporter_id, outcome, evidence, evidence_hash, signature, nonce, status
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
ON CONFLICT (template_id, epoch_id, reporter_id, nonce) DO UPDATE
SET outcome = EXCLUDED.outcome,
    evidence = EXCLUDED.evidence,
    evidence_hash = EXCLUDED.evidence_hash,
    signature = EXCLUDED.signature,
    status = 'pending'
RETURNING id, template_id, epoch_id, outcome, evidence, status
`, in.TemplateID, in.EpochID, reporterID, in.Outcome, in.Evidence, evidenceHash[:], sig, in.Nonce).
		Scan(&sub.ID, &sub.TemplateID, &sub.EpochID, &sub.Outcome, &sub.Evidence, &sub.Status)
	if err != nil {
		return nil, err
	}
	_, _ = s.Pool.Exec(ctx, `
INSERT INTO reporter_audit_log (submission_id, actor_id, action, reason)
VALUES ($1, $2, 'submit', NULL)
`, sub.ID, reporterID)
	return &sub, nil
}

// Approve marks a submission approved.
func (s *Service) Approve(ctx context.Context, in ReviewInput) (*Submission, error) {
	return s.review(ctx, in, "approved", "approve")
}

// Reject marks a submission rejected.
func (s *Service) Reject(ctx context.Context, in ReviewInput) (*Submission, error) {
	return s.review(ctx, in, "rejected", "reject")
}

func (s *Service) review(ctx context.Context, in ReviewInput, status, action string) (*Submission, error) {
	if s.Pool == nil {
		return nil, fmt.Errorf("reporter: db unavailable")
	}
	if in.SubmissionID <= 0 {
		return nil, fmt.Errorf("reporter: submissionId required")
	}
	actor, err := normalizeAddress(in.ActorAddress)
	if err != nil {
		return nil, err
	}
	actorID, err := s.ensureReporter(ctx, actor)
	if err != nil {
		return nil, err
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var sub Submission
	err = tx.QueryRow(ctx, `
UPDATE reporter_submissions
SET status = $2
WHERE id = $1 AND status = 'pending'
RETURNING id, template_id, epoch_id, outcome, evidence, status
`, in.SubmissionID, status).Scan(&sub.ID, &sub.TemplateID, &sub.EpochID, &sub.Outcome, &sub.Evidence, &sub.Status)
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("reporter: submission not pending")
	}
	if err != nil {
		return nil, err
	}
	var txHash any
	if in.TxHash != "" {
		if h, err := decodeHexBytes(in.TxHash); err == nil {
			txHash = h
		}
	}
	_, err = tx.Exec(ctx, `
INSERT INTO reporter_audit_log (submission_id, actor_id, action, reason, tx_hash)
VALUES ($1, $2, $3, $4, $5)
`, in.SubmissionID, actorID, action, nullIfEmpty(in.Reason), txHash)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &sub, nil
}

func (s *Service) ensureReporter(ctx context.Context, addr common.Address) (int64, error) {
	var id int64
	err := s.Pool.QueryRow(ctx, `
INSERT INTO reporter_identity (address, role, status)
VALUES ($1, 'reporter', 'active')
ON CONFLICT (address) DO UPDATE SET status = 'active'
RETURNING id
`, addr.Bytes()).Scan(&id)
	return id, err
}

func normalizeAddress(wallet string) (common.Address, error) {
	wallet = strings.TrimSpace(wallet)
	if !common.IsHexAddress(wallet) {
		return common.Address{}, fmt.Errorf("reporter: invalid address")
	}
	return common.HexToAddress(wallet), nil
}

func decodeHexBytes(raw string) ([]byte, error) {
	raw = strings.TrimPrefix(strings.TrimSpace(raw), "0x")
	if raw == "" {
		return nil, fmt.Errorf("empty hex")
	}
	return hex.DecodeString(raw)
}

func nullIfEmpty(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
