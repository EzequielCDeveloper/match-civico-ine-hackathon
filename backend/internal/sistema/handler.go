package sistema

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"app/internal/common"
)

type Handler struct {
	db       *sql.DB
	dirDatos string
}

// NewHandler crea el handler del módulo de sistema. Los archivos que genera
// (snapshots de reset y exportaciones PDF) se escriben bajo SISTEMA_DATA_DIR;
// si la variable no está definida se usa el directorio de trabajo actual.
func NewHandler(db *sql.DB) *Handler {
	dirDatos := os.Getenv("SISTEMA_DATA_DIR")
	if dirDatos == "" {
		dirDatos = "."
	}
	return &Handler{db: db, dirDatos: dirDatos}
}

// carpeta crea, si hace falta, la subcarpeta de datos y devuelve su ruta.
func (h *Handler) carpeta(nombre string) string {
	ruta := filepath.Join(h.dirDatos, nombre)
	_ = os.MkdirAll(ruta, 0755)
	return ruta
}

func (h *Handler) verificarAdmin(r *http.Request) bool {
	tokenEsperado := os.Getenv("SISTEMA_ADMIN_TOKEN")
	if tokenEsperado == "" {
		return false
	}
	tokenRecibido := r.Header.Get("X-Admin-Token")
	return tokenRecibido != "" && tokenRecibido == tokenEsperado
}

// 1. ExportarPDF generates a real, valid PDF document and stores it in the database audit table.
func (h *Handler) ExportarPDF(w http.ResponseWriter, r *http.Request) {
	var req ExportarPDFRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.Modulo == "" {
		req.Modulo = "candidatos"
	}
	if req.Titulo == "" {
		req.Titulo = fmt.Sprintf("Reporte Oficial Match Civico (%s)", strings.ToUpper(req.Modulo))
	}
	if req.Actor == "" {
		req.Actor = "usuario_sistema"
	}

	// Obtener conteos de la BD para el reporte
	var totalCandidatos, totalEntidades, totalPerfiles int
	_ = h.db.QueryRow("SELECT count(*) FROM candidatos_candidatos").Scan(&totalCandidatos)
	_ = h.db.QueryRow("SELECT count(*) FROM votantes_entidades").Scan(&totalEntidades)
	_ = h.db.QueryRow("SELECT count(*) FROM votantes_perfiles").Scan(&totalPerfiles)

	// Generar PDF nativo estándar PDF-1.4
	pdfBytes := compilarPDF(req.Titulo, req.Actor, totalCandidatos, totalEntidades, totalPerfiles, req.Resumen)

	nombreArchivo := fmt.Sprintf("reporte_%s_%s.pdf", req.Modulo, time.Now().Format("20060102_150405"))
	rutaArchivo := filepath.Join(h.carpeta("sistema_exportaciones"), nombreArchivo)
	_ = os.WriteFile(rutaArchivo, pdfBytes, 0644)

	docURL := fmt.Sprintf("/api/v1/sistema/exportar-pdf/descargar?archivo=%s", nombreArchivo)

	// Registrar en tabla de auditoría de exportaciones
	res, err := h.db.Exec(`
		INSERT INTO sistema_exportaciones (formato, modulo_origen, referencia_id, titulo, ruta_archivo)
		VALUES ('PDF', ?, ?, ?, ?)
	`, req.Modulo, req.ReferenciaID, req.Titulo, rutaArchivo)

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
		TamanoBytes: len(pdfBytes),
		Mensaje:     "Documento PDF oficial generado y archivado con éxito",
		GeneratedAt: time.Now().UTC(),
	})
}

// DescargarPDF permite la descarga directa del archivo PDF generado.
func (h *Handler) DescargarPDF(w http.ResponseWriter, r *http.Request) {
	archivo := filepath.Base(r.URL.Query().Get("archivo"))
	if archivo == "" || archivo == "." {
		// Generar dinámicamente si no se especificó archivo
		var totalCandidatos, totalEntidades, totalPerfiles int
		_ = h.db.QueryRow("SELECT count(*) FROM candidatos_candidatos").Scan(&totalCandidatos)
		_ = h.db.QueryRow("SELECT count(*) FROM votantes_entidades").Scan(&totalEntidades)
		_ = h.db.QueryRow("SELECT count(*) FROM votantes_perfiles").Scan(&totalPerfiles)

		pdfBytes := compilarPDF("Reporte Oficial Match Civico", "descarga_directa", totalCandidatos, totalEntidades, totalPerfiles, nil)
		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", "attachment; filename=\"reporte_match_civico.pdf\"")
		w.Header().Set("Content-Length", strconv.Itoa(len(pdfBytes)))
		_, _ = w.Write(pdfBytes)
		return
	}

	ruta := filepath.Join(h.carpeta("sistema_exportaciones"), archivo)
	if data, err := os.ReadFile(ruta); err == nil {
		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", archivo))
		w.Header().Set("Content-Length", strconv.Itoa(len(data)))
		_, _ = w.Write(data)
		return
	}

	common.RespondError(w, http.StatusNotFound, "Archivo PDF no encontrado")
}

// 3. Auditoria retrieves audit history from database tables sistema_resets and sistema_exportaciones.
func (h *Handler) Auditoria(w http.ResponseWriter, r *http.Request) {
	if !h.verificarAdmin(r) {
		common.RespondError(w, http.StatusForbidden, "Acceso no autorizado: se requiere token de administrador en X-Admin-Token")
		return
	}

	rowsResets, err := h.db.Query(`
		SELECT id, tipo_reset, COALESCE(motivo, ''), COALESCE(usuario_o_sesion, 'admin'), COALESCE(realizado_en, CURRENT_TIMESTAMP)
		FROM sistema_resets
		ORDER BY id DESC
		LIMIT 50
	`)
	resets := make([]AuditoriaResetItem, 0)
	if err == nil {
		defer rowsResets.Close()
		for rowsResets.Next() {
			var it AuditoriaResetItem
			var realizadoStr string
			_ = rowsResets.Scan(&it.ID, &it.TipoReset, &it.Motivo, &it.UsuarioOSesion, &realizadoStr)
			it.RealizadoEn, _ = time.Parse("2006-01-02 15:04:05", realizadoStr)
			resets = append(resets, it)
		}
	}

	rowsExports, err := h.db.Query(`
		SELECT id, COALESCE(formato, 'PDF'), modulo_origen, COALESCE(referencia_id, 0), COALESCE(titulo, ''), COALESCE(ruta_archivo, ''), COALESCE(created_at, CURRENT_TIMESTAMP)
		FROM sistema_exportaciones
		ORDER BY id DESC
		LIMIT 50
	`)
	exports := make([]AuditoriaExportItem, 0)
	if err == nil {
		defer rowsExports.Close()
		for rowsExports.Next() {
			var it AuditoriaExportItem
			var createdStr string
			_ = rowsExports.Scan(&it.ID, &it.Formato, &it.ModuloOrigen, &it.ReferenciaID, &it.Titulo, &it.RutaArchivo, &createdStr)
			it.CreatedAt, _ = time.Parse("2006-01-02 15:04:05", createdStr)
			exports = append(exports, it)
		}
	}

	common.RespondJSON(w, http.StatusOK, AuditoriaResponse{
		OK:                 true,
		TotalResets:        len(resets),
		TotalExportaciones: len(exports),
		Resets:             resets,
		Exportaciones:      exports,
		ConsultadoEn:       time.Now().UTC(),
	})
}

// 4. ResolverFusion reconciles merge conflicts between conflicting data versions.
func (h *Handler) ResolverFusion(w http.ResponseWriter, r *http.Request) {
	if !h.verificarAdmin(r) {
		common.RespondError(w, http.StatusForbidden, "Acceso no autorizado: se requiere token de administrador en X-Admin-Token")
		return
	}

	var sol SolicitudFusion
	if err := json.NewDecoder(r.Body).Decode(&sol); err != nil {
		common.RespondError(w, http.StatusBadRequest, "Invalid JSON body: "+err.Error())
		return
	}

	estrategia := strings.ToLower(strings.TrimSpace(sol.Estrategia))
	if estrategia == "" {
		estrategia = "source_priority"
	}

	if sol.RegistroBase == nil {
		sol.RegistroBase = make(map[string]any)
	}
	if sol.RegistroEntrante == nil {
		sol.RegistroEntrante = make(map[string]any)
	}

	consolidado := make(map[string]any)
	for k, v := range sol.RegistroBase {
		consolidado[k] = v
	}

	conflictos := make([]ConflictoCampo, 0)

	for k, vEntrante := range sol.RegistroEntrante {
		vBase, existeEnBase := sol.RegistroBase[k]
		if !existeEnBase {
			consolidado[k] = vEntrante
			continue
		}
		if fmt.Sprintf("%v", vBase) == fmt.Sprintf("%v", vEntrante) {
			consolidado[k] = vBase
			continue
		}

		conf := ConflictoCampo{
			Campo:         k,
			ValorBase:     vBase,
			ValorEntrante: vEntrante,
		}

		switch estrategia {
		case "last_write_wins":
			conf.ValorResuelto = vEntrante
			conf.ReglaAplicada = "last_write_wins"
			consolidado[k] = vEntrante
		case "field_merge":
			baseStr := strings.TrimSpace(fmt.Sprintf("%v", vBase))
			if baseStr == "" || baseStr == "<nil>" || baseStr == "0" {
				conf.ValorResuelto = vEntrante
				conf.ReglaAplicada = "field_merge_adoptar"
				consolidado[k] = vEntrante
			} else {
				conf.ValorResuelto = vBase
				conf.ReglaAplicada = "field_merge_conservar"
				consolidado[k] = vBase
			}
		case "manual":
			if sol.SeleccionManual != nil {
				if vManual, okManual := sol.SeleccionManual[k]; okManual {
					conf.ValorResuelto = vManual
					conf.ReglaAplicada = "manual_override"
					consolidado[k] = vManual
				} else {
					conf.ValorResuelto = vBase
					conf.ReglaAplicada = "manual_fallback"
					consolidado[k] = vBase
				}
			} else {
				conf.ValorResuelto = vBase
				conf.ReglaAplicada = "manual_fallback"
				consolidado[k] = vBase
			}
		case "source_priority":
			fallthrough
		default:
			baseStr := strings.TrimSpace(fmt.Sprintf("%v", vBase))
			entStr := strings.TrimSpace(fmt.Sprintf("%v", vEntrante))
			if (baseStr == "" || baseStr == "<nil>") && (entStr != "" && entStr != "<nil>") {
				conf.ValorResuelto = vEntrante
				conf.ReglaAplicada = "source_priority_completar"
				consolidado[k] = vEntrante
			} else {
				conf.ValorResuelto = vBase
				conf.ReglaAplicada = "source_priority_conservar_oficial"
				consolidado[k] = vBase
			}
		}

		conflictos = append(conflictos, conf)
	}

	common.RespondJSON(w, http.StatusOK, ResultadoFusion{
		OK:                  true,
		Timestamp:           time.Now().UTC(),
		EntidadID:           sol.EntidadID,
		TipoEntidad:         sol.TipoEntidad,
		Estrategia:          estrategia,
		Estado:              "RESUELTO",
		TotalConflictos:     len(conflictos),
		Conflictos:          conflictos,
		RegistroConsolidado: consolidado,
		Mensaje:             fmt.Sprintf("Fusión resuelta con éxito bajo estrategia '%s'. %d conflictos conciliados.", estrategia, len(conflictos)),
	})
}

// Status returns table statistics and system operational status with 4 functions active.
func (h *Handler) Status(w http.ResponseWriter, r *http.Request) {
	var totalCandidatos, totalEntidades, totalPerfiles int

	_ = h.db.QueryRow("SELECT count(*) FROM candidatos_candidatos").Scan(&totalCandidatos)
	_ = h.db.QueryRow("SELECT count(*) FROM votantes_entidades").Scan(&totalEntidades)
	_ = h.db.QueryRow("SELECT count(*) FROM votantes_perfiles").Scan(&totalPerfiles)

	res := StatusResponse{
		Status:          "online",
		TotalCandidatos: totalCandidatos,
		TotalEntidades:  totalEntidades,
		TotalPerfiles:   totalPerfiles,
	}
	res.ModuloSistema.ExportarPDF = true
	res.ModuloSistema.AuditoriaBaseDatos = true
	res.ModuloSistema.ResolucionConflictosMerge = true

	common.RespondJSON(w, http.StatusOK, res)
}
