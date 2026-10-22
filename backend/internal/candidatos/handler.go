package candidatos

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"app/internal/common"
)

type Handler struct {
	db *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{db: db}
}

// List handles candidate filtering and listing with pagination.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	cargo := strings.TrimSpace(q.Get("cargo"))
	entidad := strings.TrimSpace(q.Get("entidad"))
	escolaridad := strings.TrimSpace(q.Get("escolaridad"))
	tituloParam := strings.TrimSpace(q.Get("tiene_titulo"))
	search := strings.TrimSpace(q.Get("q"))

	limit := 50
	if lStr := q.Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 500 {
			limit = l
		}
	}

	offset := 0
	if oStr := q.Get("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil && o >= 0 {
			offset = o
		}
	}

	var conditions []string
	var args []any

	if cargo != "" {
		conditions = append(conditions, "cargo LIKE ?")
		args = append(args, "%"+cargo+"%")
	}
	if entidad != "" {
		conditions = append(conditions, "entidad = ?")
		args = append(args, entidad)
	}
	if escolaridad != "" {
		conditions = append(conditions, "escolaridad = ?")
		args = append(args, escolaridad)
	}
	if tituloParam != "" {
		tieneTitulo := tituloParam == "1" || strings.ToLower(tituloParam) == "true"
		conditions = append(conditions, "tiene_titulo = ?")
		if tieneTitulo {
			args = append(args, 1)
		} else {
			args = append(args, 0)
		}
	}
	if search != "" {
		conditions = append(conditions, "(nombre_candidato LIKE ? OR partido_coalicion LIKE ? OR propuesta_1 LIKE ? OR propuesta_2 LIKE ?)")
		p := "%" + search + "%"
		args = append(args, p, p, p, p)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total matching
	var total int
	countQuery := "SELECT count(*) FROM candidatos_candidatos " + whereClause
	if err := h.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error counting candidates: "+err.Error())
		return
	}

	// Fetch items
	selectQuery := `
		SELECT
			id_anonimo, nombre_candidato, partido_coalicion, cargo, entidad,
			distrito_id, distrito_nombre, distrito_federal, circunscripcion,
			municipio, num_lista_o_formula, tipo_candidato, estatus, edad, sexo,
			escolaridad, estatus_escolaridad, tiene_titulo, estudios, cursos,
			historia_profesional, trayectoria_politica, motivo_cargo_publico,
			propuesta_1, propuesta_2, propuesta_genero, tiene_propuestas
		FROM candidatos_candidatos
		` + whereClause + `
		ORDER BY id_anonimo ASC
		LIMIT ? OFFSET ?
	`
	queryArgs := append(args, limit, offset)
	rows, err := h.db.Query(selectQuery, queryArgs...)
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error querying candidates: "+err.Error())
		return
	}
	defer rows.Close()

	items := make([]Candidato, 0, limit)
	for rows.Next() {
		var c Candidato
		var tieneTituloInt, tienePropuestasInt int

		err := rows.Scan(
			&c.IDAnonimo, &c.NombreCandidato, &c.PartidoCoalicion, &c.Cargo, &c.Entidad,
			&c.DistritoID, &c.DistritoNombre, &c.DistritoFederal, &c.Circunscripcion,
			&c.Municipio, &c.NumListaOFormula, &c.TipoCandidato, &c.Estatus, &c.Edad, &c.Sexo,
			&c.Escolaridad, &c.EstatusEscolaridad, &tieneTituloInt, &c.Estudios, &c.Cursos,
			&c.HistoriaProfesional, &c.TrayectoriaPolitica, &c.MotivoCargoPublico,
			&c.Propuesta1, &c.Propuesta2, &c.PropuestaGenero, &tienePropuestasInt,
		)
		if err != nil {
			common.RespondError(w, http.StatusInternalServerError, "Error scanning candidate: "+err.Error())
			return
		}
		c.TieneTitulo = (tieneTituloInt == 1)
		c.TienePropuestas = (tienePropuestasInt == 1)
		items = append(items, c)
	}

	common.RespondJSON(w, http.StatusOK, CandidatoListResponse{
		Total: total,
		Items: items,
	})
}

// GetByID handles retrieving a single candidate by ID.
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.RespondError(w, http.StatusBadRequest, "Invalid candidate ID")
		return
	}

	query := `
		SELECT
			id_anonimo, nombre_candidato, partido_coalicion, cargo, entidad,
			distrito_id, distrito_nombre, distrito_federal, circunscripcion,
			municipio, num_lista_o_formula, tipo_candidato, estatus, edad, sexo,
			escolaridad, estatus_escolaridad, tiene_titulo, estudios, cursos,
			historia_profesional, trayectoria_politica, motivo_cargo_publico,
			propuesta_1, propuesta_2, propuesta_genero, tiene_propuestas
		FROM candidatos_candidatos
		WHERE id_anonimo = ?
	`

	var c Candidato
	var tieneTituloInt, tienePropuestasInt int

	err = h.db.QueryRow(query, id).Scan(
		&c.IDAnonimo, &c.NombreCandidato, &c.PartidoCoalicion, &c.Cargo, &c.Entidad,
		&c.DistritoID, &c.DistritoNombre, &c.DistritoFederal, &c.Circunscripcion,
		&c.Municipio, &c.NumListaOFormula, &c.TipoCandidato, &c.Estatus, &c.Edad, &c.Sexo,
		&c.Escolaridad, &c.EstatusEscolaridad, &tieneTituloInt, &c.Estudios, &c.Cursos,
		&c.HistoriaProfesional, &c.TrayectoriaPolitica, &c.MotivoCargoPublico,
		&c.Propuesta1, &c.Propuesta2, &c.PropuestaGenero, &tienePropuestasInt,
	)

	if err == sql.ErrNoRows {
		common.RespondError(w, http.StatusNotFound, "Candidate not found")
		return
	}
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error retrieving candidate: "+err.Error())
		return
	}

	c.TieneTitulo = (tieneTituloInt == 1)
	c.TienePropuestas = (tienePropuestasInt == 1)

	common.RespondJSON(w, http.StatusOK, c)
}

// ParaMatch returns proposal-bearing owners in one state, with eje weights.
// The client uses the weights to choose the next blind card. Names stay in the
// payload so the summary can reveal them after the swipes; the card must not show them.
func (h *Handler) ParaMatch(w http.ResponseWriter, r *http.Request) {
	entidad := normalizarEntidad(r.URL.Query().Get("entidad"))
	if entidad == "" {
		common.RespondError(w, http.StatusBadRequest, "Falta la entidad")
		return
	}

	rows, err := h.db.Query(`
		SELECT id_anonimo, nombre_candidato, partido_coalicion, cargo, propuesta_1, propuesta_2
		FROM candidatos_candidatos
		WHERE tipo_candidato = 'Persona Propietaria'
		  AND tiene_propuestas = 1
		  AND entidad = ?
		ORDER BY id_anonimo
	`, entidad)
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error querying candidates: "+err.Error())
		return
	}
	defer rows.Close()

	items := make([]*MatchCandidato, 0)
	byID := map[int]*MatchCandidato{}
	for rows.Next() {
		c := &MatchCandidato{Etiquetas: map[string]float64{}}
		if err := rows.Scan(&c.IDAnonimo, &c.NombreCandidato, &c.PartidoCoalicion, &c.Cargo, &c.Propuesta1, &c.Propuesta2); err != nil {
			common.RespondError(w, http.StatusInternalServerError, "Error scanning candidate: "+err.Error())
			return
		}
		items = append(items, c)
		byID[c.IDAnonimo] = c
	}
	if err := rows.Err(); err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error reading candidates: "+err.Error())
		return
	}

	tagRows, err := h.db.Query(`
		SELECT e.id_anonimo, e.etiqueta, e.peso
		FROM candidatos_etiquetas e
		JOIN candidatos_candidatos c ON c.id_anonimo = e.id_anonimo
		WHERE c.tipo_candidato = 'Persona Propietaria'
		  AND c.tiene_propuestas = 1
		  AND c.entidad = ?
		  AND e.etiqueta LIKE 'eje_%'
	`, entidad)
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error querying labels: "+err.Error())
		return
	}
	defer tagRows.Close()

	for tagRows.Next() {
		var id int
		var etiqueta string
		var peso float64
		if err := tagRows.Scan(&id, &etiqueta, &peso); err != nil {
			common.RespondError(w, http.StatusInternalServerError, "Error scanning label: "+err.Error())
			return
		}
		if c, ok := byID[id]; ok {
			c.Etiquetas[etiqueta] = peso
		}
	}

	common.RespondJSON(w, http.StatusOK, map[string]any{
		"entidad": entidad,
		"total":   len(items),
		"items":   items,
	})
}

func normalizarEntidad(s string) string {
	s = strings.ToUpper(strings.TrimSpace(s))
	s = strings.NewReplacer(
		"Á", "A", "É", "E", "Í", "I", "Ó", "O", "Ú", "U", "Ü", "U", "Ñ", "N",
	).Replace(s)
	return strings.Join(strings.Fields(s), " ")
}
