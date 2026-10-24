package sistema

import "time"

// ResetRequest defines payload for clearing application or session state.
type ResetRequest struct {
	TipoReset string `json:"tipo_reset"` // e.g. "PERFILES", "FULL", "CACHE"
	Motivo    string `json:"motivo"`
	Actor     string `json:"actor,omitempty"`
}

// ResetResponse contains the summary of the reset operation.
type ResetResponse struct {
	OK                 bool      `json:"ok"`
	TipoReset          string    `json:"tipo_reset"`
	Mensaje            string    `json:"mensaje"`
	RegistrosAfectados int64     `json:"registros_afectados"`
	RutaSnapshot       string    `json:"ruta_snapshot,omitempty"`
	Timestamp          time.Time `json:"timestamp"`
}

// ExportarPDFRequest defines payload to generate a PDF export.
type ExportarPDFRequest struct {
	Modulo       string `json:"modulo"` // "candidatos" | "votantes" | "sistema"
	ReferenciaID int    `json:"referencia_id"`
	Titulo       string `json:"titulo"`
	Actor        string `json:"actor,omitempty"`
}

// ExportarPDFResponse returns metadata for the exported document.
type ExportarPDFResponse struct {
	OK          bool      `json:"ok"`
	ExportID    int64     `json:"export_id"`
	Formato     string    `json:"formato"`
	Titulo      string    `json:"titulo"`
	RutaOURL    string    `json:"ruta_o_url"`
	TamanoBytes int       `json:"tamano_bytes,omitempty"`
	Mensaje     string    `json:"mensaje"`
	GeneratedAt time.Time `json:"generated_at"`
}

// AuditoriaResetItem representa un registro en la tabla sistema_resets.
type AuditoriaResetItem struct {
	ID              int64     `json:"id"`
	TipoReset       string    `json:"tipo_reset"`
	Motivo          string    `json:"motivo"`
	UsuarioOSesion  string    `json:"usuario_o_sesion"`
	RealizadoEn     time.Time `json:"realizado_en"`
}

// AuditoriaExportItem representa un registro en la tabla sistema_exportaciones.
type AuditoriaExportItem struct {
	ID            int64     `json:"id"`
	Formato       string    `json:"formato"`
	ModuloOrigen  string    `json:"modulo_origen"`
	ReferenciaID  int       `json:"referencia_id"`
	Titulo        string    `json:"titulo"`
	RutaArchivo   string    `json:"ruta_archivo"`
	CreatedAt     time.Time `json:"created_at"`
}

// AuditoriaResponse resume la actividad auditada en la base de datos.
type AuditoriaResponse struct {
	OK                 bool                  `json:"ok"`
	TotalResets        int                   `json:"total_resets"`
	TotalExportaciones int                   `json:"total_exportaciones"`
	Resets             []AuditoriaResetItem  `json:"resets"`
	Exportaciones      []AuditoriaExportItem `json:"exportaciones"`
	ConsultadoEn       time.Time             `json:"consultado_en"`
}

// ConflictoCampo describe un desacuerdo entre la versión base y la versión entrante de un dato.
type ConflictoCampo struct {
	Campo         string `json:"campo"`
	ValorBase     any    `json:"valor_base"`
	ValorEntrante any    `json:"valor_entrante"`
	ValorResuelto any    `json:"valor_resuelto"`
	ReglaAplicada string `json:"regla_aplicada"`
}

// SolicitudFusion define los parámetros requeridos para resolver una fusión entre dos versiones de datos.
type SolicitudFusion struct {
	EntidadID        string         `json:"entidad_id"`
	TipoEntidad      string         `json:"tipo_entidad"` // "candidato", "distrito", "perfil"
	Estrategia       string         `json:"estrategia"`   // "source_priority", "last_write_wins", "field_merge", "manual"
	RegistroBase     map[string]any `json:"registro_base"`
	RegistroEntrante map[string]any `json:"registro_entrante"`
	SeleccionManual  map[string]any `json:"seleccion_manual,omitempty"`
	Actor            string         `json:"actor,omitempty"`
}

// ResultadoFusion contiene el resultado consolidado tras aplicar el algoritmo de resolución de conflictos.
type ResultadoFusion struct {
	OK                  bool             `json:"ok"`
	Timestamp           time.Time        `json:"timestamp"`
	EntidadID           string           `json:"entidad_id"`
	TipoEntidad         string           `json:"tipo_entidad"`
	Estrategia          string           `json:"estrategia"`
	Estado              string           `json:"estado"`
	TotalConflictos     int              `json:"total_conflictos"`
	Conflictos          []ConflictoCampo `json:"conflictos"`
	RegistroConsolidado map[string]any   `json:"registro_consolidado"`
	Mensaje             string           `json:"mensaje"`
}

// StatusResponse returns health and counts of database tables.
type StatusResponse struct {
	Status          string `json:"status"`
	TotalCandidatos int    `json:"total_candidatos"`
	TotalEntidades  int    `json:"total_entidades"`
	TotalPerfiles   int    `json:"total_perfiles"`
	ModuloSistema   struct {
		ResetInfoApp             bool `json:"reset_info_app"`
		ExportarPDF              bool `json:"exportar_pdf"`
		AuditoriaBaseDatos       bool `json:"auditoria_base_datos"`
		ResolucionConflictosMerge bool `json:"resolucion_conflictos_merge"`
	} `json:"modulo_sistema"`
}
