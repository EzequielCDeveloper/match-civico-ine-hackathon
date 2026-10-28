package candidatos_test

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/go-chi/chi/v5"
	_ "modernc.org/sqlite"

	"app/internal/candidatos"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Error abriendo SQLite en memoria: %v", err)
	}

	schema := `
	CREATE TABLE candidatos_candidatos (
		id_anonimo INTEGER PRIMARY KEY,
		nombre_candidato TEXT NOT NULL,
		partido_coalicion TEXT,
		cargo TEXT NOT NULL,
		entidad TEXT NOT NULL,
		distrito_id INTEGER,
		distrito_nombre TEXT,
		distrito_federal TEXT,
		circunscripcion TEXT,
		municipio TEXT,
		num_lista_o_formula TEXT,
		tipo_candidato TEXT,
		estatus TEXT,
		edad INTEGER,
		sexo TEXT,
		escolaridad TEXT,
		estatus_escolaridad TEXT,
		tiene_titulo INTEGER,
		estudios TEXT,
		cursos TEXT,
		historia_profesional TEXT,
		trayectoria_politica TEXT,
		motivo_cargo_publico TEXT,
		propuesta_1 TEXT,
		propuesta_2 TEXT,
		propuesta_genero TEXT,
		tiene_propuestas INTEGER
	);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("Error aplicando schema de prueba: %v", err)
	}

	// Inserción de candidatos de prueba
	_, _ = db.Exec(`
		INSERT INTO candidatos_candidatos (
			id_anonimo, nombre_candidato, partido_coalicion, cargo, entidad,
			distrito_id, distrito_nombre, distrito_federal, circunscripcion,
			municipio, num_lista_o_formula, tipo_candidato, estatus, edad, sexo,
			escolaridad, estatus_escolaridad, tiene_titulo, estudios, cursos,
			historia_profesional, trayectoria_politica, motivo_cargo_publico,
			propuesta_1, propuesta_2, propuesta_genero, tiene_propuestas
		) VALUES
		(1, 'CANDIDATO UNO', 'PARTIDO AZUL', 'DIPUTACION FEDERAL MR', 'CIUDAD DE MEXICO', 1, 'GAM', '1-GAM', '4', 'GAM', '1', 'Propietario', 'Activo', 45, 'Hombre', 'Licenciatura', 'Titulo', 1, 'Derecho', '', '', '', '', 'Propuesta seguridad', 'Propuesta salud', '', 1),
		(2, 'CANDIDATO DOS', 'PARTIDO ROJO', 'SENADURIA MR', 'JALISCO', 0, 'No aplica', 'No aplica', '1', 'Guadalajara', '1', 'Propietario', 'Activo', 52, 'Mujer', 'Maestria', 'Titulo', 1, 'Economia', '', '', '', '', 'Propuesta empleo', '', '', 1),
		(3, 'CANDIDATO TRES', 'INDEPENDIENTE', 'PRESIDENCIA', 'NACIONAL', 0, 'No aplica', 'No aplica', '0', 'Nacional', '1', 'Propietario', 'Activo', 60, 'Hombre', 'Doctorado', 'Titulo', 1, 'Ciencia Politica', '', '', '', '', '', '', '', 0);
	`)

	return db
}

func setupRouter(db *sql.DB) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/v1", func(api chi.Router) {
		candidatos.RegisterRoutes(api, db)
	})
	return r
}

func TestListCandidatos_FiltroEntidad(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/candidatos?entidad=CIUDAD%20DE%20MEXICO", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Esperaba status 200, obtuvo %d", rr.Code)
	}

	var res candidatos.CandidatoListResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatalf("Error deserializando JSON: %v", err)
	}

	if res.Total != 1 {
		t.Errorf("Esperaba 1 candidato en CDMX, obtuvo %d", res.Total)
	}
}

func TestListCandidatos_SQLInjection(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	// Intento de inyección SQL clásica para extraer todos o tirar tabla
	injectionPayloads := []string{
		"/api/v1/candidatos?q=" + url.QueryEscape("' OR '1'='1"),
		"/api/v1/candidatos?cargo=" + url.QueryEscape("'; DROP TABLE candidatos_candidatos;--"),
		"/api/v1/candidatos?entidad=" + url.QueryEscape("' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27--"),
	}

	for _, uri := range injectionPayloads {
		req := httptest.NewRequest(http.MethodGet, uri, nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("URI %s falló con código %d en lugar de sanitizar la consulta", uri, rr.Code)
		}

		var res candidatos.CandidatoListResponse
		_ = json.Unmarshal(rr.Body.Bytes(), &res)
		// Las inyecciones no deben retornar datos no filtrados
		if res.Total > 3 {
			t.Errorf("Posible bypass SQLi en %s: retornó %d candidatos", uri, res.Total)
		}
	}

	// Verificar que la tabla no fue borrada
	var count int
	if err := db.QueryRow("SELECT count(*) FROM candidatos_candidatos").Scan(&count); err != nil || count != 3 {
		t.Fatalf("Falla crítica: la tabla candidatos_candidatos fue alterada por inyección SQL!")
	}
}

func TestListCandidatos_LimitOverflow(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	// Intento de DoS solicitando 999999999 registros
	req := httptest.NewRequest(http.MethodGet, "/api/v1/candidatos?limit=999999999", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Esperaba status 200 con límite acotado, obtuvo %d", rr.Code)
	}
}

func TestGetCandidatoByID_Valido(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/candidatos/1", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Esperaba status 200, obtuvo %d", rr.Code)
	}

	var c candidatos.Candidato
	if err := json.Unmarshal(rr.Body.Bytes(), &c); err != nil {
		t.Fatalf("Error deserializando candidato: %v", err)
	}
	if c.NombreCandidato != "CANDIDATO UNO" {
		t.Errorf("Esperaba CANDIDATO UNO, obtuvo %s", c.NombreCandidato)
	}
}

func TestGetCandidatoByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/candidatos/999", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("Esperaba status 404 para ID inexistente, obtuvo %d", rr.Code)
	}
}

func TestGetCandidatoByID_InvalidID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/candidatos/invalido", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("Esperaba status 400 para ID no numérico, obtuvo %d", rr.Code)
	}
}
