-- ==============================================================================
-- Schema DDL: Match Civico - Hackathon E-Voting & Civic Participation Platform
-- Design Rule: Tables are prefixed with their respective module name to prevent
-- naming collisions in concurrent multi-developer workflows (Package by Feature).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- MODULE 1: CANDIDATOS (Luis)
-- Responsibilities: Candidate filtering, candidate presentation, blind comparison.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidatos_candidatos (
    id_anonimo INTEGER PRIMARY KEY,
    nombre_candidato TEXT NOT NULL,
    partido_coalicion TEXT,
    cargo TEXT NOT NULL,
    entidad TEXT NOT NULL,
    distrito_id INTEGER DEFAULT 0,
    distrito_nombre TEXT,
    distrito_federal TEXT,
    circunscripcion TEXT,
    municipio TEXT,
    num_lista_o_formula TEXT,
    tipo_candidato TEXT,
    estatus TEXT,
    edad INTEGER DEFAULT 0,
    sexo TEXT,
    escolaridad TEXT,
    estatus_escolaridad TEXT,
    tiene_titulo INTEGER DEFAULT 0, -- 1 if status indicates completed degree/license, 0 otherwise
    estudios TEXT,                   -- General resume / education field
    cursos TEXT,
    historia_profesional TEXT,
    trayectoria_politica TEXT,
    motivo_cargo_publico TEXT,
    propuesta_1 TEXT,
    propuesta_2 TEXT,
    propuesta_genero TEXT,
    redes TEXT,
    pagina_web TEXT,
    correo_electronico TEXT,
    telefono TEXT,
    tiene_propuestas INTEGER DEFAULT 0,
    propuesta_1_corta TEXT,       -- filled by etiquetar.py: readable excerpt, not from the INE file
    propuesta_2_corta TEXT,
    propuesta_genero_corta TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidatos_entidad ON candidatos_candidatos(entidad);
CREATE INDEX IF NOT EXISTS idx_candidatos_cargo ON candidatos_candidatos(cargo);
CREATE INDEX IF NOT EXISTS idx_candidatos_distrito ON candidatos_candidatos(distrito_id);
CREATE INDEX IF NOT EXISTS idx_candidatos_titulo ON candidatos_candidatos(tiene_titulo);

-- Filled by backend/scripts/etiquetado/etiquetar.py (not by init_sqlite.py).
-- etiqueta: 'eje_<tema>', 'enfoque_<eje>.<opcion>', 'concrecion' or 'competencia_cargo'.
-- peso: 0..1. Enfoque weights are already multiplied by the probability of their eje.
CREATE TABLE IF NOT EXISTS candidatos_etiquetas (
    id_anonimo INTEGER NOT NULL,
    etiqueta TEXT NOT NULL,
    peso REAL NOT NULL,
    PRIMARY KEY (id_anonimo, etiqueta)
);

CREATE INDEX IF NOT EXISTS idx_candidatos_etiquetas_etiqueta ON candidatos_etiquetas(etiqueta);

-- One row per proposal text (1, 2, or 3 = propuesta_genero). Filled by etiquetar.py.
-- enfoque_genero.* is not multiplied by an eje. The other enfoques are.
CREATE TABLE IF NOT EXISTS candidatos_propuesta_etiquetas (
    id_anonimo INTEGER NOT NULL,
    propuesta INTEGER NOT NULL,
    etiqueta TEXT NOT NULL,
    peso REAL NOT NULL,
    PRIMARY KEY (id_anonimo, propuesta, etiqueta)
);

CREATE INDEX IF NOT EXISTS idx_propuesta_etiquetas_etiqueta
    ON candidatos_propuesta_etiquetas(etiqueta);

-- ------------------------------------------------------------------------------
-- MODULE 2: VOTANTES (Ezequiel)
-- Responsibilities: Voter user profile, participation statistics, profile matching.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votantes_entidades (
    entidad_id INTEGER PRIMARY KEY,
    entidad TEXT NOT NULL UNIQUE,
    total_distritos INTEGER DEFAULT 0,
    lista_nominal INTEGER DEFAULT 0,
    votos_totales INTEGER DEFAULT 0,
    no_votaron INTEGER DEFAULT 0,
    no_especificado INTEGER DEFAULT 0,
    participacion_general_pct REAL DEFAULT 0.0,
    abstencionismo_general_pct REAL DEFAULT 0.0,
    lista_nominal_joven_18_29 INTEGER DEFAULT 0,
    votos_joven_18_29 INTEGER DEFAULT 0,
    no_votaron_joven_18_29 INTEGER DEFAULT 0,
    no_especificado_joven_18_29 INTEGER DEFAULT 0,
    participacion_joven_pct REAL DEFAULT 0.0,
    abstencionismo_joven_pct REAL DEFAULT 0.0,
    brecha_abstencionismo_joven_vs_general_pts REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS votantes_distritos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entidad_id INTEGER NOT NULL,
    entidad TEXT NOT NULL,
    distrito_id INTEGER NOT NULL,
    distrito_nombre TEXT NOT NULL,
    lista_nominal INTEGER DEFAULT 0,
    votos_totales INTEGER DEFAULT 0,
    no_votaron INTEGER DEFAULT 0,
    no_especificado INTEGER DEFAULT 0,
    participacion_general_pct REAL DEFAULT 0.0,
    abstencionismo_general_pct REAL DEFAULT 0.0,
    lista_nominal_joven_18_29 INTEGER DEFAULT 0,
    votos_joven_18_29 INTEGER DEFAULT 0,
    no_votaron_joven_18_29 INTEGER DEFAULT 0,
    no_especificado_joven_18_29 INTEGER DEFAULT 0,
    participacion_joven_pct REAL DEFAULT 0.0,
    abstencionismo_joven_pct REAL DEFAULT 0.0,
    brecha_abstencionismo_joven_vs_general_pts REAL DEFAULT 0.0,
    desglose_sexo_joven_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_votantes_distritos_entidad ON votantes_distritos(entidad_id);
CREATE INDEX IF NOT EXISTS idx_votantes_distritos_distrito ON votantes_distritos(distrito_id);

CREATE TABLE IF NOT EXISTS votantes_perfiles (
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

-- ------------------------------------------------------------------------------
-- MODULE 3: SISTEMA (Juan)
-- Responsibilities: App state reset, PDF export generation, maintenance logs.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sistema_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_reset TEXT NOT NULL,       -- e.g. 'FULL', 'PERFILES', 'CACHE'
    motivo TEXT,
    usuario_o_sesion TEXT,
    realizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sistema_exportaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formato TEXT DEFAULT 'PDF',     -- 'PDF', 'CSV', 'JSON'
    modulo_origen TEXT NOT NULL,    -- 'candidatos' | 'votantes'
    referencia_id INTEGER,
    titulo TEXT,
    ruta_archivo TEXT,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
