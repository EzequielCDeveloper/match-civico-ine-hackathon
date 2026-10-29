package candidatos

import (
	"database/sql"
	"net/http"
	"os"
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

// Boleta returns one ballot: the owners the voter can actually choose among,
// each proposal labeled on its own, and the pairwise text similarity when it exists.
func (h *Handler) Boleta(w http.ResponseWriter, r *http.Request) {
	entidad := normalizarEntidad(r.URL.Query().Get("entidad"))
	cargoClave := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("cargo")))
	distrito, _ := strconv.Atoi(r.URL.Query().Get("distrito"))

	cargos := map[string]string{
		"DIPUTACION_MR": "DIPUTACIÓN FEDERAL MR",
		"SENADO_MR":     "SENADURÍA FEDERAL MR",
		"PRESIDENCIA":   "PRESIDENCIA DE LA REPÚBLICA",
	}
	cargo, ok := cargos[cargoClave]
	if !ok {
		common.RespondError(w, http.StatusBadRequest, "Cargo no válido")
		return
	}

	query := `
		SELECT id_anonimo, nombre_candidato, COALESCE(partido_coalicion, ''), COALESCE(escolaridad, ''), COALESCE(trayectoria_politica, ''),
		       COALESCE(NULLIF(propuesta_1_corta, ''), NULLIF(propuesta_1, ''), ''),
		       COALESCE(NULLIF(propuesta_2_corta, ''), NULLIF(propuesta_2, ''), ''),
		       COALESCE(NULLIF(propuesta_genero_corta, ''), NULLIF(propuesta_genero, ''), '')
		FROM candidatos_candidatos
		WHERE tipo_candidato = 'Persona Propietaria' AND cargo = ?`
	args := []any{cargo}
	if cargoClave == "DIPUTACION_MR" {
		query += " AND entidad = ? AND distrito_id = ?"
		args = append(args, entidad, distrito)
	} else if cargoClave == "SENADO_MR" {
		query += " AND entidad = ?"
		args = append(args, entidad)
	}
	query += " ORDER BY id_anonimo"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		common.RespondError(w, http.StatusInternalServerError, "Error querying ballot: "+err.Error())
		return
	}
	defer rows.Close()

	type persona struct {
		ID           int
		Nombre       string
		Partido      string
		Escolaridad  string
		Trayectoria  string
		Textos       [3]string
	}
	var gente []persona
	for rows.Next() {
		var p persona
		if err := rows.Scan(&p.ID, &p.Nombre, &p.Partido, &p.Escolaridad, &p.Trayectoria, &p.Textos[0], &p.Textos[1], &p.Textos[2]); err != nil {
			common.RespondError(w, http.StatusInternalServerError, "Error scanning ballot: "+err.Error())
			return
		}
		gente = append(gente, p)
	}

	type propuestaJSON struct {
		ID         string             `json:"id"`
		IDAnonimo  int                `json:"id_anonimo"`
		Texto      string             `json:"texto"`
		Etiquetas  map[string]float64 `json:"etiquetas"`
	}
	propuestas := []propuestaJSON{}
	ids := make([]any, 0, len(gente))
	for _, p := range gente {
		ids = append(ids, p.ID)
		for n, texto := range p.Textos {
			t := strings.TrimSpace(texto)
			if t == "" || strings.EqualFold(t, "sin captura") || strings.EqualFold(t, "sin dato") || strings.EqualFold(t, "no aplica") {
				continue
			}
			propuestas = append(propuestas, propuestaJSON{
				ID: fmtID(p.ID, n+1), IDAnonimo: p.ID, Texto: t, Etiquetas: map[string]float64{},
			})
		}
	}
	porID := map[string]*propuestaJSON{}
	for i := range propuestas {
		porID[propuestas[i].ID] = &propuestas[i]
	}

	if len(ids) > 0 {
		marcas := strings.TrimRight(strings.Repeat("?,", len(ids)), ",")
		tagRows, tagErr := h.db.Query(`
			SELECT id_anonimo, propuesta, etiqueta, peso
			FROM candidatos_propuesta_etiquetas
			WHERE id_anonimo IN (`+marcas+`)`, ids...)
		if tagErr == nil {
			defer tagRows.Close()
			for tagRows.Next() {
				var id, numero int
				var etiqueta string
				var peso float64
				if err := tagRows.Scan(&id, &numero, &etiqueta, &peso); err != nil {
					continue
				}
				if p, existe := porID[fmtID(id, numero)]; existe {
					p.Etiquetas[etiqueta] = peso
				}
			}
		}
	}

	type candidatoJSON struct {
		IDAnonimo        int     `json:"id_anonimo"`
		Nombre           string  `json:"nombre_candidato"`
		Partido          string  `json:"partido_coalicion"`
		Escolaridad      string  `json:"escolaridad"`
		Trayectoria      string  `json:"trayectoria_politica"`
		Concrecion       float64 `json:"concrecion"`
		CompetenciaCargo float64 `json:"competencia_cargo"`
	}
	candidatos := []candidatoJSON{}
	sin := []map[string]string{}
	for _, p := range gente {
		var concrecion, competencia float64
		var nConcrecion, nCompetencia int
		tiene := false
		for _, prop := range propuestas {
			if prop.IDAnonimo != p.ID {
				continue
			}
			tiene = true
			if v, ok := prop.Etiquetas["concrecion"]; ok {
				concrecion += v
				nConcrecion++
			}
			if v, ok := prop.Etiquetas["competencia_cargo"]; ok {
				competencia += v
				nCompetencia++
			}
		}
		if !tiene {
			sin = append(sin, map[string]string{"nombre_candidato": p.Nombre, "partido_coalicion": p.Partido})
			continue
		}
		if nConcrecion > 0 {
			concrecion /= float64(nConcrecion)
		}
		if nCompetencia > 0 {
			competencia /= float64(nCompetencia)
		}
		trayectoria := p.Trayectoria
		if len([]rune(trayectoria)) > 400 {
			trayectoria = string([]rune(trayectoria)[:400]) + "…"
		}
		candidatos = append(candidatos, candidatoJSON{
			IDAnonimo: p.ID, Nombre: p.Nombre, Partido: p.Partido, Escolaridad: p.Escolaridad,
			Trayectoria: trayectoria, Concrecion: concrecion, CompetenciaCargo: competencia,
		})
	}

	idsPropuesta := make([]string, 0, len(propuestas))
	for _, propuesta := range propuestas {
		idsPropuesta = append(idsPropuesta, propuesta.ID)
	}
	common.RespondJSON(w, http.StatusOK, map[string]any{
		"cargo":          cargo,
		"candidatos":     candidatos,
		"propuestas":     propuestas,
		"similitud":      similitudes(idsPropuesta),
		"sin_propuestas": sin,
	})
}

func fmtID(id, propuesta int) string {
	return strconv.Itoa(id) + "-" + strconv.Itoa(propuesta)
}

func similitudes(ids []string) map[string]map[string]float64 {
	salida := map[string]map[string]float64{}
	if len(ids) == 0 {
		return salida
	}
	rutas := []string{"../db/similitud.db", "db/similitud.db", "data/similitud.db"}
	var ruta string
	for _, candidata := range rutas {
		if _, err := os.Stat(candidata); err == nil {
			ruta = candidata
			break
		}
	}
	if ruta == "" {
		return salida
	}
	sim, err := sql.Open("sqlite", "file:"+ruta+"?mode=ro")
	if err != nil {
		return salida
	}
	defer sim.Close()
	marcas := strings.TrimRight(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, 0, len(ids)*2)
	for _, id := range ids {
		args = append(args, id)
	}
	for _, id := range ids {
		args = append(args, id)
	}
	rows, err := sim.Query(`SELECT a, b, similitud FROM pares WHERE a IN (`+marcas+`) AND b IN (`+marcas+`)`, args...)
	if err != nil {
		return salida
	}
	defer rows.Close()
	for rows.Next() {
		var a, b string
		var valor float64
		if err := rows.Scan(&a, &b, &valor); err != nil {
			continue
		}
		if salida[a] == nil {
			salida[a] = map[string]float64{}
		}
		if salida[b] == nil {
			salida[b] = map[string]float64{}
		}
		salida[a][b] = valor
		salida[b][a] = valor
	}
	return salida
}

func normalizarEntidad(s string) string {
	s = strings.ToUpper(strings.TrimSpace(s))
	s = strings.NewReplacer(
		"Á", "A", "É", "E", "Í", "I", "Ó", "O", "Ú", "U", "Ü", "U", "Ñ", "N",
	).Replace(s)
	return strings.Join(strings.Fields(s), " ")
}
