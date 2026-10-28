# Referencia de API REST — Match Cívico

Base URL por defecto: `http://localhost:8080` (en emulador Android: `http://10.0.2.2:8080`).

---

## 1. Convenciones Globales

### Formato de Respuesta
Todas las respuestas de éxito retornan código HTTP `200 OK` (o `201 Created`) con cabecera `Content-Type: application/json; charset=utf-8`.

En caso de error, la respuesta estandarizada tiene la siguiente estructura:
```json
{
  "ok": false,
  "error": "Descripción detallada del error"
}
```

---

## 2. Endpoints Base

### `GET /health`
Verifica la disponibilidad general del servicio.

**Respuesta (200 OK):**
```json
{
  "status": "ok",
  "app": "Match Civico API v1"
}
```

---

## 3. Módulo de Candidatos (Luis)

### `GET /api/v1/candidatos`
Lista y filtra candidaturas con soporte para paginación y búsqueda textual.

**Parámetros de consulta (Query Params):**
- `cargo` *(string, opcional)*: Filtro por cargo (e.g. `PRESIDENCIA`, `SENADURIA`, `DIPUTACION`).
- `entidad` *(string, opcional)*: Nombre de la entidad federativa (e.g. `NACIONAL`, `JALISCO`).
- `escolaridad` *(string, opcional)*: Nivel educativo (e.g. `Licenciatura`, `Maestría`, `Doctorado`).
- `tiene_titulo` *(boolean/int, opcional)*: `1` o `true` para candidaturas con título profesional concluido.
- `q` *(string, opcional)*: Búsqueda libre en nombre, partido o texto de propuestas.
- `limit` *(int, opcional, defecto: 50, máx: 500)*: Cantidad máxima de registros por página.
- `offset` *(int, opcional, defecto: 0)*: Desplazamiento para paginación.

**Ejemplo cURL:**
```bash
curl -s "http://localhost:8080/api/v1/candidatos?cargo=PRESIDENCIA&limit=2"
```

**Respuesta (200 OK):**
```json
{
  "total": 3,
  "items": [
    {
      "id_anonimo": 1,
      "nombre_candidato": "CLAUDIA SHEINBAUM PARDO",
      "partido_coalicion": "SIGAMOS HACIENDO HISTORIA",
      "cargo": "PRESIDENCIA DE LA REPÚBLICA",
      "entidad": "NACIONAL",
      "distrito_id": 0,
      "distrito_nombre": "",
      "distrito_federal": "NO APLICA",
      "circunscripcion": "NO APLICA",
      "municipio": "NO APLICA",
      "tipo_candidato": "PROPIETARIO",
      "estatus": "CANDIDATURA DEFINITIVA",
      "edad": 61,
      "sexo": "Mujer",
      "escolaridad": "Doctorado",
      "estatus_escolaridad": "Título",
      "tiene_titulo": true,
      "estudios": "Doctorado (Título)",
      "historia_profesional": "Licenciatura, Maestría y Doctorado en Ingeniería en Energía por la UNAM...",
      "trayectoria_politica": "Secretaria de Medio Ambiente del DF, Jefa Delegacional en Tlalpan, Jefa de Gobierno de la CDMX...",
      "motivo_cargo_publico": "Consolidar el proyecto de nación y la cuarta transformación...",
      "propuesta_1": "Presenté el pasado 1 de marzo nuestro Proyecto de Nación...",
      "propuesta_2": "Encabezaremos un gobierno honesto, sin influyentismo...",
      "propuesta_genero": "En el eje República de y para las mujeres...",
      "tiene_propuestas": true
    }
  ]
}
```

---

### `GET /api/v1/candidatos/boleta`
Devuelve una sola boleta para el match: propietarias con propuestas, etiquetas por texto y la similitud entre esas propuestas. No incluye correo, teléfono, redes ni página web.

**Parámetros:**
- `entidad` *(string)*: nombre del estado, con o sin acentos. No hace falta para `PRESIDENCIA`.
- `distrito` *(int)*: número de distrito federal. Solo se usa con `DIPUTACION_MR`.
- `cargo` *(string)*: `DIPUTACION_MR`, `SENADO_MR` o `PRESIDENCIA`.

```bash
curl -s "http://localhost:8080/api/v1/candidatos/boleta?entidad=Jalisco&distrito=10&cargo=DIPUTACION_MR"
```

La respuesta trae `cargo`, `candidatos` (nombre, partido, escolaridad, trayectoria, concreción y si la propuesta corresponde al cargo), `propuestas` (`id` como `1539-1`, texto corto y etiquetas), `similitud` y `sin_propuestas`.

---

### `GET /api/v1/candidatos/{id}`
Obtiene el detalle completo de una candidatura por su `id_anonimo`.

**Ejemplo cURL:**
```bash
curl -s http://localhost:8080/api/v1/candidatos/1
```

**Respuestas:**
- `200 OK`: Retorna el objeto `Candidato`.
- `404 Not Found`: `{"ok": false, "error": "Candidate not found"}`

---

## 4. Módulo de Votantes (Ezequiel)

### `GET /api/v1/votantes/entidades`
Retorna el concentrado censal de las 32 entidades con métricas de participación y abstencionismo general y juvenil.

**Ejemplo cURL:**
```bash
curl -s http://localhost:8080/api/v1/votantes/entidades
```

**Respuesta (200 OK):**
```json
{
  "total": 32,
  "items": [
    {
      "entidad_id": 1,
      "entidad": "AGUASCALIENTES",
      "total_distritos": 3,
      "lista_nominal": 1097171,
      "votos_totales": 626084,
      "participacion_general_pct": 57.06,
      "abstencionismo_general_pct": 42.94,
      "participacion_joven_pct": 47.30,
      "abstencionismo_joven_pct": 52.70,
      "brecha_abstencionismo_joven_vs_general_pts": 9.76
    }
  ]
}
```

---

### `GET /api/v1/votantes/entidades/{id}`
Retorna el resumen de una entidad federativa y el desglose de todos sus distritos electorales federales.

**Ejemplo cURL:**
```bash
curl -s http://localhost:8080/api/v1/votantes/entidades/1
```

**Respuesta (200 OK):**
```json
{
  "entidad": {
    "entidad_id": 1,
    "entidad": "AGUASCALIENTES",
    "total_distritos": 3,
    "participacion_general_pct": 57.06
  },
  "distritos": [
    {
      "id": 1,
      "distrito_id": 1,
      "distrito_nombre": "JESUS MARIA",
      "participacion_general_pct": 58.24,
      "participacion_joven_pct": 49.88
    }
  ]
}
```

---

### `POST /api/v1/votantes/perfil`
Registra el perfil del votante y calcula en tiempo real su grupo demográfico, participación esperada y mensaje cívico.

**Payload JSON:**
```json
{
  "nombre_alias": "Ezequiel",
  "edad": 22,
  "sexo": "Hombre",
  "entidad_id": 9,
  "distrito_id": 0,
  "escolaridad": "Licenciatura",
  "prioridad_tema": "Educación"
}
```

**Ejemplo cURL:**
```bash
curl -s -X POST http://localhost:8080/api/v1/votantes/perfil \
  -H "Content-Type: application/json" \
  -d '{"nombre_alias":"Ezequiel","edad":22,"sexo":"Hombre","entidad_id":9}'
```

**Respuesta (200 OK):**
```json
{
  "perfil_id": 1,
  "nombre_alias": "Ezequiel",
  "edad": 22,
  "es_joven": true,
  "entidad_id": 9,
  "entidad": "CIUDAD DE MEXICO",
  "distrito_id": 0,
  "participacion_esperada_pct": 55.40,
  "abstencionismo_esperado_pct": 44.60,
  "mensaje_participacion": "Como votante joven (18-29 años) en CIUDAD DE MEXICO, tu grupo demográfico tuvo una participación del 55.40% y un abstencionismo del 44.60% en las elecciones federales 2024."
}
```

---

## 5. Módulo de Sistema y Mantenimiento (Juan)

### `GET /api/v1/sistema/status`
Verifica el estado del motor SQLite y el total de registros en las tablas principales.

**Ejemplo cURL:**
```bash
curl -s http://localhost:8080/api/v1/sistema/status
```

**Respuesta (200 OK):**
```json
{
  "status": "online",
  "total_candidatos": 4584,
  "total_entidades": 32,
  "total_perfiles": 1
}
```

---

### `POST /api/v1/sistema/reset`
Ejecuta una limpieza controlada de información de perfiles o caché de la app, registrando el evento en la tabla de auditoría `sistema_resets`.

**Payload JSON:**
```json
{
  "tipo_reset": "PERFILES",
  "motivo": "Demostración de reinicio de estado para testing"
}
```

**Ejemplo cURL:**
```bash
curl -s -X POST http://localhost:8080/api/v1/sistema/reset \
  -H "Content-Type: application/json" \
  -d '{"tipo_reset":"PERFILES","motivo":"Prueba de reset"}'
```

**Respuesta (200 OK):**
```json
{
  "ok": true,
  "tipo_reset": "PERFILES",
  "mensaje": "Reset exitoso de tipo 'PERFILES'. 1 registros eliminados.",
  "registros_afectados": 1,
  "timestamp": "2026-10-18T19:35:05Z"
}
```

---

### `POST /api/v1/sistema/exportar-pdf`
Registra y genera el stub de descarga de reporte consolidado en PDF.

**Payload JSON:**
```json
{
  "modulo": "candidatos",
  "referencia_id": 1,
  "titulo": "Ficha Técnica Candidatura #1"
}
```

**Respuesta (200 OK):**
```json
{
  "ok": true,
  "export_id": 1,
  "formato": "PDF",
  "titulo": "Ficha Técnica Candidatura #1",
  "ruta_o_url": "/exports/candidatos_1.pdf",
  "mensaje": "Documento PDF generado y listo para descarga",
  "generated_at": "2026-10-18T19:35:05Z"
}
```

**Dónde se guardan los archivos:** el PDF se escribe en
`$SISTEMA_DATA_DIR/sistema_exportaciones/`. Si `SISTEMA_DATA_DIR` no está
definida se usa el directorio de trabajo del proceso; en pruebas se apunta a
un directorio temporal. Los snapshots de reset siguen la misma regla con
`sistema_resets/`.
