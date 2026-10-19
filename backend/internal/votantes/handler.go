package votantes

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"app/internal/common"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

// ListEntidades retrieves the civic voter participation metrics across all states.
func (h *Handler) ListEntidades(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT
			entidad_id, entidad, total_distritos, lista_nominal, votos_totales,
			participacion_general_pct, abstencionismo_general_pct,
			participacion_joven_pct, abstencionismo_joven_pct,
			brecha_abstencionismo_joven_vs_general_pts
		FROM votantes_entidades
		ORDER BY entidad_id ASC
	`
	rows, err := h.db.Query(query)
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error querying entities: "+err.Error())
		return
	}
	defer rows.Close()

	items := make([]EntidadVotante, 0, 32)
	for rows.Next() {
		var e EntidadVotante
		if err := rows.Scan(
			&e.EntidadID, &e.Entidad, &e.TotalDistritos, &e.ListaNominal, &e.VotosTotales,
			&e.ParticipacionGeneralPct, &e.AbstencionismoGeneralPct,
			&e.ParticipacionJovenPct, &e.AbstencionismoJovenPct,
			&e.BrechaAbstencionismoJovenVsGeneralPts,
		); err != nil {
			common.RespondError(w, http.StatusInternalServerError, "Error scanning entity: "+err.Error())
			return
		}
		items = append(items, e)
	}

	common.RespondJSON(w, http.StatusOK, map[string]any{
		"total": len(items),
		"items": items,
	})
}

// GetEntidadByID retrieves an entity and its federal electoral districts.
func (h *Handler) GetEntidadByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.RespondError(w, http.StatusBadRequest, "Invalid entity ID")
		return
	}

	var e EntidadVotante
	queryEntidad := `
		SELECT
			entidad_id, entidad, total_distritos, lista_nominal, votos_totales,
			participacion_general_pct, abstencionismo_general_pct,
			participacion_joven_pct, abstencionismo_joven_pct,
			brecha_abstencionismo_joven_vs_general_pts
		FROM votantes_entidades
		WHERE entidad_id = ?
	`
	err = h.db.QueryRow(queryEntidad, id).Scan(
		&e.EntidadID, &e.Entidad, &e.TotalDistritos, &e.ListaNominal, &e.VotosTotales,
		&e.ParticipacionGeneralPct, &e.AbstencionismoGeneralPct,
		&e.ParticipacionJovenPct, &e.AbstencionismoJovenPct,
		&e.BrechaAbstencionismoJovenVsGeneralPts,
	)
	if err == sql.ErrNoRows {
		common.RespondError(w, http.StatusNotFound, "Entity not found")
		return
	}
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error querying entity: "+err.Error())
		return
	}

	// Fetch districts
	queryDistritos := `
		SELECT id, entidad_id, entidad, distrito_id, distrito_nombre, lista_nominal, votos_totales,
		       participacion_general_pct, abstencionismo_general_pct, participacion_joven_pct, abstencionismo_joven_pct
		FROM votantes_distritos
		WHERE entidad_id = ?
		ORDER BY distrito_id ASC
	`
	rows, err := h.db.Query(queryDistritos, id)
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error querying districts: "+err.Error())
		return
	}
	defer rows.Close()

	distritos := make([]DistritoVotante, 0)
	for rows.Next() {
		var d DistritoVotante
		if err := rows.Scan(
			&d.ID, &d.EntidadID, &d.Entidad, &d.DistritoID, &d.DistritoNombre,
			&d.ListaNominal, &d.VotosTotales, &d.ParticipacionGeneralPct,
			&d.AbstencionismoGeneralPct, &d.ParticipacionJovenPct, &d.AbstencionismoJovenPct,
		); err == nil {
			distritos = append(distritos, d)
		}
	}

	common.RespondJSON(w, http.StatusOK, map[string]any{
		"entidad":   e,
		"distritos": distritos,
	})
}

// CalcularPerfil saves voter profile and calculates matching participation percentage.
func (h *Handler) CalcularPerfil(w http.ResponseWriter, r *http.Request) {
	var req PerfilVotanteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(w, http.StatusBadRequest, "Invalid JSON request payload")
		return
	}

	if req.Edad < 18 {
		common.RespondError(w, http.StatusBadRequest, "La edad del votante debe ser al menos 18 años")
		return
	}

	// Lookup entity
	var entidadNombre string
	var partGen, abstGen, partJov, abstJov float64
	err := h.db.QueryRow(`
		SELECT entidad, participacion_general_pct, abstencionismo_general_pct,
		       participacion_joven_pct, abstencionismo_joven_pct
		FROM votantes_entidades
		WHERE entidad_id = ?
	`, req.EntidadID).Scan(&entidadNombre, &partGen, &abstGen, &partJov, &abstJov)

	if err == sql.ErrNoRows {
		common.RespondError(w, http.StatusBadRequest, "Entidad ID no encontrada")
		return
	}
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error buscando entidad: "+err.Error())
		return
	}

	// Save profile to database
	res, err := h.db.Exec(`
		INSERT INTO votantes_perfiles (nombre_alias, edad, sexo, entidad_id, distrito_id, escolaridad, prioridad_tema)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, req.NombreAlias, req.Edad, req.Sexo, req.EntidadID, req.DistritoID, req.Escolaridad, req.PrioridadTema)

	var perfilID int64
	if err == nil {
		perfilID, _ = res.LastInsertId()
	}

	esJoven := (req.Edad >= 18 && req.Edad <= 29)
	var partEsperada, abstEsperado float64
	var mensaje string

	if esJoven {
		partEsperada = partJov
		abstEsperado = abstJov
		mensaje = fmt.Sprintf("Como votante joven (18-29 años) en %s, tu grupo demográfico tuvo una participación del %.2f%% y un abstencionismo del %.2f%% en las elecciones federales 2024.", entidadNombre, partEsperada, abstEsperado)
	} else {
		partEsperada = partGen
		abstEsperado = abstGen
		mensaje = fmt.Sprintf("En %s, el promedio general de votación fue de %.2f%% con un abstencionismo de %.2f%%.", entidadNombre, partEsperada, abstEsperado)
	}

	resp := PerfilVotanteResponse{
		PerfilID:                  perfilID,
		NombreAlias:               req.NombreAlias,
		Edad:                      req.Edad,
		EsJoven:                   esJoven,
		EntidadID:                 req.EntidadID,
		Entidad:                   entidadNombre,
		DistritoID:                req.DistritoID,
		ParticipacionEsperadaPct:  partEsperada,
		AbstencionismoEsperadoPct: abstEsperado,
		MensajeParticipacion:      mensaje,
	}

	common.RespondJSON(w, http.StatusOK, resp)
}
