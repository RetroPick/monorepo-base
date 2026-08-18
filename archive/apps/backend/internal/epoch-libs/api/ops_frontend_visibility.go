package api

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"retropick/apps/backend/internal/dbqueries"
)

// registerOpsFrontendVisibilityRoutes mutates the public /api/v1/markets listing: templates
// recorded here are hidden from archived epoch markets API and return 404 on market detail/epochs.
// POST body: {"action":"hide|unhide|list","templateId":"0x..."} (templateId required for hide/unhide).
func registerOpsFrontendVisibilityRoutes(r chi.Router, pool *pgxpool.Pool) {
	q := dbqueries.New(pool)
	r.Post("/frontend-visibility", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		var body struct {
			Action     string `json:"action"`
			TemplateID string `json:"templateId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		switch body.Action {
		case "list":
			rows, err := q.ListFrontendHidden(ctx)
			if err != nil {
				http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
				return
			}
			out := make([]map[string]any, 0, len(rows))
			for _, row := range rows {
				m := map[string]any{
					"templateId": "0x" + hex.EncodeToString(row.TemplateID),
				}
				if row.HiddenAt.Valid {
					m["hiddenAt"] = row.HiddenAt.Time.UTC().Format("2006-01-02T15:04:05Z07:00")
				}
				out = append(out, m)
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"hidden": out})
			return
		case "hide", "unhide":
			b, ok := parseTemplateIDParam(body.TemplateID)
			if !ok {
				http.Error(w, `{"error":"invalid templateId"}`, http.StatusBadRequest)
				return
			}
			if body.Action == "hide" {
				_, err := q.GetTemplateLedgerEpoch(ctx, b)
				if err != nil {
					if errors.Is(err, pgx.ErrNoRows) {
						http.Error(w, `{"error":"template not indexed"}`, http.StatusNotFound)
						return
					}
					http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
					return
				}
				if err := q.AddFrontendHidden(ctx, b); err != nil {
					http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]any{
					"ok":         true,
					"action":     "hide",
					"templateId": "0x" + hex.EncodeToString(b),
				})
				return
			}
			if err := q.RemoveFrontendHidden(ctx, b); err != nil {
				http.Error(w, `{"error":"db"}`, http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"ok":         true,
				"action":     "unhide",
				"templateId": "0x" + hex.EncodeToString(b),
			})
			return
		default:
			http.Error(w, `{"error":"action must be hide, unhide, or list"}`, http.StatusBadRequest)
		}
	})
}
