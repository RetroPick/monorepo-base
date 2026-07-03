package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/config"
	"retropick/apps/backend/internal/domain"
	"retropick/apps/backend/internal/domain/feerouter"
	"retropick/apps/backend/internal/domain/gooddollar"
	"retropick/apps/backend/internal/domain/impact"
	"retropick/apps/backend/internal/domain/referrals"
	"retropick/apps/backend/internal/domain/reporter"
	"retropick/apps/backend/internal/domain/rewards"
	"retropick/apps/backend/internal/platform/bus"
	platformconfig "retropick/apps/backend/internal/platform/config"
	"retropick/apps/backend/internal/platform/httpx"
)

// V3Services bundles feature-flagged V3 domain services.
type V3Services struct {
	GoodDollar *gooddollar.Service
	Referrals  *referrals.Service
	Rewards    *rewards.Service
	Impact     *impact.Service
	Reporter   *reporter.Service
	FeeRouter  *feerouter.Service
	Flags      platformconfig.FeatureFlags
}

// NewV3Services wires V3 domain services from config.
func NewV3Services(cfg *config.Config, pool *pgxpool.Pool) *V3Services {
	base := domain.Service{Bus: bus.New()}
	flags := platformconfig.FeatureFlagsFrom(cfg)
	return &V3Services{
		GoodDollar: gooddollar.New(base, pool, cfg.CeloChainID, cfg.GoodDollarEnabled),
		Referrals:  referrals.New(base, pool, cfg.ReferralsEnabled),
		Rewards:    rewards.New(base, pool, cfg.RewardsEnabled),
		Impact:     impact.New(base, pool, cfg.ImpactEnabled),
		Reporter:   reporter.New(base, pool),
		FeeRouter:  feerouter.New(pool),
		Flags:      flags,
	}
}

// GoodDollarRouter mounts /api/v1/gooddollar routes.
func GoodDollarRouter(svc *V3Services) chi.Router {
	r := chi.NewRouter()
	r.Get("/status", func(w http.ResponseWriter, r *http.Request) {
		if !svc.Flags.GoodDollarEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		wallet := r.URL.Query().Get("wallet")
		if wallet == "" {
			httpx.Error(w, http.StatusBadRequest, "invalid_request", "wallet required")
			return
		}
		st, err := svc.GoodDollar.GetStatus(r.Context(), wallet)
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "gooddollar_unavailable", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, st)
	})
	return r
}

// RewardsRouter mounts /api/v1/rewards routes.
func RewardsRouter(svc *V3Services) chi.Router {
	r := chi.NewRouter()
	r.Get("/claimable", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.RewardsEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		wallet := req.URL.Query().Get("wallet")
		items, err := svc.Rewards.ListClaimable(req.Context(), wallet)
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "rewards_unavailable", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"items": items})
	})
	r.Post("/prepare-claim", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.RewardsEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		var body struct {
			Wallet   string `json:"wallet"`
			RewardID int64  `json:"rewardId"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_json", "bad request body")
			return
		}
		payload, err := svc.Rewards.PrepareClaim(req.Context(), body.Wallet, body.RewardID)
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "prepare_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, payload)
	})
	r.Post("/submit-claim-tx", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.RewardsEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		httpx.JSON(w, http.StatusAccepted, map[string]string{"status": "recorded"})
	})
	return r
}

// ReferralsRouter mounts /api/v1/referrals routes.
func ReferralsRouter(svc *V3Services) chi.Router {
	r := chi.NewRouter()
	r.Post("/apply-code", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.ReferralsEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		var body struct {
			Wallet string `json:"wallet"`
			Code   string `json:"code"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_json", "bad request body")
			return
		}
		binding, err := svc.Referrals.ApplyCode(req.Context(), body.Wallet, body.Code)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "apply_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, binding)
	})
	r.Get("/network", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.ReferralsEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		wallet := req.URL.Query().Get("wallet")
		out, err := svc.Referrals.GetNetwork(req.Context(), wallet)
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "network_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, out)
	})
	r.Get("/me", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.ReferralsEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		wallet := req.URL.Query().Get("wallet")
		out, err := svc.Referrals.GetNetwork(req.Context(), wallet)
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "network_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, out)
	})
	r.Get("/earnings", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.ReferralsEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"wallet": req.URL.Query().Get("wallet"), "earnings": []any{}})
	})
	return r
}

// ImpactRouter mounts /api/v1/impact routes.
func ImpactRouter(svc *V3Services) chi.Router {
	r := chi.NewRouter()
	r.Get("/gooddollar", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.ImpactEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		summary, err := svc.Impact.GetGoodDollarSummary(req.Context())
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "impact_unavailable", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, summary)
	})
	r.Get("/daily", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.ImpactEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"days": []any{}})
	})
	r.Get("/public-summary", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.ImpactEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		summary, err := svc.Impact.GetGoodDollarSummary(req.Context())
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "impact_unavailable", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, summary)
	})
	return r
}

// ReporterRouter mounts /api/v1/reporter routes.
func ReporterRouter(svc *V3Services) chi.Router {
	r := chi.NewRouter()
	r.Get("/pending", func(w http.ResponseWriter, req *http.Request) {
		items, err := svc.Reporter.ListPending(req.Context())
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "list_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"items": items})
	})
	r.Post("/submit", func(w http.ResponseWriter, req *http.Request) {
		var body struct {
			ReporterAddress string          `json:"reporterAddress"`
			TemplateID      string          `json:"templateId"`
			EpochID         int64           `json:"epochId"`
			Outcome         json.RawMessage `json:"outcome"`
			Evidence        json.RawMessage `json:"evidence"`
			Signature       string          `json:"signature"`
			Nonce           int64           `json:"nonce"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_json", "bad request body")
			return
		}
		sub, err := svc.Reporter.Submit(req.Context(), reporter.SubmitInput{
			ReporterAddress: body.ReporterAddress,
			TemplateID:      body.TemplateID,
			EpochID:         body.EpochID,
			Outcome:         body.Outcome,
			Evidence:        body.Evidence,
			Signature:       body.Signature,
			Nonce:           body.Nonce,
		})
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "submit_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusAccepted, sub)
	})
	r.Post("/approve", func(w http.ResponseWriter, req *http.Request) {
		var body struct {
			SubmissionID int64  `json:"submissionId"`
			ActorAddress string `json:"actorAddress"`
			Reason       string `json:"reason"`
			TxHash       string `json:"txHash"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_json", "bad request body")
			return
		}
		sub, err := svc.Reporter.Approve(req.Context(), reporter.ReviewInput{
			SubmissionID: body.SubmissionID,
			ActorAddress: body.ActorAddress,
			Reason:       body.Reason,
			TxHash:       body.TxHash,
		})
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "approve_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, sub)
	})
	r.Post("/reject", func(w http.ResponseWriter, req *http.Request) {
		var body struct {
			SubmissionID int64  `json:"submissionId"`
			ActorAddress string `json:"actorAddress"`
			Reason       string `json:"reason"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			httpx.Error(w, http.StatusBadRequest, "invalid_json", "bad request body")
			return
		}
		sub, err := svc.Reporter.Reject(req.Context(), reporter.ReviewInput{
			SubmissionID: body.SubmissionID,
			ActorAddress: body.ActorAddress,
			Reason:       body.Reason,
		})
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "reject_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, sub)
	})
	return r
}

// FeeRouterOpsRouter mounts /api/v1/ops/fee-router routes.
func FeeRouterOpsRouter(svc *V3Services) chi.Router {
	r := chi.NewRouter()
	r.Get("/batches", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.FeeRouterEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		batches, err := svc.FeeRouter.ListBatches(req.Context(), 50)
		if err != nil {
			httpx.Error(w, http.StatusServiceUnavailable, "batches_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]any{"batches": batches})
	})
	r.Post("/prepare-route", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.FeeRouterEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "prepared"})
	})
	r.Post("/record-route-tx", func(w http.ResponseWriter, req *http.Request) {
		if !svc.Flags.FeeRouterEnabled {
			httpx.FeatureDisabled(w)
			return
		}
		httpx.JSON(w, http.StatusAccepted, map[string]string{"status": "recorded"})
	})
	return r
}
