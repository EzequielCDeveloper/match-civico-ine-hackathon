package sistema

import "time"

// ResetRequest defines payload for clearing application or session state.
type ResetRequest struct {
	TipoReset string `json:"tipo_reset"` // e.g. "PERFILES", "FULL"
	Motivo    string `json:"motivo"`
}

// ResetResponse contains the summary of the reset operation.
type ResetResponse struct {
	OK                 bool      `json:"ok"`
	TipoReset          string    `json:"tipo_reset"`
	Mensaje            string    `json:"mensaje"`
	RegistrosAfectados int64     `json:"registros_afectados"`
	Timestamp          time.Time `json:"timestamp"`
}

// ExportarPDFRequest defines payload to generate a PDF export.
type ExportarPDFRequest struct {
	Modulo       string `json:"modulo"` // "candidatos" | "votantes"
	ReferenciaID int    `json:"referencia_id"`
	Titulo       string `json:"titulo"`
}

// ExportarPDFResponse returns metadata for the exported document.
type ExportarPDFResponse struct {
	OK          bool      `json:"ok"`
	ExportID    int64     `json:"export_id"`
	Formato     string    `json:"formato"`
	Titulo      string    `json:"titulo"`
	RutaOURL    string    `json:"ruta_o_url"`
	Mensaje     string    `json:"mensaje"`
	GeneratedAt time.Time `json:"generated_at"`
}

// StatusResponse returns health and counts of database tables.
type StatusResponse struct {
	Status          string `json:"status"`
	TotalCandidatos int    `json:"total_candidatos"`
	TotalEntidades  int    `json:"total_entidades"`
	TotalPerfiles   int    `json:"total_perfiles"`
}
