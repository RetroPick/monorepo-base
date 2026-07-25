package markets

import (
	"github.com/go-chi/chi/v5"
)

// RegisterRoutes mounts Polymarket Markets BFF routes on the parent router.
// Static paths must be registered before archived epoch API/{templateId} routes.
func RegisterRoutes(r chi.Router, h *Handler) {
	r.Get("/api/v1/markets/eligibility", h.Eligibility)
	r.Get("/api/v1/markets/capabilities", h.Capabilities)
	r.Get("/api/v1/markets/events", h.ListEvents)
}
