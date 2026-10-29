# Auditoría Integral y Registro de Mejoras — Match Cívico INE 2024

Este documento recopila la auditoría arquitectónica, los vectores de fallo identificados entre ramas y la implementación completa de soluciones integradas en la plataforma.

---

## 1. Mapeo de Ramas y Diagnóstico Inicial

El monorepo cuenta con tres módulos principales asignados por desarrollador más la rama de auditoría y QA:
- **`main`**: Rama troncal institucional.
- **`feature/candidatos-luis`**: Filtrado y visualización de candidaturas, motor de similitud y boletas electorales.
- **`feature/votantes-ezequiel`**: Perfil demográfico del votante, cálculo de abstencionismo y participación INE 2024.
- **`feature/sistema-juan`**: Auditoría, exportación de resultados y herramientas operativas.
- **`qa/audit-aleksey`**: Pentesting y validación de endpoints.
- **`fix/auditoria-ezequiel`**: Rama de corrección integral donde se auditaron y subsanaron los vectores de fallo entre todos los módulos.

---

## 2. Vectores de Fallo Identificados y Resueltos

### Vector 1: Desconexión de Datos entre Votantes y Candidatos (Prioridades)
- **Problema**: En el perfil de votante (`votantes.perfil`), el usuario seleccionaba sus temas de interés, pero al avanzar al módulo de candidatos (`PrioridadesStep`), las prioridades iniciaban vacías en un estado local desconectado.
- **Solución (`65d0297`)**: Precarga reactiva de los ejes temáticos seleccionados en `votantes.perfil` validados contra el diccionario canónico `TEMA_LABEL`, limitados a las 3 prioridades principales.

### Vector 2: Secuencia Demográfica de Participación y Abstencionismo
- **Problema**: El cálculo de participación juvenil vs. general se ejecutaba sin haber capturado previamente el sexo biológico ni el distrito electoral del usuario, produciendo métricas basadas en valores nulos.
- **Solución (`08c7c7d`)**: Se incorporó `SexoStep` y se reposicionó `DistritoStep` dentro de la secuencia del votante previa a `ParticipacionStep`, garantizando que la consulta demográfica cuente con `entidad`, `distrito` y `sexo`.

### Vector 3: Envío de Valores Falsos y Duplicación de Perfiles en BD
- **Problema**: Al abrir la pantalla de participación, se ejecutaba un `POST /api/v1/votantes/perfil` enviando un payload con edad dummy (`20`), sexo vacío y distrito `1`. Si el usuario volvía atrás y reingresaba, se creaban registros duplicados en `votantes_perfiles`.
- **Solución (`a54c51c`)**: Se eliminaron los valores por defecto hardcodeados y se añadió un ref de control (`perfilEnviadoRef`) para garantizar idempotencia en la sesión del votante.

### Vector 4: Pérdida del Estado al Retroceder entre Boletas
- **Problema**: El flujo central (`FlowProvider`) solo conocía transiciones lineales globales. Al presionar "Atrás" dentro de las boletas de candidatos (Senado o Presidencia), el sistema regresaba la pantalla entera hacia atrás (`DistritoStep`), perdiendo todas las respuestas de boletas previas.
- **Solución (`1957e26`)**: Se diseñó el mecanismo `registerBackHandler` en el contexto `FlowContext`. Cuando `CandidatosSwipeStep` está en el bloque de Senado (1) o Presidencia (2), el evento de retroceso retrocede de bloque internamente (`retrocederBoleta`), desapilando los resultados acumulados sin destruir la sesión.

### Vector 5: Robustez en Consultas SQL de Candidaturas
- **Problema**: Si un candidato en SQLite carecía de extracto corto o contenía valores `NULL` en `escolaridad`, `partido_coalicion` o `trayectoria_politica`, el escaneo en Go (`sql.Scan`) fallaba con error HTTP 500 al no admitir conversión a string.
- **Solución (`15dd024`)**: Se aplicó `COALESCE` en la consulta SQL (`internal/candidatos/handler.go`) para usar el texto íntegro de la propuesta como respaldo ante extractos vacíos y cadenas vacías ante metadatos nulos. Se añadieron pruebas unitarias de regresión en `internal/candidatos/handler_test.go`.

### Vector 6: Descarga Real de PDF y Reemplazo del Reset Administrativo
- **Problema**: 
  1. El botón de exportar a PDF en la pantalla final realizaba una petición sin mecanismo de descarga/guardado en el dispositivo móvil ni web.
  2. El botón de "Reset de información" en la pantalla de cierre ejecutaba una acción administrativa destructiva (`DELETE FROM votantes_perfiles; DELETE FROM sistema_exportaciones;`), borrando la base de datos de administración en lugar de reiniciar el recorrido del ciudadano.
- **Solución (`10997bb`, `cafbd54`)**:
  - Se creó el helper multiplataforma `descargarPdf.ts`, utilizando `expo-file-system` y `expo-sharing` en iOS/Android nativo y descarga vía `Blob` en Web.
  - Se eliminó el reset de información de la app del flujo del votante y de la vista del sistema del usuario.
  - Se sustituyó por la acción ciudadana **"Volver a realizar match"**, que restablece el flujo a su estado inicial (`reiniciarFlujo`) manteniendo la base de datos íntegra.
  - El backend de generación PDF en Go fue enriquecido para admitir el desglose real de candidatos elegidos (Diputación, Senado y Presidencia) y el estado/distrito evaluado.

### Vector 7: Lista de Casillas Presionables para Ejes Prioritarios
- **Problema**: La selección de los 3 ejes prioritarios utilizaba una cuadrícula de chips compactos que no ofrecía formato de lista ni casillas claras de verificación.
- **Solución (`697ddc3`)**:
  - Se rediseñó [`PrioridadesStep.tsx`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/candidatos/steps/PrioridadesStep.tsx) en formato lista vertical dentro de un `ScrollView`.
  - Cada elemento cuenta con casilla de verificación accesible (`checkbox`), icono `✓`, título del eje temático e insignia indicadora de prioridad (`#1`, `#2`, `#3`).
  - Límite de 3 selecciones con indicador dinámico de selección.

### Vector 8: Temporizador de 10 Segundos Obligatorios por Propuesta
- **Problema**: El deslizamiento rápido permitía omitir la lectura de las propuestas de campaña, desvirtuando el propósito cívico del match.
- **Solución (`697ddc3`, `29350dd`)**:
  - Se implementó un temporizador de **10 segundos** en [`CandidatosSwipeStep.tsx`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/candidatos/steps/CandidatosSwipeStep.tsx) al desplegar cada tarjeta de propuesta.
  - En [`SwipeCuatro.tsx`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/components/ui/SwipeCuatro.tsx) se integró la propiedad `disabled`, bloqueando físicamente el arrastre en Web (Pointer Events) y en Móvil (`PanResponder`).
  - Los botones de decisión permanecen inhabilitados y con opacidad reducida mientras corre el contador.
  - Se incorporó un banner institucional que muestra los segundos restantes (`⏱️ Lee la propuesta: podrás responder en 10s`) y confirma la habilitación (`✓ Lectura completada. Ya puedes responder o deslizar`).

---

## 3. Resumen de Commits Realizados

| Hash | Mensaje Convencional |
| :--- | :--- |
| `65d0297` | `fix(candidatos): precargar prioridades con los ejes elegidos en votantes` |
| `08c7c7d` | `feat(votantes): capturar sexo y distrito antes del cálculo de participación` |
| `a54c51c` | `fix(votantes): no enviar valores por defecto ni duplicar perfiles al volver` |
| `1957e26` | `fix(flow): permitir que un paso intercepte "atrás" y no perder las boletas` |
| `15dd024` | `fix(candidatos): usar el texto original cuando falta el extracto corto` |
| `10997bb` | `fix(sistema): separar cierre de votante de herramientas admin e incluir resultado en PDF` |
| `cafbd54` | `feat(sistema): descargar PDF en dispositivo y reemplazar reset por volver a realizar match` |
| `697ddc3` | `feat(candidatos): lista de casillas para prioridades y temporizador de 8s en propuestas` |
| `29350dd` | `feat(candidatos): actualizar temporizador de lectura a 10 segundos por propuesta` |

---

## 4. Verificación y Calidad

- **Frontend (TypeScript)**: `cd frontend && npx tsc --noEmit` -> 0 errores.
- **Backend (Go)**: `cd backend && go test -count=1 ./...` -> 100% pasando (`internal/candidatos`, `internal/sistema`, `internal/votantes`).
