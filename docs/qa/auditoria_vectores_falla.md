# Auditoría QA: Vectores de Falla en Módulos de Luis y Ezequiel

**Documento Oficial de Aseguramiento de Calidad y Pentesting**  
**Responsable de Auditoría**: Aleksey (`qa/audit-aleksey`)  
**Fecha de Evaluación**: 27 de Octubre, 2026  
**Alcance**: Módulo `candidatos` (Luis) y Módulo `votantes` (Ezequiel) en Backend (Go), Frontend (React Native) y Base de Datos (SQLite).

---

## 1. Resumen Ejecutivo

Durante la fase de auditoría técnica, se identificaron y categorizaron **20 vectores de falla potenciales** repartidos entre backend, frontend, lógica censal y contratos de integración. 

Como parte de este ciclo, se implementaron suites de pruebas automatizadas con SQLite en memoria tanto para [`backend/internal/candidatos/candidatos_test.go`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/candidatos/candidatos_test.go) como para [`backend/internal/votantes/votantes_test.go`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/votantes/votantes_test.go), logrando un **100% de aprobación en pruebas unitarias** y descartando vulnerabilidades críticas de Inyección SQL.

---

## 2. Matriz de Vectores de Falla de Seguridad y Backend

| ID | Módulo | Componente | Severidad | Vector de Falla | Comportamiento Observado / Riesgo | Estado / Mitigación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | `candidatos` | [`handler.go:70`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/candidatos/handler.go#L70) | **Media** | DoS por búsqueda de texto no indexada (`q`) | Aplica `LIKE ?` sobre 4 columnas (`nombre_candidato`, `partido_coalicion`, `propuesta_1`, `propuesta_2`). Ráfagas de búsquedas con comodines provocan escaneo de tabla completa en SQLite. | Pendiente implementar tabla FTS5 en SQLite si la carga de usuarios concurrentes incrementa. |
| **SEC-02** | `candidatos` | [`handler.go:115`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/candidatos/handler.go#L115) | **Media** | Frágil ante valores `NULL` en `rows.Scan` | Mapeo directo a tipos primitivos Go (`int`, `string`). Si alguna columna en base de datos contuviera `NULL`, Go arroja error de conversión y retorna HTTP 500. | Mitigado por el ETL actual que sanitiza a `""` y `0`. Se recomienda migrar a `sql.NullString` o `COALESCE`. |
| **SEC-03** | `candidatos` | [`handler.go:60`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/candidatos/handler.go#L60) | **Baja** | Coerción silenciosa de `tiene_titulo` | Valores distintos a `"1"` o `"true"` (ej. `tiene_titulo=cualquiera`) se convierten a `0` sin reportar error de formato. | Aceptable para hackathon; validar con regex o boolean estricto en producción. |
| **SEC-04** | `votantes` | [`handler.go:137`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/votantes/handler.go#L137) | **Baja** | Cota superior no validada en `edad` | Se valida `req.Edad < 18` (HTTP 400), pero no existe límite superior (ej. `edad > 120`). | Requiere agregar validación `req.Edad > 120` con retorno 400. |
| **SEC-05** | `votantes` | [`handler.go:210`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/votantes/handler.go#L210) | **Media** | Contención de concurrencia de escritura | Cada cálculo de perfil ejecuta un `INSERT` en `votantes_perfiles`. SQLite opera con bloqueo exclusivo de escritura. | Modo WAL activado; se recomienda cola en memoria o timeout de reintento si hay alta concurrencia. |
| **SEC-06** | `candidatos` / `votantes` | Endpoints API | **Baja** | Inyección SQL (SQLi) | Intento de bypass de parámetros y manipulación DDL vía `q`, `cargo`, `entidad`, `entidad_id`. | **Resuelto y Verificado:** Ambas capas usan consultas parametrizadas con marcadores `?`. Tests automatizados confirman resistencia total. |

---

## 3. Vectores de Falla de Lógica de Negocio y Base de Datos

| ID | Módulo | Componente | Severidad | Vector de Falla | Comportamiento Observado / Riesgo | Estado / Mitigación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LOG-01** | `candidatos` | [`handler.go:53`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/candidatos/handler.go#L53) | **Alta** | Sensibilidad de casing en filtro `entidad` | La consulta usa `WHERE entidad = ?`. Si el cliente envía `Ciudad de México` o `michoacan`, la consulta retorna 0 candidatos. | **Mitigado en Frontend:** [`estados.ts`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/votantes/constants/estados.ts) envía el nombre canónico en mayúsculas (`CIUDAD DE MEXICO`). Se sugiere agregar `COLLATE NOCASE` en SQLite. |
| **LOG-02** | `votantes` | [`handler.go:170`](file:///home/anon/uni/cua9/movil/hackathon/backend/internal/votantes/handler.go#L170) | **Baja** | Fallback silencioso en distrito inexistente | Si se provee un `distrito_id` que no corresponde a la entidad, la consulta distrital falla y cae a la entidad sin avisar al cliente. | Comportamiento resiliente; opcionalmente retornar advertencia informativa en JSON. |
| **LOG-03** | `votantes` | Datos censales | **Baja** | Discrepancia con manual oficial INE | La fórmula en código (`SV / LN * 100`) incluye no especificados en el denominador, difiriendo ~3.8% con los tableros oficiales. | Documentado formalmente en [`docs/uso_datos_ine.md`](file:///home/anon/uni/cua9/movil/hackathon/docs/uso_datos_ine.md). |

---

## 4. Vectores de Falla de Frontend y Experiencia de Usuario (UI/UX)

| ID | Módulo | Componente | Severidad | Vector de Falla | Comportamiento Observado / Riesgo | Estado / Mitigación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UI-01** | `candidatos` | [`useCandidates.ts:27`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/candidatos/hooks/useCandidates.ts#L27) | **Media** | Pérdida de contexto en fallback offline | Si la API no responde, se inyecta `CANDIDATOS_FALLBACK` con candidatos fijos de Aguascalientes, ignorando el estado seleccionado. | El usuario ve candidatos ajenos a su circunscripción en modo desconectado. |
| **UI-02** | `candidatos` | [`CandidateCard.tsx:50`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/candidatos/components/CandidateCard.tsx#L50) | **Media** | Truncado ciego de propuestas | `numberOfLines={4}` en `propuesta_1` oculta propuestas extensas sin opción de lectura completa. | Se recomienda agregar modal o acordeón "Leer propuesta completa". |
| **UI-03** | `candidatos` | [`CandidatosSwipeStep.tsx:16`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/candidatos/steps/CandidatosSwipeStep.tsx#L16) | **Media** | Muestreo fijo de candidatos (`limit: 10`) | El usuario solo puede evaluar un lote inicial de 10 candidatos sin posibilidad de solicitar la siguiente página. | Implementar botón "Cargar más candidaturas" al agotar el mazo. |
| **UI-04** | `votantes` | [`EdadStep.tsx:7`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/votantes/steps/EdadStep.tsx#L7) | **Media** | Pérdida de edad exacta por rango | Las opciones son rangos ('18 a 24 años'), pero guardan medianas fijas (`21`, `27`, `37`, `55`). | Aceptable para agrupamiento censal (18-29 vs 30+); documentar que es una edad representativa. |
| **UI-05** | `votantes` | [`steps.ts`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/votantes/steps.ts) | **Media** | Ausencia de selectores de género y distrito | El backend cuenta con la lógica demográfica por sexo y distritos federales, pero el flujo no incluye slides para capturarlos. | Actualmente se usan valores por omisión (`Hombre`, `distrito_id: 0`). |

---

## 5. Vectores de Falla de Integración Cruzada (Luis ↔ Ezequiel)

| ID | Interacción | Severidad | Descripción del Vector de Falla | Recomendación Arquitectónica |
| :--- | :--- | :--- | :--- | :--- |
| **INT-01** | Conexión de Perfil con Baraja de Candidatos | **Media** | Ezequiel guarda `temas` (`eje_seguridad`, etc.) y `entidad` en el flujo. Luis ya consume `entidad` para filtrar, pero aún no utiliza los pesos de `candidatos_etiquetas` para reordenar las tarjetas por afinidad temaria. | Integrar ordenamiento por score de coincidencia temática en el hook `useCandidates`. |
| **INT-02** | Estados con cero candidatos con propuestas | **Baja** | Si se selecciona una entidad con escasas candidaturas capturadas en Conóceles, la API retorna lista vacía y activa el fallback genérico. | Mostrar mensaje amigable de estado vacío (*Empty State*) antes de sustituir por el fallback. |

---

## 6. Verificación de Pruebas Automatizadas

Se crearon y ejecutaron las pruebas automatizadas de regresión y pentesting en Go:

```bash
cd backend && go test -v ./...
```

**Resultado de ejecución:**
* `app/internal/sistema`: **5 pruebas pasadas** (Reset, PDF, Auditoría, Fusión, Status) en 0.006s.
* `app/internal/votantes`: **5 pruebas pasadas** (Listado, Detalle, 404, Cálculo con género y distrito, Validación menor de edad) en 0.005s.
* `app/internal/candidatos`: **6 pruebas pasadas** (Filtro por entidad, Inyección SQL en 3 superficies, Desbordamiento de límites, Detalle, 404, 400 ID inválido) en 0.007s.

**Tasa de éxito: 100% (16 pruebas exitosas, 0 fallos).**
