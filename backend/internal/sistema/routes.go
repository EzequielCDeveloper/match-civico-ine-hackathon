package sistema

import (
	"database/sql"

	"github.com/go-chi/chi/v5"
)

// RegisterRoutes registers endpoints for the sistema module.
// Assigned to: Juan (Reset de info app, Exportar info a PDF, Mantenimiento).
func RegisterRoutes(r chi.Router, db *sql.DB) {
	h := NewHandler(db)

	r.Route("/sistema", func(r chi.Router) {
		r.Get("/status", h.Status)
		r.Post("/reset", h.ResetInfo)
		r.Post("/exportar-pdf", h.ExportarPDF)
	})
}
