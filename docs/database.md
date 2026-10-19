# Modelo de Base de Datos y Datos INE — Match Cívico

## 1. Justificación de SQLite en el Hackathon

Para este hackathon se seleccionó **SQLite 3** como motor de base de datos relacional por las siguientes ventajas técnicas:
1. **Zero-Configuration & Portabilidad**: No requiere levantar contenedores Docker, bases de datos remotas ni credenciales complejas. Cada desarrollador tiene la base de datos completa de inmediato al clonar o correr el script de siembra.
2. **Modo WAL (Write-Ahead Logging)**: Habilitado vía `PRAGMA journal_mode=WAL;`, permitiendo lecturas concurrentes ilimitadas mientras se procesan escrituras sin bloqueos.
3. **Driver en Go 100% Nativo**: Se utiliza `modernc.org/sqlite`, un driver compilado en Go puro sin requerir `CGO` ni dependencias cruzadas de GCC en Windows, macOS o Linux.

---

## 2. Convención de Prefijos por Módulo

Para evitar colisiones de nombrado entre los 3 desarrolladores, toda tabla lleva como prefijo el nombre de su módulo funcional:
- `candidatos_*`: Tablas correspondientes al módulo de Luis.
- `votantes_*`: Tablas correspondientes al módulo de Ezequiel.
- `sistema_*`: Tablas correspondientes al módulo de Juan.

---

## 3. Diccionario de Datos

### 3.1. Tabla: `candidatos_candidatos` (Módulo Luis)
Almacena las 4,584 candidaturas federales registradas ante el INE para el proceso electoral 2024.

| Columna | Tipo SQLite | Descripción |
| :--- | :--- | :--- |
| `id_anonimo` | `INTEGER PRIMARY KEY` | Identificador único del candidato. |
| `nombre_candidato` | `TEXT NOT NULL` | Nombre completo del candidato. |
| `partido_coalicion` | `TEXT` | Partido político o coalición postulante. |
| `cargo` | `TEXT NOT NULL` | Cargo al que aspira (Presidencia, Senaduría, Diputación). |
| `entidad` | `TEXT NOT NULL` | Entidad federativa correspondiente. |
| `distrito_id` | `INTEGER` | Número identificador del distrito electoral federal (0 si es nacional/estatal). |
| `distrito_nombre` | `TEXT` | Cabecera o nombre del distrito. |
| `distrito_federal` | `TEXT` | Denominación federal del distrito. |
| `circunscripcion` | `TEXT` | Circunscripción electoral. |
| `municipio` | `TEXT` | Municipio de la candidatura. |
| `num_lista_o_formula`| `TEXT` | Número de fórmula electoral. |
| `tipo_candidato` | `TEXT` | Propietario o Suplente. |
| `estatus` | `TEXT` | Estatus de la candidatura ante el INE. |
| `edad` | `INTEGER` | Edad en años cumplidos. |
| `sexo` | `TEXT` | Sexo (Hombre, Mujer, No binario). |
| `escolaridad` | `TEXT` | Grado máximo (Licenciatura, Maestría, Doctorado, etc.). |
| `estatus_escolaridad`| `TEXT` | Estatus (Título, Cédula profesional, Trunca, Cursando). |
| `tiene_titulo` | `INTEGER` | `1` si cuenta con título o cédula profesional; `0` en caso contrario. |
| `estudios` | `TEXT` | Resumen de grado y estatus académico. |
| `cursos` | `TEXT` | Cursos y diplomados registrados. |
| `historia_profesional`| `TEXT` | Trayectoria laboral en el sector público o privado. |
| `trayectoria_politica`| `TEXT` | Cargos de elección popular o partidistas previos. |
| `motivo_cargo_publico`| `TEXT` | Exposición de motivos por los cuales busca el cargo. |
| `propuesta_1` | `TEXT` | Primera propuesta principal de campaña. |
| `propuesta_2` | `TEXT` | Segunda propuesta principal de campaña. |
| `propuesta_genero` | `TEXT` | Propuesta específica en materia de igualdad sustantiva y género. |
| `redes` | `TEXT` | Enlaces a perfiles públicos de redes sociales. |
| `pagina_web` | `TEXT` | Sitio web de campaña oficial. |
| `correo_electronico` | `TEXT` | Correo de contacto del candidato. |
| `telefono` | `TEXT` | Teléfono público de contacto. |
| `tiene_propuestas` | `INTEGER` | `1` si el candidato capturó propuestas; `0` si dejó campos vacíos. |

**Índices**:
- `idx_candidatos_entidad` (`entidad`)
- `idx_candidatos_cargo` (`cargo`)
- `idx_candidatos_distrito` (`distrito_id`)
- `idx_candidatos_titulo` (`tiene_titulo`)

---

### 3.2. Tabla: `votantes_entidades` (Módulo Ezequiel)
Concentra las métricas de participación y abstencionismo general y juvenil de las 32 entidades federativas.

| Columna | Tipo SQLite | Descripción |
| :--- | :--- | :--- |
| `entidad_id` | `INTEGER PRIMARY KEY` | Código oficial INE del estado (1 a 32). |
| `entidad` | `TEXT NOT NULL UNIQUE` | Nombre de la entidad federativa. |
| `total_distritos` | `INTEGER` | Total de distritos federales que componen la entidad. |
| `lista_nominal` | `INTEGER` | Total de electores registrados en la Lista Nominal. |
| `votos_totales` | `INTEGER` | Total de sufragios emitidos en la elección federal. |
| `no_votaron` | `INTEGER` | Total de ciudadanos que no acudieron a las urnas. |
| `no_especificado` | `INTEGER` | Votos no clasificados. |
| `participacion_general_pct` | `REAL` | Porcentaje de participación ciudadana global. |
| `abstencionismo_general_pct`| `REAL` | Porcentaje de abstencionismo global. |
| `lista_nominal_joven_18_29` | `INTEGER` | Electores de 18 a 29 años registrados. |
| `votos_joven_18_29` | `INTEGER` | Votos emitidos por el segmento de 18 a 29 años. |
| `no_votaron_joven_18_29` | `INTEGER` | Jóvenes de 18 a 29 años que se abstuvieron de votar. |
| `no_especificado_joven_18_29`| `INTEGER` | Votos jóvenes no especificados. |
| `participacion_joven_pct` | `REAL` | Porcentaje de participación electoral juvenil. |
| `abstencionismo_joven_pct` | `REAL` | Porcentaje de abstencionismo electoral juvenil. |
| `brecha_abstencionismo_joven_vs_general_pts` | `REAL` | Diferencia en puntos porcentuales entre abstencionismo joven y general. |

---

### 3.3. Tabla: `votantes_distritos` (Módulo Ezequiel)
Desglose a nivel de los 300 distritos electorales federales del país.

| Columna | Tipo SQLite | Descripción |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador interno único. |
| `entidad_id` | `INTEGER NOT NULL` | Llave foránea lógica a `votantes_entidades`. |
| `entidad` | `TEXT NOT NULL` | Nombre de la entidad federativa. |
| `distrito_id` | `INTEGER NOT NULL` | Número del distrito federal dentro de la entidad. |
| `distrito_nombre` | `TEXT NOT NULL` | Nombre o cabecera distrital. |
| `lista_nominal` | `INTEGER` | Lista nominal del distrito. |
| `votos_totales` | `INTEGER` | Votos totales emitidos en el distrito. |
| `participacion_general_pct` | `REAL` | Porcentaje de participación general en el distrito. |
| `abstencionismo_general_pct`| `REAL` | Porcentaje de abstencionismo general en el distrito. |
| `participacion_joven_pct` | `REAL` | Participación de jóvenes de 18 a 29 años. |
| `abstencionismo_joven_pct` | `REAL` | Abstencionismo de jóvenes de 18 a 29 años. |
| `desglose_sexo_joven_json` | `TEXT` | JSON con participación de jóvenes desglosada por sexo (hombres, mujeres, no binario). |

---

### 3.4. Tabla: `votantes_perfiles` (Módulo Ezequiel)
Almacena las preferencias o consultas de perfil de votante para calcular su afinidad y estadísticas asociadas.

| Columna | Tipo SQLite | Descripción |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador del perfil generado. |
| `nombre_alias` | `TEXT` | Alias o apodo del usuario. |
| `edad` | `INTEGER NOT NULL` | Edad del elector (>= 18 años). |
| `sexo` | `TEXT` | Identidad de género/sexo reportado. |
| `entidad_id` | `INTEGER NOT NULL` | Estado de residencia. |
| `distrito_id` | `INTEGER DEFAULT 0` | Distrito opcional de residencia. |
| `escolaridad` | `TEXT` | Nivel de estudios reportado. |
| `prioridad_tema` | `TEXT` | Eje temático prioritario (Seguridad, Educación, Economía, etc.). |
| `datos_extra_json` | `TEXT` | Campos flexibles adicionales en formato JSON. |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Fecha de creación del perfil. |

---

### 3.5. Tabla: `sistema_resets` (Módulo Juan)
Historial y registro de auditoría de reinicios de aplicación o limpieza de datos.

| Columna | Tipo SQLite | Descripción |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador del evento de reset. |
| `tipo_reset` | `TEXT NOT NULL` | Tipo de reset ejecutado (`PERFILES`, `CACHE`, `FULL`). |
| `motivo` | `TEXT` | Justificación o motivo de la acción. |
| `usuario_o_sesion` | `TEXT` | Identificador de sesión o rol que solicitó el reset. |
| `realizado_en` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Marca temporal de ejecución. |

---

### 3.6. Tabla: `sistema_exportaciones` (Módulo Juan)
Registro de documentos y reportes exportados en formato PDF o datos crudos.

| Columna | Tipo SQLite | Descripción |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Identificador de la exportación. |
| `formato` | `TEXT DEFAULT 'PDF'` | Formato del archivo (`PDF`, `CSV`, `JSON`). |
| `modulo_origen` | `TEXT NOT NULL` | Módulo que originó el reporte (`candidatos` o `votantes`). |
| `referencia_id` | `INTEGER` | ID del registro exportado (e.g. ID del candidato). |
| `titulo` | `TEXT` | Título del reporte exportado. |
| `ruta_archivo` | `TEXT` | Ruta de descarga o almacenamiento. |
| `metadata_json` | `TEXT` | Parámetros adicionales de la exportación. |
| `created_at` | `DATETIME DEFAULT CURRENT_TIMESTAMP` | Fecha y hora de generación. |

---

## 4. Script de Inicialización y Resiembra

En caso de requerir reconstruir la base de datos desde los datos originales de INE:
```bash
python3 backend/scripts/init_sqlite.py
```
Este script:
1. Aplica el DDL desde [`db/schema.sql`](file:///home/anon/uni/cua9/movil/hackathon/db/schema.sql).
2. Procesa `backend/data/datos_unificados.json`.
3. Inserta masivamente los registros en transacciones preparadas.
4. Genera [`db/matchcivico.db`](file:///home/anon/uni/cua9/movil/hackathon/db/matchcivico.db) y sincroniza [`backend/data/matchcivico.db`](file:///home/anon/uni/cua9/movil/hackathon/backend/data/matchcivico.db).
