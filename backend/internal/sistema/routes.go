package sistema

import (
	"database/sql"

	"github.com/go-chi/chi/v5"
)

// RegisterRoutes registers endpoints for the sistema module.
// Assigned to: Juan (Exportar info a PDF, Auditoría de BD y Resolución de conflictos).
func RegisterRoutes(r chi.Router, db *sql.DB) {
	h := NewHandler(db)

	r.Route("/sistema", func(r chi.Router) {
		r.Get("/status", h.Status)
		r.Post("/exportar-pdf", h.ExportarPDF)
		r.Get("/exportar-pdf/descargar", h.DescargarPDF)
		r.Get("/auditoria", h.Auditoria)
		r.Post("/fusion/resolver", h.ResolverFusion)
	})
}
