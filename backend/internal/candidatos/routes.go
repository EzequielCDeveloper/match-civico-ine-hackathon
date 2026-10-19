package candidatos

import (
	"database/sql"

	"github.com/go-chi/chi/v5"
)

// RegisterRoutes registers endpoints for the candidatos module.
// Assigned to: Luis (Filtrado de candidato, Presentación de candidatos).
func RegisterRoutes(r chi.Router, db *sql.DB) {
	h := NewHandler(db)

	r.Route("/candidatos", func(r chi.Router) {
		r.Get("/", h.List)
		r.Get("/{id}", h.GetByID)
	})
}
