package sistema_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/go-chi/chi/v5"
	_ "modernc.org/sqlite"

	"app/internal/sistema"
)

func setupTestDB(t *testing.T) *sql.DB {
	// Base de datos en memoria para pruebas
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Error abriendo SQLite en memoria: %v", err)
	}

	schema := `
	CREATE TABLE candidatos_candidatos (id_anonimo INTEGER PRIMARY KEY);
	CREATE TABLE votantes_entidades (entidad_id INTEGER PRIMARY KEY);
	CREATE TABLE votantes_perfiles (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre_alias TEXT);
	CREATE TABLE sistema_resets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		tipo_reset TEXT NOT NULL,
		motivo TEXT,
		usuario_o_sesion TEXT,
		realizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE sistema_exportaciones (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		formato TEXT DEFAULT 'PDF',
		modulo_origen TEXT NOT NULL,
		referencia_id INTEGER,
		titulo TEXT,
		ruta_archivo TEXT,
		metadata_json TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("Error aplicando schema de prueba: %v", err)
	}

	// Insertar datos base
	_, _ = db.Exec("INSERT INTO candidatos_candidatos (id_anonimo) VALUES (1), (2), (3)")
	_, _ = db.Exec("INSERT INTO votantes_entidades (entidad_id) VALUES (1), (2)")
	_, _ = db.Exec("INSERT INTO votantes_perfiles (nombre_alias) VALUES ('perfil1'), ('perfil2')")

	return db
}

func setupRouter(db *sql.DB) *chi.Mux {
	r := chi.NewRouter()
	sistema.RegisterRoutes(r, db)
	return r
}

func Test1_ResetApp(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	r := setupRouter(db)

	reqBody, _ := json.Marshal(sistema.ResetRequest{
		TipoReset: "PERFILES",
		Motivo:    "Prueba de reset unitaria",
		Actor:     "juan_test",
	})
	req := httptest.NewRequest(http.MethodPost, "/sistema/reset", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Esperado 200, obtenido %d: %s", rec.Code, rec.Body.String())
	}

	var resp sistema.ResetResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.OK {
		t.Fatalf("Esperado OK = true")
	}
	if resp.RegistrosAfectados != 2 {
		t.Errorf("Esperado 2 perfiles eliminados, obtenido %d", resp.RegistrosAfectados)
	}

	// Verificar registro en tabla sistema_resets
	var count int
	_ = db.QueryRow("SELECT count(*) FROM sistema_resets WHERE tipo_reset = 'PERFILES'").Scan(&count)
	if count != 1 {
		t.Errorf("Se esperaba 1 registro en tabla sistema_resets, encontrado %d", count)
	}
}

func Test2_ExportarPDF(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	r := setupRouter(db)

	reqBody, _ := json.Marshal(sistema.ExportarPDFRequest{
		Modulo:       "candidatos",
		ReferenciaID: 1,
		Titulo:       "Reporte Oficial INE 2024",
		Actor:        "juan_test",
	})
	req := httptest.NewRequest(http.MethodPost, "/sistema/exportar-pdf", bytes.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Esperado 200, obtenido %d: %s", rec.Code, rec.Body.String())
	}

	var resp sistema.ExportarPDFResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.OK {
		t.Fatalf("Esperado OK = true")
	}
	if resp.TamanoBytes < 500 {
		t.Errorf("Tamaño de PDF menor al esperado: %d bytes", resp.TamanoBytes)
	}

	// Verificar descarga directa
	reqDescarga := httptest.NewRequest(http.MethodGet, "/sistema/exportar-pdf/descargar", nil)
	recDescarga := httptest.NewRecorder()
	r.ServeHTTP(recDescarga, reqDescarga)

	if recDescarga.Code != http.StatusOK {
		t.Fatalf("Fallo en descarga directa: %d", recDescarga.Code)
	}
	if !bytes.HasPrefix(recDescarga.Body.Bytes(), []byte("%PDF-1.4")) {
		t.Errorf("El archivo descargado no cuenta con el encabezado %%PDF-1.4")
	}
}

func Test3_AuditoriaBaseDatos(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	r := setupRouter(db)

	// Insertar eventos previos
	_, _ = db.Exec("INSERT INTO sistema_resets (tipo_reset, motivo, usuario_o_sesion) VALUES ('PERFILES', 'Mantenimiento', 'admin')")
	_, _ = db.Exec("INSERT INTO sistema_exportaciones (formato, modulo_origen, titulo, ruta_archivo) VALUES ('PDF', 'candidatos', 'Reporte 1', 'rep.pdf')")

	req := httptest.NewRequest(http.MethodGet, "/sistema/auditoria", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Esperado 200, obtenido %d", rec.Code)
	}

	var resp sistema.AuditoriaResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.OK {
		t.Fatalf("Esperado OK = true")
	}
	if resp.TotalResets < 1 || resp.TotalExportaciones < 1 {
		t.Errorf("Esperado al menos 1 reset y 1 exportación en auditoría")
	}
}

func Test4_ResolucionConflictosFusion(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	r := setupRouter(db)

	sol := sistema.SolicitudFusion{
		EntidadID:   "CAND-0884",
		TipoEntidad: "candidato",
		Estrategia:  "source_priority",
		RegistroBase: map[string]any{
			"nombre":   "Candidato INE Oficial",
			"telefono": "",
		},
		RegistroEntrante: map[string]any{
			"nombre":   "Nombre Modificado",
			"telefono": "555-1234",
		},
	}
	b, _ := json.Marshal(sol)

	req := httptest.NewRequest(http.MethodPost, "/sistema/fusion/resolver", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Esperado 200, obtenido %d: %s", rec.Code, rec.Body.String())
	}

	var resp sistema.ResultadoFusion
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.OK {
		t.Fatalf("Esperado OK = true")
	}
	if resp.RegistroConsolidado["nombre"] != "Candidato INE Oficial" {
		t.Errorf("Esperado 'Candidato INE Oficial', obtenido %v", resp.RegistroConsolidado["nombre"])
	}
	if resp.RegistroConsolidado["telefono"] != "555-1234" {
		t.Errorf("Esperado teléfono completado '555-1234', obtenido %v", resp.RegistroConsolidado["telefono"])
	}
}

func Test5_StatusSistema(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()
	r := setupRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/sistema/status", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Esperado 200, obtenido %d", rec.Code)
	}

	var resp sistema.StatusResponse
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.ModuloSistema.ResetInfoApp ||
		!resp.ModuloSistema.ExportarPDF ||
		!resp.ModuloSistema.AuditoriaBaseDatos ||
		!resp.ModuloSistema.ResolucionConflictosMerge {
		t.Errorf("Las 4 funciones del módulo deben estar marcadas como activas en status")
	}
}

func init() {
	// Asegurar directorio temporal de exportaciones en pruebas
	_ = os.MkdirAll(filepath.Join("..", "..", "sistema_exportaciones"), 0755)
	_ = os.MkdirAll(filepath.Join("..", "..", "sistema_resets"), 0755)
}
