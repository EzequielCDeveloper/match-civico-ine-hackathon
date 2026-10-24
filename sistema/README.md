# Módulo Sistema (`sistema`)

Este módulo implementa de forma aislada y desacoplada las 4 funcionalidades clave del sistema para el Hackathon INE:

1. **Reset de Información de la App (`reset.go`)**:
   - Permite restablecer los datos en caliente al dataset canónico unificado.
   - Genera una instantánea de respaldo en la carpeta permitida `sistema_resets/`.
   - Endpoint: `POST /api/v1/sistema/reset`

2. **Exportación de Reportes a PDF (`pdf.go`)**:
   - Generador nativo PDF-1.4 en Go sin dependencias pesadas.
   - Exporta el reporte institucional con métricas de candidaturas federales, promedios de participación y abstencionismo electoral (desglose general y juvenil 18 a 29 años), y muestra estatal.
   - Archiva copias en la carpeta permitida `sistema_exportaciones/`.
   - Endpoint: `GET /api/v1/sistema/reporte/pdf`

3. **Auditoría de Base de Datos (`audit.go`)**:
   - Bitácora de eventos y operaciones concurrentes sobre el almacenamiento de datos.
   - Métricas de éxito/falla, desglose por nivel y acción, y consulta con filtros y paginación.
   - Endpoint: `GET /api/v1/sistema/auditoria`

4. **Resolución de Conflictos de Fusión (`fusion.go`)**:
   - Detección de discrepancias entre registros de datos base y entrantes.
   - Estrategias de conciliación soportadas: `source_priority` (prioridad a datos oficiales del INE), `last_write_wins` (prevalece la última escritura), `field_merge` (combinación sin pérdida) y `manual`.
   - Endpoint: `POST /api/v1/sistema/fusion/resolver`

## Regla de Integración / Toggle de Módulo
- **Backend**: Para activar o desactivar este módulo, en `cmd/api/main.go` solo se comenta o descomenta la línea:
  ```go
  sistema.RegistrarRutas(mux, memStore)
  ```
- **Frontend**: Para activar o desactivar este módulo en el flujo, en `frontend/src/flow/steps.ts` solo se comenta o descomenta la línea:
  ```ts
  sistemaStep,
  ```
