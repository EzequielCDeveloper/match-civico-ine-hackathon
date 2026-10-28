package votantes_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	_ "modernc.org/sqlite"

	"app/internal/votantes"
)

func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Error abriendo SQLite en memoria: %v", err)
	}

	schema := `
	CREATE TABLE votantes_entidades (
		entidad_id INTEGER PRIMARY KEY,
		entidad TEXT NOT NULL UNIQUE,
		total_distritos INTEGER,
		lista_nominal INTEGER,
		votos_totales INTEGER,
		participacion_general_pct REAL,
		abstencionismo_general_pct REAL,
		participacion_joven_pct REAL,
		abstencionismo_joven_pct REAL,
		brecha_abstencionismo_joven_vs_general_pts REAL
	);

	CREATE TABLE votantes_distritos (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		entidad_id INTEGER NOT NULL,
		entidad TEXT NOT NULL,
		distrito_id INTEGER NOT NULL,
		distrito_nombre TEXT NOT NULL,
		lista_nominal INTEGER,
		votos_totales INTEGER,
		participacion_general_pct REAL,
		abstencionismo_general_pct REAL,
		participacion_joven_pct REAL,
		abstencionismo_joven_pct REAL,
		desglose_sexo_joven_json TEXT
	);

	CREATE TABLE votantes_perfiles (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		nombre_alias TEXT,
		edad INTEGER NOT NULL,
		sexo TEXT,
		entidad_id INTEGER NOT NULL,
		distrito_id INTEGER DEFAULT 0,
		escolaridad TEXT,
		prioridad_tema TEXT,
		datos_extra_json TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("Error aplicando schema de prueba: %v", err)
	}

	// Inserción de datos de prueba
	_, _ = db.Exec(`
		INSERT INTO votantes_entidades (
			entidad_id, entidad, total_distritos, lista_nominal, votos_totales,
			participacion_general_pct, abstencionismo_general_pct,
			participacion_joven_pct, abstencionismo_joven_pct,
			brecha_abstencionismo_joven_vs_general_pts
		) VALUES (9, 'CIUDAD DE MEXICO', 22, 7933397, 5393166, 67.98, 32.02, 59.79, 40.21, 8.19)
	`)

	_, _ = db.Exec(`
		INSERT INTO votantes_distritos (
			entidad_id, entidad, distrito_id, distrito_nombre, lista_nominal, votos_totales,
			participacion_general_pct, abstencionismo_general_pct,
			participacion_joven_pct, abstencionismo_joven_pct,
			desglose_sexo_joven_json
		) VALUES (
			9, 'CIUDAD DE MEXICO', 1, 'GUSTAVO A MADERO', 340000, 230000,
			67.65, 32.35, 58.50, 41.50,
			'{"hombres":{"participacion_pct":52.1,"abstencionismo_pct":47.9},"mujeres":{"participacion_pct":64.2,"abstencionismo_pct":35.8}}'
		)
	`)

	return db
}

func setupRouter(db *sql.DB) *chi.Mux {
	r := chi.NewRouter()
	r.Route("/api/v1", func(api chi.Router) {
		votantes.RegisterRoutes(api, db)
	})
	return r
}

func TestListEntidades(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/votantes/entidades", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Esperaba status 200, obtuvo %d", rr.Code)
	}

	var res map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatalf("Error deserializando JSON: %v", err)
	}

	total := int(res["total"].(float64))
	if total != 1 {
		t.Errorf("Esperaba 1 entidad en total, obtuvo %d", total)
	}
}

func TestGetEntidadByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/votantes/entidades/9", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Esperaba status 200, obtuvo %d", rr.Code)
	}

	var res map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatalf("Error deserializando JSON: %v", err)
	}

	distritos := res["distritos"].([]any)
	if len(distritos) != 1 {
		t.Errorf("Esperaba 1 distrito, obtuvo %d", len(distritos))
	}
}

func TestGetEntidadByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/votantes/entidades/99", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("Esperaba status 404, obtuvo %d", rr.Code)
	}
}

func TestCalcularPerfil_JovenConDistritoYSexo(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	payload := map[string]any{
		"nombre_alias": "Ezequiel",
		"edad":         22,
		"sexo":         "Mujer",
		"entidad_id":   9,
		"distrito_id":  1,
		"escolaridad":  "Licenciatura",
		"temas":        []string{"eje_educacion", "eje_seguridad"},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/votantes/perfil", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Esperaba status 200, obtuvo %d: %s", rr.Code, rr.Body.String())
	}

	var res votantes.PerfilVotanteResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &res); err != nil {
		t.Fatalf("Error deserializando respuesta: %v", err)
	}

	if !res.EsJoven {
		t.Errorf("Esperaba EsJoven=true para edad 22")
	}
	if res.DistritoNombre != "GUSTAVO A MADERO" {
		t.Errorf("Esperaba distrito GUSTAVO A MADERO, obtuvo %s", res.DistritoNombre)
	}
	if res.ParticipacionGeneroPct == nil || *res.ParticipacionGeneroPct != 64.2 {
		t.Errorf("Esperaba participacion por género de 64.2, obtuvo %v", res.ParticipacionGeneroPct)
	}

	// Verificar inserción en votantes_perfiles
	var count int
	_ = db.QueryRow("SELECT count(*) FROM votantes_perfiles WHERE nombre_alias = 'Ezequiel'").Scan(&count)
	if count != 1 {
		t.Errorf("Esperaba 1 perfil guardado en base de datos, obtuvo %d", count)
	}
}

func TestCalcularPerfil_MenorDeEdad(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	router := setupRouter(db)

	payload := map[string]any{
		"nombre_alias": "Menor",
		"edad":         16,
		"entidad_id":   9,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/votantes/perfil", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("Esperaba status 400 Bad Request para menor de edad, obtuvo %d", rr.Code)
	}
}
