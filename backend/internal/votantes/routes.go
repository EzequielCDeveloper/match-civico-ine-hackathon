package votantes

import (
	"database/sql"

	"github.com/go-chi/chi/v5"
)

// RegisterRoutes registers endpoints for the votantes module.
// Assigned to: Ezequiel (Perfil usuario votante, Porcentaje de votantes acorde a perfil usuario).
func RegisterRoutes(r chi.Router, db *sql.DB) {
	h := NewHandler(db)

	r.Route("/votantes", func(r chi.Router) {
		r.Get("/entidades", h.ListEntidades)
		r.Get("/entidades/{id}", h.GetEntidadByID)
		r.Post("/perfil", h.CalcularPerfil)
	})
}
