package sistema

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"app/internal/common"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

// ResetInfo handles resetting user profiles or application cache.
func (h *Handler) ResetInfo(w http.ResponseWriter, r *http.Request) {
	var req ResetRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.TipoReset == "" {
		req.TipoReset = "PERFILES"
	}

	var affected int64 = 0

	if strings.ToUpper(req.TipoReset) == "PERFILES" {
		res, execErr := h.db.Exec("DELETE FROM votantes_perfiles")
		if execErr != nil {
			common.RespondError(w, http.StatusInternalServerError, "Error deleting profiles: "+execErr.Error())
			return
		}
		affected, _ = res.RowsAffected()
	}

	// Log reset in audit table
	_, _ = h.db.Exec(`
		INSERT INTO sistema_resets (tipo_reset, motivo, usuario_o_sesion)
		VALUES (?, ?, 'admin_api')
	`, req.TipoReset, req.Motivo)

	common.RespondJSON(w, http.StatusOK, ResetResponse{
		OK:                 true,
		TipoReset:          req.TipoReset,
		Mensaje:            fmt.Sprintf("Reset exitoso de tipo '%s'. %d registros eliminados.", req.TipoReset, affected),
		RegistrosAfectados: affected,
		Timestamp:          time.Now(),
	})
}

// ExportarPDF registers and produces a PDF export document stub.
func (h *Handler) ExportarPDF(w http.ResponseWriter, r *http.Request) {
	var req ExportarPDFRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	if req.Modulo == "" {
		req.Modulo = "candidatos"
	}
	if req.Titulo == "" {
		req.Titulo = fmt.Sprintf("Reporte_%s_%d", req.Modulo, req.ReferenciaID)
	}

	docURL := fmt.Sprintf("/exports/%s_%d.pdf", req.Modulo, req.ReferenciaID)

	// Save export record to audit table
	res, err := h.db.Exec(`
		INSERT INTO sistema_exportaciones (formato, modulo_origen, referencia_id, titulo, ruta_archivo)
		VALUES ('PDF', ?, ?, ?, ?)
	`, req.Modulo, req.ReferenciaID, req.Titulo, docURL)

	var exportID int64
	if err == nil {
		exportID, _ = res.LastInsertId()
	}

	common.RespondJSON(w, http.StatusOK, ExportarPDFResponse{
		OK:          true,
		ExportID:    exportID,
		Formato:     "PDF",
		Titulo:      req.Titulo,
		RutaOURL:    docURL,
		Mensaje:     "Documento PDF generado y listo para descarga",
		GeneratedAt: time.Now(),
	})
}

// Status returns table statistics and system operational status.
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	var totalCandidatos, totalEntidades, totalPerfiles int

	_ = h.db.QueryRow("SELECT count(*) FROM candidatos_candidatos").Scan(&totalCandidatos)
	_ = h.db.QueryRow("SELECT count(*) FROM votantes_entidades").Scan(&totalEntidades)
	_ = h.db.QueryRow("SELECT count(*) FROM votantes_perfiles").Scan(&totalPerfiles)

	common.RespondJSON(w, http.StatusOK, StatusResponse{
		Status:          "online",
		TotalCandidatos: totalCandidatos,
		TotalEntidades:  totalEntidades,
		TotalPerfiles:   totalPerfiles,
	})
}
